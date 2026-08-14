import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import { balanceForAccount, balancesForUser } from "./balances.service.js";
import { conflict, notFound, validationError } from "../lib/errors.js";
import { createOperationWith } from "./operations.service.js";
import { toNumber } from "../lib/serialize.js";

const zero = () => new Prisma.Decimal(0);

const present = (account, balance) => ({
	id: account.id,
	name: account.name,
	description: account.description,
	type: account.type,
	currency: account.currency,
	balance: toNumber(balance ?? zero()),
	lastReconciledAt: account.lastReconciledAt,
	createdAt: account.createdAt,
});

export const listAccounts = async (userId, { type } = {}) => {
	const [accounts, balances] = await Promise.all([
		prisma.account.findMany({
			where: { userId, ...(type ? { type } : {}) },
			orderBy: [{ type: "asc" }, { name: "asc" }],
		}),
		balancesForUser(userId),
	]);

	return accounts.map(account => present(account, balances.get(account.id)));
};

const findOwned = async (userId, id) => {
	const account = await prisma.account.findFirst({ where: { id, userId } });
	if (!account) throw notFound("La cuenta no existe o no es tuya");
	return account;
};

export const getAccount = async (userId, id) => {
	const account = await findOwned(userId, id);
	return present(account, await balanceForAccount(id));
};

export const createAccount = async (userId, input) => {
	const account = await prisma.account.create({
		data: {
			userId,
			name: input.name,
			description: input.description ?? null,
			type: input.type,
		},
	});

	return present(account, zero());
};

export const updateAccount = async (userId, id, input) => {
	await findOwned(userId, id);

	const account = await prisma.account.update({
		where: { id },
		data: {
			...(input.name !== undefined && { name: input.name }),
			...(input.description !== undefined && {
				description: input.description === "" ? null : input.description,
			}),
			...(input.type !== undefined && { type: input.type }),
		},
	});

	return present(account, await balanceForAccount(id));
};

/**
 * Borrar una cuenta con saldo distinto de cero produce un descuadre permanente
 * y hoy eso pasa en silencio. Se exige confirmación explícita.
 */
export const deleteAccount = async (userId, id, { force = false } = {}) => {
	await findOwned(userId, id);

	const balance = await balanceForAccount(id);

	if (!balance.isZero() && !force) {
		throw conflict(
			`La cuenta tiene un saldo de ${toNumber(balance)} y borrarla dejaría un descuadre permanente. Repite con force=true si es lo que quieres`,
		);
	}

	await prisma.account.update({
		where: { id },
		data: { deletedAt: new Date() },
	});
};

/**
 * Conciliación: el usuario informa cuánta plata hay de verdad y la diferencia
 * se registra como ajuste. Es el mecanismo de control central de la app, porque
 * la ecuación sola no detecta lo que nunca se registró.
 */
export const reconcileAccount = async (userId, id, input) => {
	const account = await findOwned(userId, id);

	if (account.type === "source") {
		throw validationError(
			"Una cuenta fuente no se concilia: no hay nada afuera contra qué compararla",
		);
	}

	const calculated = await balanceForAccount(id);
	const real = new Prisma.Decimal(input.realBalance);
	const difference = real.minus(calculated);
	const date = input.date ? new Date(input.date) : new Date();

	return prisma.$transaction(async tx => {
		// Diferencia cero: no se inventa una operación, solo se deja constancia
		// de que se revisó
		const operation = difference.isZero()
			? null
			: await createOperationWith(tx, userId, {
					kind: "adjustment",
					amount: difference.abs(),
					date,
					accountId: id,
					sourceAccountId: input.sourceAccountId,
					direction: difference.isPositive() ? "in" : "out",
					// La genera el servidor, no se acepta del cliente
					description: `Conciliación de ${account.name}`,
					origin: "reconciliation",
				});

		await tx.account.update({
			where: { id },
			data: { lastReconciledAt: date },
		});

		return {
			accountId: id,
			calculatedBalance: toNumber(calculated),
			realBalance: toNumber(real),
			difference: toNumber(difference),
			lastReconciledAt: date,
			operation,
		};
	});
};
