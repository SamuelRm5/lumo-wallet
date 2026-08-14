import { notFound } from "../lib/errors.js";
import prisma from "../config/prisma.js";

/**
 * Suma los movimientos activos de las cuentas indicadas y devuelve un mapa
 * cuentaId -> saldo. Una sola consulta agrupada, no una por cuenta.
 * El saldo viaja como cadena porque es lo que devolvía el SUM anterior y el
 * cliente ya lo trata así.
 */
const calculateBalances = async cuentaIds => {
	if (cuentaIds.length === 0) return new Map();

	const grupos = await prisma.movimientos.groupBy({
		by: ["cuentaId", "tipo"],
		_sum: { monto: true },
		where: { cuentaId: { in: cuentaIds }, estado: "activo" },
	});

	const balances = new Map(cuentaIds.map(id => [id, 0]));
	for (const grupo of grupos) {
		const monto = grupo._sum.monto ?? 0;
		const signo = grupo.tipo === "ingreso" ? 1 : -1;
		balances.set(grupo.cuentaId, balances.get(grupo.cuentaId) + signo * monto);
	}

	return balances;
};

const withBalance = (cuenta, balances) => ({
	...cuenta,
	total: String(balances.get(cuenta.id) ?? 0),
});

const getAllCuentas = async (req, res, next) => {
	try {
		const cuentas = await prisma.cuentas.findMany({
			where: { estado: "activo", usuarioId: req.userId },
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		});

		const balances = await calculateBalances(cuentas.map(c => c.id));

		res.status(200).json(cuentas.map(c => withBalance(c, balances)));
	} catch (error) {
		next(error);
	}
};

const getCuentaById = async (req, res, next) => {
	const { id } = req.params;
	try {
		const cuenta = await prisma.cuentas.findFirst({
			where: {
				id: Number(id),
				usuarioId: req.userId,
				estado: "activo",
			},
		});

		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
		}

		const balances = await calculateBalances([cuenta.id]);

		res.status(200).json(withBalance(cuenta, balances));
	} catch (error) {
		next(error);
	}
};

const getCuentasByTipo = async (req, res, next) => {
	const { tipo } = req.params;
	try {
		const cuentas = await prisma.cuentas.findMany({
			where: { tipo, estado: "activo", usuarioId: req.userId },
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		});

		const balances = await calculateBalances(cuentas.map(c => c.id));

		res.status(200).json(cuentas.map(c => withBalance(c, balances)));
	} catch (error) {
		next(error);
	}
};

const createCuenta = async (req, res, next) => {
	const { nombre, descripcion, tipo } = req.body;
	try {
		const nuevaCuenta = await prisma.cuentas.create({
			data: {
				nombre,
				descripcion,
				tipo,
				estado: "activo",
				usuarioId: req.userId,
				createdAt: new Date(),
			},
		});
		res.status(201).json(nuevaCuenta);
	} catch (error) {
		next(error);
	}
};

const updateCuenta = async (req, res, next) => {
	const { id } = req.params;
	const { nombre, descripcion, tipo } = req.body;
	try {
		const cuenta = await prisma.cuentas.findFirst({
			where: { id: Number(id), usuarioId: req.userId, estado: "activo" },
		});
		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
		}

		// Se distingue el campo ausente del campo vacío: enviar una descripción
		// vacía debe borrarla, no conservar la anterior
		const actualizada = await prisma.cuentas.update({
			where: { id: cuenta.id },
			data: {
				...(nombre !== undefined && { nombre }),
				...(descripcion !== undefined && {
					descripcion: descripcion === "" ? null : descripcion,
				}),
				...(tipo !== undefined && { tipo }),
			},
		});

		res.status(200).json(actualizada);
	} catch (error) {
		next(error);
	}
};

const deleteCuenta = async (req, res, next) => {
	const { id } = req.params;
	try {
		const cuenta = await prisma.cuentas.findFirst({
			where: { id: Number(id), usuarioId: req.userId, estado: "activo" },
		});
		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
		}

		await prisma.cuentas.update({
			where: { id: cuenta.id },
			data: { estado: "inactivo" },
		});

		res.status(200).json({ message: "Cuenta eliminada correctamente" });
	} catch (error) {
		next(error);
	}
};

export default {
	getAllCuentas,
	getCuentaById,
	getCuentasByTipo,
	createCuenta,
	updateCuenta,
	deleteCuenta,
};
