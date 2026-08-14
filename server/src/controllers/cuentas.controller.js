import loadModels from "../database/models/index.js";
import { notFound } from "../lib/errors.js";

const { Cuentas, Movimientos, sequelize } = await loadModels();
const { fn, literal } = sequelize;

const getAllCuentas = async (req, res, next) => {
	try {
		// JOIN + GROUP BY en lugar de una consulta de saldo por cuenta
		const cuentas = await Cuentas.findAll({
			where: {
				estado: "activo",
				usuarioId: req.userId,
			},
			include: [
				{
					model: Movimientos,
					as: "movimientos",
					where: { estado: "activo" },
					required: false, // LEFT JOIN - incluye cuentas sin movimientos
					attributes: [], // No trae datos, solo participa en el cálculo
				},
			],
			attributes: {
				include: [
					[
						fn(
							"COALESCE",
							fn(
								"SUM",
								literal(`CASE
									WHEN movimientos.tipo = 'ingreso' THEN movimientos.monto
									WHEN movimientos.tipo = 'egreso' THEN -movimientos.monto
									ELSE 0
								END`),
							),
							0,
						),
						"total",
					],
				],
			},
			group: ["cuenta.id"],
			order: [["createdAt", "DESC"]],
		});

		res.status(200).json(cuentas);
	} catch (error) {
		next(error);
	}
};

const getCuentaById = async (req, res, next) => {
	const { id } = req.params;
	try {
		const cuenta = await Cuentas.findOne({
			where: {
				id,
				usuarioId: req.userId,
				estado: "activo",
			},
			include: [
				{
					model: Movimientos,
					as: "movimientos",
					where: { estado: "activo" },
					required: false, // LEFT JOIN
					attributes: [],
				},
			],
			attributes: {
				include: [
					[
						fn(
							"COALESCE",
							fn(
								"SUM",
								literal(`CASE
									WHEN movimientos.tipo = 'ingreso' THEN movimientos.monto
									WHEN movimientos.tipo = 'egreso' THEN -movimientos.monto
									ELSE 0
								END`),
							),
							0,
						),
						"total",
					],
				],
			},
			group: ["cuenta.id"],
		});

		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
		}

		res.status(200).json(cuenta);
	} catch (error) {
		next(error);
	}
};

const getCuentasByTipo = async (req, res, next) => {
	const { tipo } = req.params;
	try {
		const cuentas = await Cuentas.findAll({
			where: {
				tipo,
				estado: "activo",
				usuarioId: req.userId,
			},
			include: [
				{
					model: Movimientos,
					as: "movimientos",
					where: { estado: "activo" },
					required: false, // LEFT JOIN
					attributes: [],
				},
			],
			attributes: {
				include: [
					[
						fn(
							"COALESCE",
							fn(
								"SUM",
								literal(`CASE
									WHEN movimientos.tipo = 'ingreso' THEN movimientos.monto
									WHEN movimientos.tipo = 'egreso' THEN -movimientos.monto
									ELSE 0
								END`),
							),
							0,
						),
						"total",
					],
				],
			},
			group: ["cuenta.id"],
			order: [["createdAt", "DESC"]],
		});

		res.status(200).json(cuentas);
	} catch (error) {
		next(error);
	}
};

const createCuenta = async (req, res, next) => {
	const { nombre, descripcion, tipo } = req.body;
	try {
		const nuevaCuenta = await Cuentas.create({
			nombre,
			descripcion,
			tipo,
			estado: "activo",
			usuarioId: req.userId,
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
		const cuenta = await Cuentas.findOne({
			where: { id, usuarioId: req.userId },
		});
		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
		}
		cuenta.nombre = nombre || cuenta.nombre;
		cuenta.descripcion = descripcion || cuenta.descripcion;
		cuenta.tipo = tipo || cuenta.tipo;
		await cuenta.save();
		res.status(200).json(cuenta);
	} catch (error) {
		next(error);
	}
};

const deleteCuenta = async (req, res, next) => {
	const { id } = req.params;
	try {
		const cuenta = await Cuentas.findOne({
			where: { id, usuarioId: req.userId },
		});
		if (!cuenta) {
			return next(notFound("Cuenta no encontrada"));
		}
		cuenta.estado = "inactivo";
		await cuenta.save();
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
