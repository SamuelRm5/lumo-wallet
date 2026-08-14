import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// La base de pruebas se deriva de DATABASE_URL cambiando el nombre: mismas
// credenciales, base aparte que se puede borrar y recrear sin miedo
const raw = readFileSync(".env", "utf8");
const url = new URL(
	(raw.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? "").trim().replace(/^["']|["']$/g, ""),
);
url.pathname = "/lumo_wallet_test";

const testEnv = {
	NODE_ENV: "test",
	LOG_LEVEL: "silent",
	JWT_SECRET: "test-secret-no-usar-en-produccion",
	DATABASE_URL: url.toString(),
	ALLOW_PUBLIC_REGISTRATION: "true",
	RATE_LIMIT_AUTH_MAX: "10000",
	// El job lo dispara cada test que lo necesite, no un temporizador
	RECURRING_JOB_ENABLED: "false",
	MIN_CLIENT_VERSION: "1.2.0",
};

// globalSetup corre en el proceso principal de Vitest, donde test.env todavía
// no se ha aplicado, así que las variables se ponen también aquí
Object.assign(process.env, testEnv);

export default defineConfig({
	test: {
		include: ["tests/**/*.test.js"],
		globalSetup: ["./tests/globalSetup.js"],
		setupFiles: ["./tests/setup.js"],
		fileParallelism: false,
		env: testEnv,
	},
});
