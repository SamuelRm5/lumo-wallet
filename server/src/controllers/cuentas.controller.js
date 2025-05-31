import loadModels from "../database/models/index.js";

const { Cuentas, sequelize } = await loadModels();
const { literal } = sequelize;

const getAllCuentas = async (req, res) => {
	try {
		const cuentas = await Cuentas.findAll({
			where: { estado: "activo" },
			order: [["createdAt", "DESC"]],
			attributes: {
				include: [
					[
						literal(`(
							SELECT 
								COALESCE(SUM(
									CASE 
										WHEN tipo = 'ingreso' THEN monto 
										WHEN tipo = 'egreso' THEN -monto 
										ELSE 0 
									END
								), 0)
							FROM \`movimientos\` 
							WHERE 
								\`movimientos\`.\`cuentaId\` = \`cuenta\`.\`id\`
								AND \`movimientos\`.\`estado\` = 'activo'
						)`),
						"total",
					],
				],
			},
		});

		res.status(200).json(cuentas);
	} catch (error) {
		res.status(500).json({
			error: "Error al obtener las cuentas",
		});
	}
};

const getCuentaById = async (req, res) => {
	const { id } = req.params;
	try {
		const cuenta = await Cuentas.findOne({
			where: { id },
			attributes: {
				include: [
					[
						literal(`(
							SELECT 
								COALESCE(SUM(
									CASE 
										WHEN tipo = 'ingreso' THEN monto 
										WHEN tipo = 'egreso' THEN -monto 
										ELSE 0 
									END
								), 0)
							FROM \`movimientos\`
							WHERE \`movimientos\`.\`cuentaId\` = \`cuenta\`.\`id\`
							AND \`movimientos\`.\`estado\` = 'activo'
						)`),
						"total",
					],
				],
			},
		});

		if (!cuenta) {
			return res.status(404).json({ message: "Cuenta no encontrada" });
		}

		res.status(200).json(cuenta);
	} catch (error) {
		res.status(500).json({ error: "Error al obtener la cuenta" });
	}
};

const getCuentasByTipo = async (req, res) => {
	const { tipo } = req.params;
	try {
		const cuentas = await Cuentas.findAll({
			where: { tipo, estado: "activo" },
			order: [["createdAt", "DESC"]],
			attributes: {
				include: [
					[
						literal(`(
							SELECT 
								COALESCE(SUM(
									CASE 
										WHEN tipo = 'ingreso' THEN monto 
										WHEN tipo = 'egreso' THEN -monto 
										ELSE 0 
									END
								), 0)
							FROM \`movimientos\`
							WHERE \`movimientos\`.\`cuentaId\` = \`cuenta\`.\`id\`
							AND \`movimientos\`.\`estado\` = 'activo'
						)`),
						"total",
					],
				],
			},
		});

		res.status(200).json(cuentas);
	} catch (error) {
		res.status(500).json({
			error: "Error al obtener las cuentas por tipo",
		});
	}
};

const createCuenta = async (req, res) => {
	const { nombre, descripcion, tipo } = req.body;
	try {
		const nuevaCuenta = await Cuentas.create({
			nombre,
			descripcion,
			tipo,
			estado: "activo",
		});
		res.status(201).json(nuevaCuenta);
	} catch (error) {
		res.status(500).json({ message: "Error al crear la cuenta", error });
	}
};

const updateCuenta = async (req, res) => {
	const { id } = req.params;
	const { nombre, descripcion, tipo } = req.body;
	try {
		const cuenta = await Cuentas.findByPk(id);
		if (!cuenta) {
			return res.status(404).json({ message: "Cuenta no encontrada" });
		}
		cuenta.nombre = nombre || cuenta.nombre;
		cuenta.descripcion = descripcion || cuenta.descripcion;
		cuenta.tipo = tipo || cuenta.tipo;
		await cuenta.save();
		res.status(200).json(cuenta);
	} catch (error) {
		res.status(500).json({
			message: "Error al actualizar la cuenta",
			error,
		});
	}
};

const deleteCuenta = async (req, res) => {
	const { id } = req.params;
	try {
		const cuenta = await Cuentas.findByPk(id);
		if (!cuenta) {
			return res.status(404).json({ message: "Cuenta no encontrada" });
		}
		cuenta.estado = "inactivo";
		await cuenta.save();
		res.status(200).json({ message: "Cuenta eliminada correctamente" });
	} catch (error) {
		res.status(500).json({ message: "Error al eliminar la cuenta", error });
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
