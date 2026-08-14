import * as rules from "../services/recurring.service.js";
import { serialize } from "../lib/serialize.js";

const list = async (req, res, next) => {
	try {
		const data = await rules.listRules(req.userId);
		res.status(200).json({ data: serialize(data) });
	} catch (error) {
		next(error);
	}
};

const create = async (req, res, next) => {
	try {
		const rule = await rules.createRule(req.userId, req.body);
		res.status(201).json(serialize(rule));
	} catch (error) {
		next(error);
	}
};

const update = async (req, res, next) => {
	try {
		const rule = await rules.updateRule(req.userId, req.params.id, req.body);
		res.status(200).json(serialize(rule));
	} catch (error) {
		next(error);
	}
};

const remove = async (req, res, next) => {
	try {
		await rules.deleteRule(req.userId, req.params.id);
		res.status(204).end();
	} catch (error) {
		next(error);
	}
};

export default { list, create, update, remove };
