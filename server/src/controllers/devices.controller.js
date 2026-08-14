import * as push from "../services/push.service.js";
import { serialize } from "../lib/serialize.js";

const list = async (req, res, next) => {
	try {
		const data = await push.listDevices(req.userId);
		res.status(200).json({ data: serialize(data) });
	} catch (error) {
		next(error);
	}
};

const register = async (req, res, next) => {
	try {
		const device = await push.registerDevice(req.userId, req.body);
		res.status(201).json(serialize(device));
	} catch (error) {
		next(error);
	}
};

const remove = async (req, res, next) => {
	try {
		await push.removeDevice(req.userId, req.params.id);
		res.status(204).end();
	} catch (error) {
		next(error);
	}
};

export default { list, register, remove };
