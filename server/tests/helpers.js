import { prismaIncludingDeleted as prisma } from "../src/config/prisma.js";

let counter = 0;

export const createUser = async (name = "Prueba") => {
	counter += 1;
	return prisma.user.create({
		data: {
			name,
			email: `usuario${counter}@lumo.test`,
			password: "hash-irrelevante-para-estos-tests",
		},
	});
};

export const createAccount = (userId, type, name = type) =>
	prisma.account.create({ data: { userId, name, type } });

/** Un usuario con una cuenta de cada tipo, que es el escenario más común */
export const createScenario = async () => {
	const user = await createUser();
	const [source, cash, receivable, liability] = await Promise.all([
		createAccount(user.id, "source", "Salario"),
		createAccount(user.id, "cash", "Bancolombia"),
		createAccount(user.id, "receivable", "Préstamo a Juan"),
		createAccount(user.id, "liability", "Tarjeta VISA"),
	]);

	return { user, source, cash, receivable, liability };
};

export const createCategory = (userId, kind, name = "Comida") =>
	prisma.category.create({ data: { userId, name, kind } });
