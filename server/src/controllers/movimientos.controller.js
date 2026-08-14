import { Op } from "sequelize";
import loadModels from "../database/models/index.js";
import { notFound, validationError } from "../lib/errors.js";
import { endOfDay, startOfDay } from "../lib/date.js";

const { Movimientos, Cuentas, sequelize } = await loadModels();

const getMovimientosByDateRange = async (req, res, next) => {
	try {
		const { fechaInicio, fechaFin, cuentaId, tipo, page = 1 } = req.query;
		const limit = 10;
		const offset = (parseInt(page) - 1) * limit;

		if (!fechaInicio || !fechaFin) {
			return next(
				validationError("Parámetros requeridos: fechaInicio y fechaFin", [
					{
						path: "fechaInicio",
						message: "Formato esperado: 2025-01-01",
					},
					{ path: "fechaFin", message: "Formato esperado: 2025-12-31" },
				]),
			);
		}

		// El rango se interpreta en la zona de la aplicación y con el día final
		// completo: new Date("2025-12-31") es medianoche UTC y dejaría fuera
		// todos los movimientos de ese día
		const desde = startOfDay(fechaInicio);
		const hasta = endOfDay(fechaFin);

		if (!desde || !hasta) {
			return next(
				validationError("Las fechas deben tener formato ISO válido"),
			);
		}

		const whereConditions = {
			createdAt: {
				[Op.between]: [desde, hasta],
			},
			estado: "activo",
		};

		if (tipo && ["ingreso", "egreso"].includes(tipo)) {
			whereConditions.tipo = tipo;
		}

		if (cuentaId) {
			const cuentaExiste = await Cuentas.findOne({
				where: {
					id: cuentaId,
					usuarioId: req.userId,
					estado: "activo",
				},
			});

			if (!cuentaExiste) {
				return next(
					notFound("Cuenta no encontrada o no pertenece al usuario"),
				);
			}

			whereConditions.cuentaId = cuentaId;
		}

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

		// Sin cuenta específica hay que unir para no devolver movimientos de
		// otro usuario
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

		let balance = null;
		let cuenta = null;

		if (cuentaId) {
			cuenta = await Cuentas.findOne({
				where: { id: cuentaId, usuarioId: req.userId },
				attributes: ["id", "nombre", "tipo"],
			});

			const balanceQuery = await Movimientos.findAll({
				where: {
					cuentaId,
					estado: "activo",
					createdAt: {
						[Op.between]: [desde, hasta],
					},
				},
				attributes: [
					[
						sequelize.fn(
							"SUM",
							sequelize.literal(
								"CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END",
							),
						),
						"balance",
					],
				],
				raw: true,
			});

			balance = parseInt(balanceQuery[0]?.balance || 0);
		}

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

		if (cuentaId && cuenta) {
			response.cuenta = {
				...cuenta.toJSON(),
				balance, // Balance del período filtrado
			};
		}

		res.status(200).json(response);
	} catch (error) {
		next(error);
	}
};

const getMovimientos = async (req, res, next) => {
	const { cuentaId } = req.params;
	const { page = 1 } = req.query;
	const limit = 10;
	const offset = (parseInt(page) - 1) * limit;

	try {
		const cuenta = await Cuentas.findOne({
			where: { id: cuentaId, usuarioId: req.userId },
		});
		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
		}

		const balanceQuery = await Movimientos.findAll({
			where: { cuentaId, estado: "activo" },
			attributes: [
				[
					sequelize.fn(
						"SUM",
						sequelize.literal(
							"CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END",
						),
					),
					"balance",
				],
			],
			raw: true,
		});

		const balance = parseInt(balanceQuery[0]?.balance || 0);

		const { count, rows: movimientos } = await Movimientos.findAndCountAll({
			where: { cuentaId, estado: "activo" },
			order: [["createdAt", "DESC"]],
			limit,
			offset,
		});

		const totalPages = Math.ceil(count / limit);
		const currentPage = parseInt(page);

		res.status(200).json({
			cuenta: {
				...cuenta.toJSON(),
				balance, // Calculado en el servidor, nunca almacenado
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
		next(error);
	}
};

const getMovimiento = async (req, res, next) => {
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
			return next(notFound("Movimiento no encontrado"));
		}

		res.status(200).json({ movimiento });
	} catch (error) {
		next(error);
	}
};

const createMovimiento = async (req, res, next) => {
	const { cuentaId } = req.params;
	const { tipo, monto, descripcion, createdAt } = req.body;
	try {
		const cuenta = await Cuentas.findOne({
			where: { id: cuentaId, usuarioId: req.userId },
		});

		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
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
		next(error);
	}
};

const updateMovimiento = async (req, res, next) => {
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
			return next(notFound("Movimiento no encontrado"));
		}
		await movimiento.update({ tipo, monto, descripcion, createdAt });
		res.status(200).json(movimiento);
	} catch (error) {
		next(error);
	}
};

const deleteMovimiento = async (req, res, next) => {
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
			return next(notFound("Movimiento no encontrado"));
		}
		await movimiento.update({ estado: "inactivo" });
		res.status(200).json(movimiento);
	} catch (error) {
		next(error);
	}
};

export default {
	getMovimientos,
	getMovimiento,
	getMovimientosByDateRange,
	createMovimiento,
	updateMovimiento,
	deleteMovimiento,
};
