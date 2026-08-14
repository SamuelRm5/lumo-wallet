import { PrismaClient } from "@prisma/client";
import env, { isProduction } from "./env.js";

const createClient = () =>
	new PrismaClient({
		log: env.LOG_LEVEL === "trace" ? ["query", "warn", "error"] : ["error"],
	});

// Una sola instancia en todo el proceso. En desarrollo se guarda en globalThis
// para que el reinicio de nodemon no deje conexiones abiertas detrás
const prisma = isProduction
	? createClient()
	: (globalThis.__prisma ??= createClient());

export default prisma;
