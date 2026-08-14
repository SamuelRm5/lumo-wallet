import { execFileSync } from "node:child_process";

const MYSQL = "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe";

// Se recrea la base de pruebas desde cero y se le aplican las migraciones. Así
// los tests corren contra el mismo esquema que produce prisma migrate deploy,
// no contra uno construido a mano
export default function setup() {
	const url = new URL(process.env.DATABASE_URL);
	const database = decodeURIComponent(url.pathname.slice(1));

	execFileSync(
		MYSQL,
		[
			`--host=${url.hostname}`,
			`--port=${url.port || "3306"}`,
			`--user=${decodeURIComponent(url.username)}`,
			"-e",
			`DROP DATABASE IF EXISTS \`${database}\`;
			 CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`,
		],
		{ env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) } },
	);

	execFileSync("npx", ["prisma", "migrate", "deploy"], {
		env: process.env,
		stdio: "ignore",
		shell: true,
	});
}
