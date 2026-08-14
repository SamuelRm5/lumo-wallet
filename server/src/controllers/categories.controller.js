import prisma from "../config/prisma.js";
import { conflict, notFound } from "../lib/errors.js";
import { serialize } from "../lib/serialize.js";

const findOwned = async (userId, id) => {
	const category = await prisma.category.findFirst({ where: { id, userId } });
	if (!category) throw notFound("La categoría no existe o no es tuya");
	return category;
};

/**
 * MySQL no soporta índices únicos parciales, así que la unicidad de
 * (userId, kind, name) entre las no borradas se valida aquí.
 */
const assertNameFree = async (userId, kind, name, exceptId) => {
	const existing = await prisma.category.findFirst({
		where: { userId, kind, name, ...(exceptId && { id: { not: exceptId } }) },
	});

	if (existing) {
		throw conflict(`Ya tienes una categoría de ${kind} llamada ${name}`);
	}
};

const list = async (req, res, next) => {
	try {
		const data = await prisma.category.findMany({
			where: { userId: req.userId, ...(req.query.kind && { kind: req.query.kind }) },
			orderBy: [{ kind: "asc" }, { name: "asc" }],
		});
		res.status(200).json({ data: serialize(data) });
	} catch (error) {
		next(error);
	}
};

const create = async (req, res, next) => {
	const { name, icon, color, kind } = req.body;
	try {
		await assertNameFree(req.userId, kind, name);

		const category = await prisma.category.create({
			data: { userId: req.userId, name, icon: icon ?? null, color: color ?? null, kind },
		});

		res.status(201).json(serialize(category));
	} catch (error) {
		next(error);
	}
};

const update = async (req, res, next) => {
	const { name, icon, color } = req.body;
	try {
		const category = await findOwned(req.userId, req.params.id);

		if (name !== undefined && name !== category.name) {
			await assertNameFree(req.userId, category.kind, name, category.id);
		}

		const updated = await prisma.category.update({
			where: { id: category.id },
			data: {
				...(name !== undefined && { name }),
				...(icon !== undefined && { icon: icon === "" ? null : icon }),
				...(color !== undefined && { color: color === "" ? null : color }),
			},
		});

		res.status(200).json(serialize(updated));
	} catch (error) {
		next(error);
	}
};

// Borrado suave: las operaciones que la usaban la conservan y siguen
// apareciendo en los reportes históricos
const remove = async (req, res, next) => {
	try {
		const category = await findOwned(req.userId, req.params.id);

		await prisma.category.update({
			where: { id: category.id },
			data: { deletedAt: new Date() },
		});

		res.status(204).end();
	} catch (error) {
		next(error);
	}
};

export default { list, create, update, remove };
