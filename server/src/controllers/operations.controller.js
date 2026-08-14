import * as operations from "../services/operations.service.js";
import { decodeCursor } from "../lib/cursor.js";
import { serialize } from "../lib/serialize.js";

const list = async (req, res, next) => {
	try {
		const { cursor, ...filters } = req.query;
		const result = await operations.listOperations(req.userId, {
			...filters,
			cursor: cursor ? decodeCursor(cursor) : null,
		});
		res.status(200).json(serialize(result));
	} catch (error) {
		next(error);
	}
};

const stats = async (req, res, next) => {
	try {
		const result = await operations.operationStats(req.userId, req.query);
		res.status(200).json(serialize(result));
	} catch (error) {
		next(error);
	}
};

const getById = async (req, res, next) => {
	try {
		const operation = await operations.getOperation(req.userId, req.params.id);
		res.status(200).json(serialize(operation));
	} catch (error) {
		next(error);
	}
};

const create = async (req, res, next) => {
	try {
		const idempotencyKey = req.get("Idempotency-Key") ?? null;

		if (idempotencyKey) {
			const previa = await operations.findByIdempotencyKey(
				req.userId,
				idempotencyKey,
			);
			// Un reintento devuelve 200 con la operación ya creada, no un 201
			// que haría pensar al cliente que registró una segunda
			if (previa) return res.status(200).json(serialize(previa));
		}

		const operation = await operations.createOperation(req.userId, {
			...req.body,
			idempotencyKey,
		});
		res.status(201).json(serialize(operation));
	} catch (error) {
		next(error);
	}
};

const update = async (req, res, next) => {
	try {
		const operation = await operations.updateOperation(
			req.userId,
			req.params.id,
			req.body,
		);
		res.status(200).json(serialize(operation));
	} catch (error) {
		next(error);
	}
};

const remove = async (req, res, next) => {
	try {
		await operations.deleteOperation(req.userId, req.params.id);
		res.status(204).end();
	} catch (error) {
		next(error);
	}
};

// Confirma una ocurrencia recurrente en modo recordatorio. El monto es
// editable: para eso el recordatorio deja la operación pendiente
const confirm = async (req, res, next) => {
	try {
		const operation = await operations.confirmOperation(
			req.userId,
			req.params.id,
			req.body.amount,
		);
		res.status(200).json(serialize(operation));
	} catch (error) {
		next(error);
	}
};

export default { list, stats, getById, create, update, remove, confirm };
