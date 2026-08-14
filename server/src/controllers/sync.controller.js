import { changesSince } from "../services/sync.service.js";
import { serialize } from "../lib/serialize.js";

const get = async (req, res, next) => {
	try {
		const delta = await changesSince(req.userId, req.query.since);
		res.status(200).json(serialize(delta));
	} catch (error) {
		next(error);
	}
};

export default { get };
