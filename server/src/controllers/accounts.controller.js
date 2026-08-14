import * as accounts from "../services/accounts.service.js";
import { summaryForUser } from "../services/balances.service.js";
import { serialize } from "../lib/serialize.js";
import env from "../config/env.js";

const list = async (req, res, next) => {
	try {
		const data = await accounts.listAccounts(req.userId, {
			type: req.query.type,
		});
		res.status(200).json({ data: serialize(data) });
	} catch (error) {
		next(error);
	}
};

const getById = async (req, res, next) => {
	try {
		const account = await accounts.getAccount(req.userId, req.params.id);
		res.status(200).json(serialize(account));
	} catch (error) {
		next(error);
	}
};

const create = async (req, res, next) => {
	try {
		const account = await accounts.createAccount(req.userId, req.body);
		res.status(201).json(serialize(account));
	} catch (error) {
		next(error);
	}
};

const update = async (req, res, next) => {
	try {
		const account = await accounts.updateAccount(
			req.userId,
			req.params.id,
			req.body,
		);
		res.status(200).json(serialize(account));
	} catch (error) {
		next(error);
	}
};

const remove = async (req, res, next) => {
	try {
		await accounts.deleteAccount(req.userId, req.params.id, {
			force: req.query.force,
		});
		res.status(204).end();
	} catch (error) {
		next(error);
	}
};

const reconcile = async (req, res, next) => {
	try {
		const result = await accounts.reconcileAccount(
			req.userId,
			req.params.id,
			req.body,
		);
		res.status(200).json(serialize(result));
	} catch (error) {
		next(error);
	}
};

// Una sola llamada para el dashboard, en vez de que el cliente agregue sobre
// la lista de cuentas
const summary = async (req, res, next) => {
	try {
		const data = await summaryForUser(req.userId);
		res.status(200).json(serialize({ currency: env.APP_CURRENCY, ...data }));
	} catch (error) {
		next(error);
	}
};

export default { list, getById, create, update, remove, reconcile, summary };
