import { describe, expect, it } from "vitest";
import {
	createOperation,
	deleteOperation,
	updateOperation,
} from "../src/services/operations.service.js";
import { balanceForAccount, summaryForUser } from "../src/services/balances.service.js";
import { createAccount, createCategory, createScenario, createUser } from "./helpers.js";

const DATE = "2026-08-05T14:30:00-05:00";

const saldo = async id => (await balanceForAccount(id)).toNumber();

describe("composición de asientos", () => {
	it("un ingreso sube la fuente y el depósito", async () => {
		const { user, source, cash } = await createScenario();

		const operation = await createOperation(user.id, {
			kind: "income",
			amount: 3000000,
			date: DATE,
			sourceAccountId: source.id,
			toAccountId: cash.id,
		});

		expect(operation.entries).toHaveLength(2);
		expect(await saldo(source.id)).toBe(3000000);
		expect(await saldo(cash.id)).toBe(3000000);
	});

	it("un gasto baja la fuente y el depósito", async () => {
		const { user, source, cash } = await createScenario();

		await createOperation(user.id, {
			kind: "income",
			amount: 3000000,
			date: DATE,
			sourceAccountId: source.id,
			toAccountId: cash.id,
		});
		await createOperation(user.id, {
			kind: "expense",
			amount: 200000,
			date: DATE,
			sourceAccountId: source.id,
			fromAccountId: cash.id,
		});

		expect(await saldo(source.id)).toBe(2800000);
		expect(await saldo(cash.id)).toBe(2800000);
	});

	it("una transferencia mueve la plata sin tocar la fuente", async () => {
		const { user, source, cash, receivable } = await createScenario();

		await createOperation(user.id, {
			kind: "income",
			amount: 3000000,
			date: DATE,
			sourceAccountId: source.id,
			toAccountId: cash.id,
		});
		await createOperation(user.id, {
			kind: "transfer",
			amount: 300000,
			date: DATE,
			fromAccountId: cash.id,
			toAccountId: receivable.id,
			description: "Préstamo a Juan",
		});

		expect(await saldo(source.id)).toBe(3000000);
		expect(await saldo(cash.id)).toBe(2700000);
		expect(await saldo(receivable.id)).toBe(300000);
	});

	it("un ajuste de salida baja ambos lados", async () => {
		const { user, source, cash } = await createScenario();

		await createOperation(user.id, {
			kind: "adjustment",
			amount: 40000,
			date: DATE,
			sourceAccountId: source.id,
			accountId: cash.id,
			direction: "out",
			description: "Conciliación de Bancolombia",
		});

		expect(await saldo(source.id)).toBe(-40000);
		expect(await saldo(cash.id)).toBe(-40000);
	});
});

describe("invariante de la ecuación de control", () => {
	it("las cuatro formas dejan el descuadre en cero", async () => {
		const { user, source, cash, receivable, liability } = await createScenario();

		await createOperation(user.id, {
			kind: "income", amount: 3000000, date: DATE,
			sourceAccountId: source.id, toAccountId: cash.id,
		});
		await createOperation(user.id, {
			kind: "expense", amount: 200000, date: DATE,
			sourceAccountId: source.id, fromAccountId: cash.id,
		});
		await createOperation(user.id, {
			kind: "transfer", amount: 300000, date: DATE,
			fromAccountId: cash.id, toAccountId: receivable.id,
		});
		await createOperation(user.id, {
			kind: "expense", amount: 450000, date: DATE,
			sourceAccountId: source.id, fromAccountId: liability.id,
		});
		await createOperation(user.id, {
			kind: "adjustment", amount: 40000, date: DATE,
			sourceAccountId: source.id, accountId: cash.id,
			direction: "out", description: "Conciliación",
		});

		const { discrepancy, byType } = await summaryForUser(user.id);

		expect(discrepancy).toBe(0);
		expect(byType.source).toBe(2310000);
		expect(byType.cash).toBe(2460000);
		expect(byType.receivable).toBe(300000);
		expect(byType.liability).toBe(-450000);
	});

	it("el recorrido completo de la documentación cierra en cada paso", async () => {
		const { user, source, cash, receivable } = await createScenario();
		const efectivo = await createAccount(user.id, "cash", "Efectivo");

		const pasos = [
			{ kind: "income", amount: 3000000, sourceAccountId: source.id, toAccountId: cash.id },
			{ kind: "expense", amount: 200000, sourceAccountId: source.id, fromAccountId: cash.id },
			{ kind: "transfer", amount: 500000, fromAccountId: cash.id, toAccountId: efectivo.id },
			{ kind: "transfer", amount: 300000, fromAccountId: efectivo.id, toAccountId: receivable.id },
			{ kind: "transfer", amount: 300000, fromAccountId: receivable.id, toAccountId: cash.id },
		];

		for (const paso of pasos) {
			await createOperation(user.id, { ...paso, date: DATE });
			const { discrepancy } = await summaryForUser(user.id);
			expect(discrepancy).toBe(0);
		}

		// En la tabla de la documentación la columna cash es el total de los
		// depósitos, no el saldo de uno solo: 2.600.000 en Nequi más 200.000
		// en efectivo
		const { byType } = await summaryForUser(user.id);
		expect(byType.source).toBe(2800000);
		expect(byType.cash).toBe(2800000);
		expect(byType.receivable).toBe(0);
		expect(await saldo(cash.id)).toBe(2600000);
		expect(await saldo(efectivo.id)).toBe(200000);
	});
});

describe("validaciones de escritura", () => {
	it("rechaza un monto de cero o negativo", async () => {
		const { user, source, cash } = await createScenario();
		const base = { kind: "income", date: DATE, sourceAccountId: source.id, toAccountId: cash.id };

		await expect(createOperation(user.id, { ...base, amount: 0 })).rejects.toThrow(/mayor que cero/);
		await expect(createOperation(user.id, { ...base, amount: -1 })).rejects.toThrow(/mayor que cero/);
	});

	it("rechaza una transferencia que toca una cuenta fuente", async () => {
		const { user, source, cash } = await createScenario();

		await expect(
			createOperation(user.id, {
				kind: "transfer", amount: 1000, date: DATE,
				fromAccountId: cash.id, toAccountId: source.id,
			}),
		).rejects.toThrow(/fuente/);
	});

	it("rechaza dos veces la misma cuenta", async () => {
		const { user, cash } = await createScenario();

		await expect(
			createOperation(user.id, {
				kind: "transfer", amount: 1000, date: DATE,
				fromAccountId: cash.id, toAccountId: cash.id,
			}),
		).rejects.toThrow(/dos cuentas distintas/);
	});

	it("un ingreso no puede entrar a una cuenta por cobrar", async () => {
		const { user, source, receivable } = await createScenario();

		await expect(
			createOperation(user.id, {
				kind: "income", amount: 1000, date: DATE,
				sourceAccountId: source.id, toAccountId: receivable.id,
			}),
		).rejects.toThrow(/depósito/);
	});

	it("un gasto no puede salir de una cuenta por cobrar", async () => {
		const { user, source, receivable } = await createScenario();

		await expect(
			createOperation(user.id, {
				kind: "expense", amount: 1000, date: DATE,
				sourceAccountId: source.id, fromAccountId: receivable.id,
			}),
		).rejects.toThrow(/depósito o de una cuenta de crédito/);
	});

	it("un ajuste exige motivo", async () => {
		const { user, source, cash } = await createScenario();

		await expect(
			createOperation(user.id, {
				kind: "adjustment", amount: 1000, date: DATE,
				sourceAccountId: source.id, accountId: cash.id, direction: "out",
			}),
		).rejects.toThrow(/motivo/);
	});

	it("la categoría debe coincidir en tipo con la operación", async () => {
		const { user, source, cash } = await createScenario();
		const gasto = await createCategory(user.id, "expense");

		await expect(
			createOperation(user.id, {
				kind: "income", amount: 1000, date: DATE,
				sourceAccountId: source.id, toAccountId: cash.id,
				categoryId: gasto.id,
			}),
		).rejects.toThrow(/tipo/);
	});

	it("una transferencia no acepta categoría", async () => {
		const { user, cash, receivable } = await createScenario();
		const gasto = await createCategory(user.id, "expense");

		await expect(
			createOperation(user.id, {
				kind: "transfer", amount: 1000, date: DATE,
				fromAccountId: cash.id, toAccountId: receivable.id,
				categoryId: gasto.id,
			}),
		).rejects.toThrow(/no llevan categoría/);
	});

	it("resuelve sola la fuente cuando solo hay una", async () => {
		const { user, cash } = await createScenario();

		const operation = await createOperation(user.id, {
			kind: "income", amount: 1000, date: DATE, toAccountId: cash.id,
		});

		expect(operation.entries).toHaveLength(2);
	});

	it("exige elegir fuente cuando hay varias", async () => {
		const { user, cash } = await createScenario();
		await createAccount(user.id, "source", "Freelance");

		await expect(
			createOperation(user.id, { kind: "income", amount: 1000, date: DATE, toAccountId: cash.id }),
		).rejects.toThrow(/varias cuentas fuente/);
	});
});

describe("aislamiento entre usuarios", () => {
	it("no se puede usar la cuenta de otro usuario", async () => {
		const { user, source, cash } = await createScenario();
		const intruso = await createUser("Intruso");
		const suya = await createAccount(intruso.id, "cash", "Su banco");

		await expect(
			createOperation(user.id, {
				kind: "income", amount: 1000, date: DATE,
				sourceAccountId: source.id, toAccountId: suya.id,
			}),
		).rejects.toThrow(/no es tuya/);
	});

	it("no se puede editar la operación de otro usuario", async () => {
		const { user, source, cash } = await createScenario();
		const operation = await createOperation(user.id, {
			kind: "income", amount: 1000, date: DATE,
			sourceAccountId: source.id, toAccountId: cash.id,
		});

		const intruso = await createUser("Intruso");
		await expect(
			updateOperation(intruso.id, operation.id, {
				kind: "income", amount: 9999, date: DATE,
			}),
		).rejects.toThrow(/no es tuya/);
	});

	it("el resumen de un usuario no incluye cuentas de otro", async () => {
		const { user, source, cash } = await createScenario();
		await createOperation(user.id, {
			kind: "income", amount: 1000, date: DATE,
			sourceAccountId: source.id, toAccountId: cash.id,
		});

		const intruso = await createUser("Intruso");
		const { accounts, byType } = await summaryForUser(intruso.id);

		expect(accounts).toHaveLength(0);
		expect(byType.cash).toBe(0);
	});
});

describe("ciclo de vida", () => {
	it("editar reemplaza los dos asientos y deja exactamente dos", async () => {
		const { user, source, cash } = await createScenario();

		const creada = await createOperation(user.id, {
			kind: "income", amount: 3000000, date: DATE,
			sourceAccountId: source.id, toAccountId: cash.id,
		});

		const editada = await updateOperation(user.id, creada.id, {
			kind: "income", amount: 2500000, date: DATE,
			sourceAccountId: source.id, toAccountId: cash.id,
		});

		expect(editada.entries).toHaveLength(2);
		expect(await saldo(cash.id)).toBe(2500000);
		expect((await summaryForUser(user.id)).discrepancy).toBe(0);
	});

	it("borrar una operación deja de contar sus dos asientos", async () => {
		const { user, source, cash } = await createScenario();

		const operation = await createOperation(user.id, {
			kind: "income", amount: 3000000, date: DATE,
			sourceAccountId: source.id, toAccountId: cash.id,
		});

		await deleteOperation(user.id, operation.id);

		expect(await saldo(source.id)).toBe(0);
		expect(await saldo(cash.id)).toBe(0);
	});

	it("un saldo negativo es legal", async () => {
		const { user, source, cash } = await createScenario();

		await createOperation(user.id, {
			kind: "expense", amount: 50000, date: DATE,
			sourceAccountId: source.id, fromAccountId: cash.id,
		});

		expect(await saldo(cash.id)).toBe(-50000);
		expect((await summaryForUser(user.id)).discrepancy).toBe(0);
	});
});
