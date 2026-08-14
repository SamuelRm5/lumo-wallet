import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import createApp from "../src/app.js";
import { createOperation } from "../src/services/operations.service.js";

const app = createApp();

const CREDENCIALES = {
	name: "Samuel",
	email: "samuel@lumo.test",
	password: "password-de-prueba-123",
};

let token;
let otroToken;

const auth = (req, bearer = token) =>
	req.set("Authorization", `Bearer ${bearer}`);

const crearCuenta = async (type, name = type, bearer = token) => {
	const res = await auth(request(app).post("/api/v1/accounts"), bearer).send({
		name,
		type,
	});
	expect(res.status).toBe(201);
	return res.body;
};

beforeEach(async () => {
	const registro = await request(app)
		.post("/api/v1/auth/register")
		.send(CREDENCIALES);
	token = registro.body.token;

	const otro = await request(app)
		.post("/api/v1/auth/register")
		.send({ ...CREDENCIALES, email: "otro@lumo.test" });
	otroToken = otro.body.token;
});

describe("registro y sesión", () => {
	it("siembra el catálogo de categorías al crear el usuario", async () => {
		const res = await auth(request(app).get("/api/v1/auth/me"));
		expect(res.status).toBe(200);
		expect(res.body.email).toBe(CREDENCIALES.email);
	});

	it("sin token responde 401 con el formato del catálogo", async () => {
		const res = await request(app).get("/api/v1/accounts");
		expect(res.status).toBe(401);
		expect(res.body.error.code).toBe("UNAUTHENTICATED");
	});
});

describe("GET /accounts", () => {
	it("devuelve envelope con data y el saldo como número", async () => {
		await crearCuenta("source", "Salario");
		await crearCuenta("cash", "Bancolombia");

		const res = await auth(request(app).get("/api/v1/accounts"));

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.data)).toBe(true);
		for (const cuenta of res.body.data) {
			expect(typeof cuenta.balance).toBe("number");
			expect(cuenta.currency).toBe("COP");
		}
	});

	it("filtra por tipo", async () => {
		await crearCuenta("source", "Salario");
		await crearCuenta("cash", "Bancolombia");

		const res = await auth(request(app).get("/api/v1/accounts?type=cash"));

		expect(res.status).toBe(200);
		expect(res.body.data).toHaveLength(1);
		expect(res.body.data[0].type).toBe("cash");
	});

	it("no muestra las cuentas de otro usuario", async () => {
		await crearCuenta("cash", "Mía");
		await crearCuenta("cash", "Suya", otroToken);

		const res = await auth(request(app).get("/api/v1/accounts"));

		expect(res.body.data).toHaveLength(1);
		expect(res.body.data[0].name).toBe("Mía");
	});
});

describe("DELETE /accounts/:id", () => {
	it("borra una cuenta con saldo cero", async () => {
		const cuenta = await crearCuenta("cash");

		const res = await auth(request(app).delete(`/api/v1/accounts/${cuenta.id}`));
		expect(res.status).toBe(204);

		const despues = await auth(request(app).get(`/api/v1/accounts/${cuenta.id}`));
		expect(despues.status).toBe(404);
	});

	it("devuelve 409 si la cuenta tiene saldo", async () => {
		const source = await crearCuenta("source");
		const cash = await crearCuenta("cash");
		const me = await auth(request(app).get("/api/v1/auth/me"));
		await createOperation(me.body.id, {
			kind: "income",
			amount: 100000,
			date: "2026-08-01T09:00:00-05:00",
			sourceAccountId: source.id,
			toAccountId: cash.id,
		});

		const res = await auth(request(app).delete(`/api/v1/accounts/${cash.id}`));
		expect(res.status).toBe(409);
		expect(res.body.error.code).toBe("CONFLICT");

		const forzado = await auth(
			request(app).delete(`/api/v1/accounts/${cash.id}?force=true`),
		);
		expect(forzado.status).toBe(204);
	});

	it("no deja borrar la cuenta de otro usuario", async () => {
		const ajena = await crearCuenta("cash", "Suya", otroToken);

		const res = await auth(request(app).delete(`/api/v1/accounts/${ajena.id}`));
		expect(res.status).toBe(404);
	});
});

describe("GET /summary", () => {
	it("devuelve byType, accounts y discrepancy", async () => {
		const source = await crearCuenta("source", "Salario");
		const cash = await crearCuenta("cash", "Bancolombia");
		const me = await auth(request(app).get("/api/v1/auth/me"));

		await createOperation(me.body.id, {
			kind: "income",
			amount: 3000000,
			date: "2026-08-01T09:00:00-05:00",
			sourceAccountId: source.id,
			toAccountId: cash.id,
		});

		const res = await auth(request(app).get("/api/v1/summary"));

		expect(res.status).toBe(200);
		expect(res.body.currency).toBe("COP");
		expect(res.body.byType).toEqual({
			source: 3000000,
			cash: 3000000,
			receivable: 0,
			liability: 0,
		});
		expect(res.body.discrepancy).toBe(0);
		expect(res.body.accounts).toHaveLength(2);
	});
});

describe("POST /accounts/:id/reconcile", () => {
	const conciliar = (id, body) =>
		auth(request(app).post(`/api/v1/accounts/${id}/reconcile`)).send(body);

	it("un faltante genera un ajuste de salida que toca también la fuente", async () => {
		const source = await crearCuenta("source", "Salario");
		const cash = await crearCuenta("cash", "Bancolombia");
		const me = await auth(request(app).get("/api/v1/auth/me"));

		await createOperation(me.body.id, {
			kind: "income",
			amount: 2800000,
			date: "2026-08-01T09:00:00-05:00",
			sourceAccountId: source.id,
			toAccountId: cash.id,
		});

		const res = await conciliar(cash.id, { realBalance: 2760000 });

		expect(res.status).toBe(200);
		expect(res.body.calculatedBalance).toBe(2800000);
		expect(res.body.difference).toBe(-40000);
		expect(res.body.operation.kind).toBe("adjustment");
		expect(res.body.operation.origin).toBe("reconciliation");
		expect(res.body.operation.amount).toBe(40000);
		expect(res.body.lastReconciledAt).toBeTruthy();

		const resumen = await auth(request(app).get("/api/v1/summary"));
		expect(resumen.body.byType.cash).toBe(2760000);
		expect(resumen.body.byType.source).toBe(2760000);
		expect(resumen.body.discrepancy).toBe(0);
	});

	it("un sobrante genera un ajuste de entrada", async () => {
		await crearCuenta("source", "Salario");
		const cash = await crearCuenta("cash", "Bancolombia");

		const res = await conciliar(cash.id, { realBalance: 15000 });

		expect(res.body.difference).toBe(15000);
		expect(res.body.operation.kind).toBe("adjustment");

		const resumen = await auth(request(app).get("/api/v1/summary"));
		expect(resumen.body.byType.cash).toBe(15000);
		expect(resumen.body.discrepancy).toBe(0);
	});

	it("sin diferencia no crea operación pero deja la fecha", async () => {
		await crearCuenta("source", "Salario");
		const cash = await crearCuenta("cash", "Bancolombia");

		const res = await conciliar(cash.id, { realBalance: 0 });

		expect(res.body.difference).toBe(0);
		expect(res.body.operation).toBeNull();
		expect(res.body.lastReconciledAt).toBeTruthy();
	});

	it("una cuenta fuente no se puede conciliar", async () => {
		const source = await crearCuenta("source", "Salario");

		const res = await conciliar(source.id, { realBalance: 100 });

		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("la descripción la pone el servidor, no el cliente", async () => {
		await crearCuenta("source", "Salario");
		const cash = await crearCuenta("cash", "Bancolombia");

		const res = await conciliar(cash.id, {
			realBalance: 5000,
			description: "lo que yo quiera",
		});

		expect(res.body.operation.description).toBe("Conciliación de Bancolombia");
	});
});

describe("validación de entrada", () => {
	it("rechaza un tipo de cuenta inválido", async () => {
		const res = await auth(request(app).post("/api/v1/accounts")).send({
			name: "X",
			type: "deuda",
		});

		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("rechaza un id que no es número", async () => {
		const res = await auth(request(app).get("/api/v1/accounts/abc"));
		expect(res.status).toBe(400);
	});
});
