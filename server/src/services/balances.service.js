import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import { toNumber } from "../lib/serialize.js";

/**
 * Solo cuentan los asientos de operaciones vivas y confirmadas.
 * La condición sobre la operación va aquí dentro y no en un join externo: en
 * SQL, filtrar la tabla derecha de un LEFT JOIN desde el ON conserva la fila y
 * los asientos de operaciones borradas seguirían sumando.
 */
const LIVE_ENTRY = {
	operation: { deletedAt: null, status: "confirmed" },
};

// El saldo nunca se almacena: es siempre la suma de los asientos. El
// razonamiento está en docs/BACKEND.md 3.3
export const balanceForAccount = async accountId => {
	const { _sum } = await prisma.entry.aggregate({
		_sum: { amount: true },
		where: { accountId, ...LIVE_ENTRY },
	});

	return _sum.amount ?? new Prisma.Decimal(0);
};

/** Saldo de todas las cuentas vivas del usuario, en una sola consulta */
export const balancesForUser = async userId => {
	const rows = await prisma.entry.groupBy({
		by: ["accountId"],
		_sum: { amount: true },
		where: {
			account: { userId, deletedAt: null },
			...LIVE_ENTRY,
		},
	});

	return new Map(rows.map(row => [row.accountId, row._sum.amount]));
};

const zero = () => new Prisma.Decimal(0);

/**
 * Resumen del dashboard. La contribución de una cuenta `source` entra
 * invertida, por eso `discrepancy` es cash + receivable + liability - source.
 * Un resultado distinto de cero significa captura incompleta, no plata
 * sobrante ni faltante.
 */
export const summaryForUser = async userId => {
	const [accounts, balances] = await Promise.all([
		prisma.account.findMany({
			where: { userId },
			orderBy: [{ type: "asc" }, { name: "asc" }],
		}),
		balancesForUser(userId),
	]);

	const byType = {
		source: zero(),
		cash: zero(),
		receivable: zero(),
		liability: zero(),
	};

	let discrepancy = zero();

	const detail = accounts.map(account => {
		const balance = balances.get(account.id) ?? zero();
		byType[account.type] = byType[account.type].plus(balance);
		discrepancy =
			account.type === "source"
				? discrepancy.minus(balance)
				: discrepancy.plus(balance);

		return {
			id: account.id,
			name: account.name,
			type: account.type,
			balance: toNumber(balance),
			lastReconciledAt: account.lastReconciledAt,
		};
	});

	return {
		byType: Object.fromEntries(
			Object.entries(byType).map(([type, total]) => [type, toNumber(total)]),
		),
		accounts: detail,
		discrepancy: toNumber(discrepancy),
	};
};
