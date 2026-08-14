import { notFound } from "../lib/errors.js";
import { endOfDay, startOfDay } from "../lib/date.js";
import prisma from "../config/prisma.js";

const PAGE_SIZE = 10;

// Suma los movimientos activos de una cuenta restando los egresos. Acepta un
// rango opcional para el balance del periodo filtrado
const calculateBalance = async (cuentaId, rango) => {
	const grupos = await prisma.movimientos.groupBy({
		by: ["tipo"],
		_sum: { monto: true },
		where: {
			cuentaId,
			estado: "activo",
			...(rango ? { createdAt: { gte: rango.desde, lte: rango.hasta } } : {}),
		},
	});

	return grupos.reduce(
		(total, grupo) =>
			total +
			(grupo.tipo === "ingreso" ? 1 : -1) * (grupo._sum.monto ?? 0),
		0,
	);
};

const buildPagination = (count, page) => {
	const totalPages = Math.ceil(count / PAGE_SIZE);
	return {
		currentPage: page,
		totalPages,
		totalItems: count,
		itemsPerPage: PAGE_SIZE,
		hasNextPage: page < totalPages,
		hasPrevPage: page > 1,
	};
};

const getMovimientosByDateRange = async (req, res, next) => {
	try {
		const { fechaInicio, fechaFin, cuentaId, tipo, page } = req.query;
		const currentPage = page;
		const skip = (currentPage - 1) * PAGE_SIZE;

		// El rango se interpreta en la zona de la aplicación y con el día final
		// completo: new Date("2025-12-31") es medianoche UTC y dejaría fuera
		// todos los movimientos de ese día
		const desde = startOfDay(fechaInicio);
		const hasta = endOfDay(fechaFin);

		const where = {
			createdAt: { gte: desde, lte: hasta },
			estado: "activo",
		};

		if (tipo && ["ingreso", "egreso"].includes(tipo)) {
			where.tipo = tipo;
		}

		if (cuentaId) {
			const cuentaExiste = await prisma.cuentas.findFirst({
				where: {
					id: Number(cuentaId),
					usuarioId: req.userId,
					estado: "activo",
				},
			});

			if (!cuentaExiste) {
				return next(
					notFound("Cuenta no encontrada o no pertenece al usuario"),
				);
			}

			where.cuentaId = Number(cuentaId);
		} else {
			// Sin cuenta específica hay que filtrar por la cuenta para no
			// devolver movimientos de otro usuario
			where.cuentas = { usuarioId: req.userId, estado: "activo" };
		}

		const [count, movimientos] = await prisma.$transaction([
			prisma.movimientos.count({ where }),
			prisma.movimientos.findMany({
				where,
				select: {
					id: true,
					tipo: true,
					monto: true,
					descripcion: true,
					createdAt: true,
					cuentaId: true,
					...(cuentaId
						? {}
						: {
								cuentas: {
									select: { id: true, nombre: true, tipo: true },
								},
							}),
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: PAGE_SIZE,
				skip,
			}),
		]);

		const response = {
			movimientos: movimientos.map(({ cuentas, ...movimiento }) =>
				cuentas ? { ...movimiento, cuenta: cuentas } : movimiento,
			),
			paginacion: buildPagination(count, currentPage),
			// El eco de los filtros va siempre como texto: zod ya coaccionó
			// cuentaId a número y aquí cambiaría el tipo de la respuesta
			filtros: {
				fechaInicio,
				fechaFin,
				cuentaId: cuentaId ? String(cuentaId) : "todas",
				tipo: tipo || "todos",
			},
		};

		if (cuentaId) {
			const cuenta = await prisma.cuentas.findFirst({
				where: { id: Number(cuentaId), usuarioId: req.userId, estado: "activo" },
				select: { id: true, nombre: true, tipo: true },
			});

			if (cuenta) {
				response.cuenta = {
					...cuenta,
					balance: await calculateBalance(Number(cuentaId), {
						desde,
						hasta,
					}), // Balance del período filtrado
				};
			}
		}

		res.status(200).json(response);
	} catch (error) {
		next(error);
	}
};

const getMovimientos = async (req, res, next) => {
	const { cuentaId } = req.params;
	const currentPage = req.query.page;
	const skip = (currentPage - 1) * PAGE_SIZE;

	try {
		const cuenta = await prisma.cuentas.findFirst({
			where: { id: Number(cuentaId), usuarioId: req.userId, estado: "activo" },
		});
		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
		}

		const where = { cuentaId: cuenta.id, estado: "activo" };

		const [balance, count, movimientos] = await Promise.all([
			calculateBalance(cuenta.id),
			prisma.movimientos.count({ where }),
			prisma.movimientos.findMany({
				where,
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: PAGE_SIZE,
				skip,
			}),
		]);

		res.status(200).json({
			cuenta: {
				...cuenta,
				balance, // Calculado en el servidor, nunca almacenado
			},
			movimientos,
			paginacion: buildPagination(count, currentPage),
		});
	} catch (error) {
		next(error);
	}
};

const getMovimiento = async (req, res, next) => {
	const { id } = req.params;
	try {
		const movimiento = await prisma.movimientos.findFirst({
			where: {
				id: Number(id),
				estado: "activo",
				cuentas: { usuarioId: req.userId, estado: "activo" },
			},
			include: { cuentas: true },
		});

		if (!movimiento) {
			return next(notFound("Movimiento no encontrado"));
		}

		const { cuentas, ...resto } = movimiento;
		res.status(200).json({ movimiento: { ...resto, cuenta: cuentas } });
	} catch (error) {
		next(error);
	}
};

const createMovimiento = async (req, res, next) => {
	const { cuentaId } = req.params;
	const { tipo, monto, descripcion, createdAt } = req.body;
	try {
		const cuenta = await prisma.cuentas.findFirst({
			where: { id: Number(cuentaId), usuarioId: req.userId, estado: "activo" },
		});

		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
		}

		const nuevoMovimiento = await prisma.movimientos.create({
			data: {
				cuentaId: cuenta.id,
				tipo,
				monto,
				descripcion,
				createdAt: createdAt ? new Date(createdAt) : new Date(),
			},
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
		const movimiento = await prisma.movimientos.findFirst({
			where: {
				id: Number(id),
				estado: "activo",
				cuentas: { usuarioId: req.userId, estado: "activo" },
			},
		});
		if (!movimiento) {
			return next(notFound("Movimiento no encontrado"));
		}

		// Igual que en las cuentas: el campo ausente se conserva, el campo
		// vacío se borra
		const actualizado = await prisma.movimientos.update({
			where: { id: movimiento.id },
			data: {
				...(tipo !== undefined && { tipo }),
				...(monto !== undefined && { monto }),
				...(descripcion !== undefined && {
					descripcion: descripcion === "" ? null : descripcion,
				}),
				...(createdAt !== undefined && { createdAt: new Date(createdAt) }),
			},
		});

		res.status(200).json(actualizado);
	} catch (error) {
		next(error);
	}
};

const deleteMovimiento = async (req, res, next) => {
	const { id } = req.params;
	try {
		const movimiento = await prisma.movimientos.findFirst({
			where: {
				id: Number(id),
				estado: "activo",
				cuentas: { usuarioId: req.userId, estado: "activo" },
			},
		});
		if (!movimiento) {
			return next(notFound("Movimiento no encontrado"));
		}

		const eliminado = await prisma.movimientos.update({
			where: { id: movimiento.id },
			data: { estado: "inactivo" },
		});

		res.status(200).json(eliminado);
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
