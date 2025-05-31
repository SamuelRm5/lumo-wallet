import loadModels from "../database/models/index.js";

const { Movimientos, Cuentas } = await loadModels();

const getMovimientos = async (req, res) => {
	const { cuentaId } = req.params;
	try {
		const cuenta = await Cuentas.findByPk(cuentaId);
		if (!cuenta) {
			return res.status(404).json({ error: "Cuenta no encontrada" });
		}

		const movimientos = await Movimientos.findAll({
			where: { cuentaId, estado: "activo" },
			order: [["createdAt", "DESC"]],
		});

		res.status(200).json({ cuenta, movimientos });
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
		const movimiento = await Movimientos.findByPk(id);

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
		const movimiento = await Movimientos.findByPk(id);
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
		const movimiento = await Movimientos.findByPk(id);
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
	createMovimiento,
	updateMovimiento,
	deleteMovimiento,
};
