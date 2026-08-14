import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Convierte el entero en forma de cadena para que el resto del código nunca
// tenga que hacer parseInt sobre process.env
const numeric = (defaultValue, { min } = {}) => {
	let schema = z.coerce.number().int();
	if (min !== undefined) schema = schema.min(min);
	return schema.default(defaultValue);
};

// El mismo mensaje sirve para la variable ausente y para la vacía: para quien
// lee el error son el mismo problema
const nonEmpty = message =>
	z
		.string({ required_error: message, invalid_type_error: message })
		.min(1, message);

const schema = z.object({
	PORT: numeric(3000, { min: 1 }),
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	LOG_LEVEL: z
		.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
		.default("info"),

	APP_TIMEZONE: nonEmpty("APP_TIMEZONE no puede estar vacía").default(
		"America/Bogota",
	),
	APP_CURRENCY: nonEmpty("APP_CURRENCY no puede estar vacía").default("COP"),

	JWT_SECRET: nonEmpty("JWT_SECRET es obligatoria y no puede estar vacía"),

	CORS_ORIGIN: nonEmpty("CORS_ORIGIN no puede estar vacía").default(
		"http://localhost:5173",
	),

	DB_NAME: nonEmpty("DB_NAME es obligatoria"),
	DB_USER: nonEmpty("DB_USER es obligatoria"),
	// La contraseña vacía es válida en instalaciones locales de MySQL
	DB_PASSWORD: z.string().default(""),
	DB_HOST: nonEmpty("DB_HOST es obligatoria"),
	DB_PORT: numeric(3306, { min: 1 }),
	DB_DIALECT: nonEmpty("DB_DIALECT es obligatoria").default("mysql"),
});

const result = schema.safeParse(process.env);

if (!result.success) {
	// Se falla al arrancar y no en la primera petición que use la variable
	const details = result.error.issues
		.map(issue => `  - ${issue.path.join(".")}: ${issue.message}`)
		.join("\n");

	console.error(`Configuración inválida. Revisa el archivo .env:\n${details}`);
	process.exit(1);
}

const env = Object.freeze(result.data);

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

export default env;
