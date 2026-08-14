import { prismaIncludingDeleted as prisma } from "../config/prisma.js";

const ACCOUNT_SHAPE = {
	id: true,
	name: true,
	description: true,
	type: true,
	currency: true,
	lastReconciledAt: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
};

const CATEGORY_SHAPE = {
	id: true,
	name: true,
	icon: true,
	color: true,
	kind: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
};

const OPERATION_SHAPE = {
	id: true,
	kind: true,
	amount: true,
	categoryId: true,
	date: true,
	description: true,
	status: true,
	origin: true,
	recurringRuleId: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
	entries: { select: { accountId: true, amount: true } },
};

// Los borrados viajan como identificador solo: el cliente ya tiene el resto y
// lo único que necesita saber es que debe quitarlo
const split = rows => ({
	updated: rows.filter(row => row.deletedAt === null),
	deleted: rows.filter(row => row.deletedAt !== null).map(row => row.id),
});

/**
 * Delta desde la última sincronización. Lee sin el filtro de borrado suave
 * porque su trabajo es justamente reportar lo borrado: si no lo hiciera, el
 * cliente seguiría mostrando cuentas y operaciones que ya no existen.
 *
 * El corte superior es la hora del servidor tomada antes de consultar, y es la
 * marca que el cliente guarda para la próxima llamada. Lo que se escriba durante
 * la consulta cae del lado siguiente en vez de perderse. El reloj del dispositivo
 * no interviene: puede estar desajustado.
 */
export const changesSince = async (userId, since) => {
	const serverTime = new Date();
	const window = { ...(since && { gt: since }), lte: serverTime };
	const where = { userId, updatedAt: window };

	const [accounts, categories, operations] = await Promise.all([
		prisma.account.findMany({
			where,
			select: ACCOUNT_SHAPE,
			orderBy: { updatedAt: "asc" },
		}),
		prisma.category.findMany({
			where,
			select: CATEGORY_SHAPE,
			orderBy: { updatedAt: "asc" },
		}),
		prisma.operation.findMany({
			where,
			select: OPERATION_SHAPE,
			orderBy: { updatedAt: "asc" },
		}),
	]);

	return {
		serverTime,
		since: since ?? null,
		accounts: split(accounts),
		categories: split(categories),
		operations: split(operations),
	};
};
