import { PrismaClient } from "@prisma/client";
import env, { isProduction } from "./env.js";

// Modelos con borrado suave. entries no está: no tiene borrado propio, sigue la
// vida de su operación
const SOFT_DELETE_MODELS = [
	"account",
	"category",
	"operation",
	"recurringRule",
];

const READ_OPERATIONS = [
	"findFirst",
	"findFirstOrThrow",
	"findMany",
	"findUnique",
	"findUniqueOrThrow",
	"count",
	"aggregate",
	"groupBy",
];

/**
 * Inyecta deletedAt: null en toda lectura de los modelos con borrado suave.
 * No se confía el filtro a la disciplina del programador: olvidarlo una vez
 * significa contar plata borrada dentro de un saldo.
 */
const softDelete = {
	name: "softDelete",
	query: Object.fromEntries(
		SOFT_DELETE_MODELS.map(model => [
			model,
			Object.fromEntries(
				READ_OPERATIONS.map(operation => [
					operation,
					({ args, query }) => {
						args.where = { ...args.where, deletedAt: null };
						return query(args);
					},
				]),
			),
		]),
	),
};

const createClient = () =>
	new PrismaClient({
		log: env.LOG_LEVEL === "trace" ? ["query", "warn", "error"] : ["error"],
	});

const base = isProduction
	? createClient()
	: (globalThis.__prisma ??= createClient());

const prisma = base.$extends(softDelete);

/**
 * Vista sin el filtro de borrado suave, sobre la misma conexión. Solo para los
 * dos casos que necesitan ver lo borrado: el histórico de una cuenta archivada
 * y GET /sync, que precisamente tiene que reportar los borrados al cliente.
 */
export const prismaIncludingDeleted = base;

export default prisma;
