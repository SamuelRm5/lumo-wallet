import { beforeEach, afterAll } from "vitest";
import { prismaIncludingDeleted as prisma } from "../src/config/prisma.js";

// Orden inverso al de las dependencias para no pelear con las claves foráneas
const TABLES = [
	"entries",
	"operations",
	"recurring_rules",
	"categories",
	"accounts",
	"refresh_tokens",
	"devices",
	"users",
];

beforeEach(async () => {
	await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
	for (const table of TABLES) {
		await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
	}
	await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
});

afterAll(async () => {
	await prisma.$disconnect();
});
