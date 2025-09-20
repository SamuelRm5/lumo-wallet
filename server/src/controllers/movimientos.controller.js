import { Op } from "sequelize";
import loadModels from "../database/models/index.js";

const { Movimientos, Cuentas, sequelize } = await loadModels();

// 📅 FUNCIÓN SIMPLIFICADA: Buscar movimientos por rango de fechas con paginación
const getMovimientosByDateRange = async (req, res) => {
	try {
		const { fechaInicio, fechaFin, cuentaId, tipo, page = 1 } = req.query;
		const limit = 10; // Máximo 10 movimientos por página
		const offset = (parseInt(page) - 1) * limit;

		// Validar parámetros requeridos
		if (!fechaInicio || !fechaFin) {
			return res.status(400).json({
				error: "Parámetros requeridos: fechaInicio y fechaFin",
				ejemplo: "?fechaInicio=2025-01-01&fechaFin=2025-12-31&page=1",
			});
		}

		// Construir condiciones de búsqueda
		const whereConditions = {
			createdAt: {
				[Op.between]: [new Date(fechaInicio), new Date(fechaFin)],
			},
			estado: "activo",
		};

		// Filtro opcional por tipo de movimiento
		if (tipo && ["ingreso", "egreso"].includes(tipo)) {
			whereConditions.tipo = tipo;
		}

		// 🔑 SOLUCIÓN: Si cuentaId está presente, agregar a whereConditions directamente
		if (cuentaId) {
			// Verificar que la cuenta pertenezca al usuario
			const cuentaExiste = await Cuentas.findOne({
				where: {
					id: cuentaId,
					usuarioId: req.userId,
					estado: "activo",
				},
			});

			if (!cuentaExiste) {
				return res.status(404).json({
					error: "Cuenta no encontrada o no pertenece al usuario",
				});
			}

			// Agregar filtro de cuenta directamente a movimientos
			whereConditions.cuentaId = cuentaId;
		}

		// 🚀 Query optimizada - CAMBIO: usar whereConditions unificadas
		let query = {
			where: whereConditions,
			attributes: [
				"id",
				"tipo",
				"monto",
				"descripcion",
				"createdAt",
				"cuentaId",
			],
			order: [["createdAt", "DESC"]],
			limit,
			offset,
		};

		// Si NO hay cuentaId específica, incluir información de cuentas del usuario
		if (!cuentaId) {
			query.include = [
				{
					model: Cuentas,
					as: "cuenta",
					where: {
						usuarioId: req.userId,
						estado: "activo",
					},
					attributes: ["id", "nombre", "tipo"],
				},
			];
		}

		const { count, rows: movimientos } = await Movimientos.findAndCountAll(
			query,
		);

		// 📊 Cálculo de balance si es una cuenta específica
		let balance = null;
		let cuenta = null;

		if (cuentaId) {
			// Obtener información de la cuenta
			cuenta = await Cuentas.findOne({
				where: { id: cuentaId, usuarioId: req.userId },
				attributes: ["id", "nombre", "tipo"],
			});

			// Calcular balance optimizado para esta cuenta
			const balanceQuery = await Movimientos.findAll({
				where: {
					cuentaId,
					estado: "activo",
					createdAt: {
						[Op.between]: [
							new Date(fechaInicio),
							new Date(fechaFin),
						],
					},
				},
				attributes: [
					[
						sequelize.fn(
							"SUM",
							sequelize.literal(
								'CASE WHEN tipo = "ingreso" THEN monto ELSE -monto END',
							),
						),
						"balance",
					],
				],
				raw: true,
			});

			balance = parseInt(balanceQuery[0]?.balance || 0);
		}

		// Información de paginación
		const totalPages = Math.ceil(count / limit);
		const currentPage = parseInt(page);

		const response = {
			movimientos,
			paginacion: {
				currentPage,
				totalPages,
				totalItems: count,
				itemsPerPage: limit,
				hasNextPage: currentPage < totalPages,
				hasPrevPage: currentPage > 1,
			},
			filtros: {
				fechaInicio,
				fechaFin,
				cuentaId: cuentaId || "todas",
				tipo: tipo || "todos",
			},
		};

		// Agregar cuenta y balance si es filtro por cuenta específica
		if (cuentaId && cuenta) {
			response.cuenta = {
				...cuenta.toJSON(),
				balance, // Balance del período filtrado
			};
		}

		res.status(200).json(response);
	} catch (error) {
		console.error("Error en getMovimientosByDateRange:", error);
		res.status(500).json({
			error: "Error al buscar movimientos por rango de fechas",
			detalle: error.message,
		});
	}
};

const getMovimientos = async (req, res) => {
	const { cuentaId } = req.params;
	const { page = 1 } = req.query;
	const limit = 10; // 10 movimientos por página
	const offset = (parseInt(page) - 1) * limit;

	try {
		const cuenta = await Cuentas.findOne({
			where: { id: cuentaId, usuarioId: req.userId },
		});
		if (!cuenta) {
			return res.status(404).json({ error: "Cuenta no encontrada" });
		}

		// � Cálculo optimizado del balance usando índices
		const balanceQuery = await Movimientos.findAll({
			where: { cuentaId, estado: "activo" },
			attributes: [
				[
					sequelize.fn(
						"SUM",
						sequelize.literal(
							'CASE WHEN tipo = "ingreso" THEN monto ELSE -monto END',
						),
					),
					"balance",
				],
			],
			raw: true,
		});

		const balance = parseInt(balanceQuery[0]?.balance || 0);

		// �📄 Buscar con paginación
		const { count, rows: movimientos } = await Movimientos.findAndCountAll({
			where: { cuentaId, estado: "activo" },
			order: [["createdAt", "DESC"]],
			limit,
			offset,
		});

		// Información de paginación
		const totalPages = Math.ceil(count / limit);
		const currentPage = parseInt(page);

		res.status(200).json({
			cuenta: {
				...cuenta.toJSON(),
				balance, // 🏷️ Balance calculado en backend
			},
			movimientos,
			paginacion: {
				currentPage,
				totalPages,
				totalItems: count,
				itemsPerPage: limit,
				hasNextPage: currentPage < totalPages,
				hasPrevPage: currentPage > 1,
			},
		});
	} catch (error) {
		res.status(500).json({
			error: "Error al obtener los movimientos de la cuenta",
			descripcion: error,
		});
	}
};

const getMovimiento = async (req, res) => {
	const { id } = req.params;
	try {
		const movimiento = await Movimientos.findOne({
			where: { id },
			include: [
				{
					model: Cuentas,
					as: "cuenta",
					where: { usuarioId: req.userId },
				},
			],
		});

		if (!movimiento) {
			return res.status(404).json({ error: "Movimiento no encontrado" });
		}

		res.status(200).json({ movimiento });
	} catch (error) {
		res.status(500).json({
			error: "Error al obtener los movimientos de la cuenta",
			descripcion: error,
		});
	}
};

const createMovimiento = async (req, res) => {
	const { cuentaId } = req.params;
	const { tipo, monto, descripcion, createdAt } = req.body;
	try {
		// Verificar que la cuenta pertenezca al usuario
		const cuenta = await Cuentas.findOne({
			where: { id: cuentaId, usuarioId: req.userId },
		});

		if (!cuenta) {
			return res.status(404).json({ error: "Cuenta no encontrada" });
		}

		const nuevoMovimiento = await Movimientos.create({
			cuentaId,
			tipo,
			monto,
			descripcion,
			createdAt,
		});
		res.status(201).json(nuevoMovimiento);
	} catch (error) {
		res.status(500).json({
			error: "Error al crear el movimiento",
			descripcion: error,
		});
	}
};

const updateMovimiento = async (req, res) => {
	const { id } = req.params;
	const { tipo, monto, descripcion, createdAt } = req.body;
	try {
		const movimiento = await Movimientos.findOne({
			where: { id },
			include: [
				{
					model: Cuentas,
					as: "cuenta",
					where: { usuarioId: req.userId },
				},
			],
		});
		if (!movimiento) {
			return res.status(404).json({ error: "Movimiento no encontrado" });
		}
		await movimiento.update({ tipo, monto, descripcion, createdAt });
		res.status(200).json(movimiento);
	} catch (error) {
		res.status(500).json({
			error: "Error al actualizar el movimiento",
			descripcion: error,
		});
	}
};

const deleteMovimiento = async (req, res) => {
	const { id } = req.params;
	try {
		const movimiento = await Movimientos.findOne({
			where: { id },
			include: [
				{
					model: Cuentas,
					as: "cuenta",
					where: { usuarioId: req.userId },
				},
			],
		});
		if (!movimiento) {
			return res.status(404).json({ error: "Movimiento no encontrado" });
		}
		await movimiento.update({ estado: "inactivo" });
		res.status(200).json(movimiento);
	} catch (error) {
		res.status(500).json({
			error: "Error al eliminar el movimiento",
			descripcion: error,
		});
	}
};

export default {
	getMovimientos,
	getMovimiento,
	getMovimientosByDateRange, // 📅 NUEVA función para rangos de fechas
	createMovimiento,
	updateMovimiento,
	deleteMovimiento,
};
