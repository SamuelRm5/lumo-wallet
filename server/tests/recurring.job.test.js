import { describe, expect, it } from "vitest";
import { prismaIncludingDeleted as prisma } from "../src/config/prisma.js";
import { runDueRules } from "../src/services/recurring.service.js";
import { balanceForAccount } from "../src/services/balances.service.js";
import { createScenario } from "./helpers.js";

// Fecha de referencia fija: el resultado del job no puede depender del día en
// que se ejecuten los tests
const HOY = new Date("2026-03-06T12:00:00-05:00");
const ENERO = new Date("2026-01-05T00:00:00Z");

const crearRegla = (escenario, extra = {}) =>
	prisma.recurringRule.create({
		data: {
			userId: escenario.user.id,
			name: "Arriendo",
			kind: "expense",
			amount: 1500000,
			sourceAccountId: escenario.source.id,
			fromAccountId: escenario.cash.id,
			frequency: "monthly",
			dayOfMonth: 5,
			startDate: ENERO,
			mode: "auto",
			nextRunAt: ENERO,
			...extra,
		},
	});

const operacionesDe = ruleId =>
	prisma.operation.findMany({
		where: { recurringRuleId: ruleId },
		orderBy: { scheduledDate: "asc" },
	});

describe("job de recurrentes", () => {
	it("genera las ocurrencias atrasadas desde nextRunAt hasta hoy", async () => {
		const escenario = await createScenario();
		const regla = await crearRegla(escenario);

		const summary = await runDueRules({ reference: HOY });

		expect(summary.created).toBe(3);
		expect(summary.failed).toBe(0);

		const operaciones = await operacionesDe(regla.id);
		expect(operaciones.map(o => o.scheduledDate.toISOString().slice(0, 10))).toEqual(
			["2026-01-05", "2026-02-05", "2026-03-05"],
		);
	});

	it("correr el job dos veces sobre las mismas fechas no duplica nada", async () => {
		const escenario = await createScenario();
		const regla = await crearRegla(escenario);

		await runDueRules({ reference: HOY });

		// Se devuelve nextRunAt a la primera ocurrencia: es la situación que crea
		// una ejecución repetida o solapada
		await prisma.recurringRule.update({
			where: { id: regla.id },
			data: { nextRunAt: ENERO },
		});

		const segunda = await runDueRules({ reference: HOY });

		expect(segunda.created).toBe(0);
		expect(segunda.skipped).toBe(3);
		expect(await operacionesDe(regla.id)).toHaveLength(3);
	});

	it("deja la siguiente ejecución después de la última generada", async () => {
		const escenario = await createScenario();
		const regla = await crearRegla(escenario);

		await runDueRules({ reference: HOY });

		const actualizada = await prisma.recurringRule.findUnique({
			where: { id: regla.id },
		});
		expect(actualizada.nextRunAt.toISOString().slice(0, 10)).toBe("2026-04-05");
	});

	it("el tope corta la puesta al día sin perder lo que falta", async () => {
		const escenario = await createScenario();
		const regla = await crearRegla(escenario);

		const primera = await runDueRules({ reference: HOY, maxCatchUp: 2 });
		expect(primera.created).toBe(2);

		const pendiente = await prisma.recurringRule.findUnique({
			where: { id: regla.id },
		});
		expect(pendiente.nextRunAt.toISOString().slice(0, 10)).toBe("2026-03-05");

		const segunda = await runDueRules({ reference: HOY, maxCatchUp: 2 });
		expect(segunda.created).toBe(1);
		expect(await operacionesDe(regla.id)).toHaveLength(3);
	});

	it("no genera nada después de la fecha de fin", async () => {
		const escenario = await createScenario();
		const regla = await crearRegla(escenario, {
			endDate: new Date("2026-02-05T00:00:00Z"),
		});

		await runDueRules({ reference: HOY });

		expect(await operacionesDe(regla.id)).toHaveLength(2);

		const agotada = await prisma.recurringRule.findUnique({
			where: { id: regla.id },
		});
		expect(agotada.nextRunAt).toBeNull();
	});

	it("en modo automático la operación queda confirmada y mueve el saldo", async () => {
		const escenario = await createScenario();
		await crearRegla(escenario);

		await runDueRules({ reference: HOY });

		const saldo = await balanceForAccount(escenario.cash.id);
		expect(saldo.toNumber()).toBe(-4500000);
	});

	it("en modo recordatorio la operación queda pendiente y no toca el saldo", async () => {
		const escenario = await createScenario();
		const regla = await crearRegla(escenario, { mode: "reminder" });

		await runDueRules({ reference: HOY });

		const operaciones = await operacionesDe(regla.id);
		expect(operaciones).toHaveLength(3);
		expect(operaciones.every(o => o.status === "pending")).toBe(true);
		expect(operaciones.every(o => o.origin === "recurring")).toBe(true);

		const saldo = await balanceForAccount(escenario.cash.id);
		expect(saldo.toNumber()).toBe(0);
	});

	it("una regla rota no impide que las demás se generen", async () => {
		const escenario = await createScenario();
		const rota = await crearRegla(escenario, { name: "Rota" });
		const sana = await crearRegla(escenario, { name: "Sana" });

		// La cuenta desaparece después de crear la regla: el job tiene que
		// sobrevivirlo
		await prisma.account.update({
			where: { id: escenario.cash.id },
			data: { deletedAt: new Date() },
		});
		await prisma.recurringRule.update({
			where: { id: sana.id },
			data: { fromAccountId: escenario.liability.id },
		});

		const summary = await runDueRules({ reference: HOY });

		expect(summary.failed).toBe(1);
		expect(await operacionesDe(rota.id)).toHaveLength(0);
		expect(await operacionesDe(sana.id)).toHaveLength(3);
	});

	it("una regla borrada no genera ocurrencias", async () => {
		const escenario = await createScenario();
		const regla = await crearRegla(escenario);

		await prisma.recurringRule.update({
			where: { id: regla.id },
			data: { deletedAt: new Date() },
		});

		const summary = await runDueRules({ reference: HOY });

		expect(summary.rules).toBe(0);
		expect(await operacionesDe(regla.id)).toHaveLength(0);
	});
});
