import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import createApp from "../src/app.js";

const app = createApp();

let token;
let otroToken;
let source;
let cash;
let categoria;

const auth = (req, bearer = token) => req.set("Authorization", `Bearer ${bearer}`);
const post = (path, body, bearer) => auth(request(app).post(path), bearer).send(body);
const get = (path, bearer) => auth(request(app).get(path), bearer);

const registrar = async email =>
	(
		await request(app).post("/api/v1/auth/register").send({
			name: "Prueba",
			email,
			password: "password-de-prueba-123",
		})
	).body.accessToken;

const gasto = extra => ({
	kind: "expense",
	amount: 200000,
	date: "2026-08-05T14:30:00-05:00",
	fromAccountId: cash.id,
	sourceAccountId: source.id,
	description: "Mercado",
	...extra,
});

beforeEach(async () => {
	token = await registrar("samuel@lumo.test");
	otroToken = await registrar("otro@lumo.test");

	source = (await post("/api/v1/accounts", { name: "Salario", type: "source" })).body;
	cash = (await post("/api/v1/accounts", { name: "Bancolombia", type: "cash" })).body;
	categoria = (
		await post("/api/v1/categories", { name: "Peluquería", kind: "expense" })
	).body;
});

describe("GET /sync", () => {
	it("sin since devuelve todo lo del usuario y la hora del servidor", async () => {
		await post("/api/v1/operations", gasto());

		const res = await get("/api/v1/sync");

		expect(res.status).toBe(200);
		expect(res.body.since).toBeNull();
		expect(res.body.serverTime).toBeTruthy();
		expect(res.body.accounts.updated).toHaveLength(2);
		expect(res.body.operations.updated).toHaveLength(1);
		// Las del catálogo inicial más la creada aquí
		expect(res.body.categories.updated.some(c => c.id === categoria.id)).toBe(true);
	});

	it("con since solo devuelve lo cambiado después de esa marca", async () => {
		const primera = await get("/api/v1/sync");

		await post("/api/v1/operations", gasto({ description: "Nuevo" }));

		const segunda = await get(`/api/v1/sync?since=${primera.body.serverTime}`);

		expect(segunda.body.accounts.updated).toHaveLength(0);
		expect(segunda.body.categories.updated).toHaveLength(0);
		expect(segunda.body.operations.updated).toHaveLength(1);
		expect(segunda.body.operations.updated[0].description).toBe("Nuevo");
	});

	it("reporta los borrados, que es lo que el cliente no puede deducir solo", async () => {
		const operacion = (await post("/api/v1/operations", gasto())).body;
		const marca = (await get("/api/v1/sync")).body.serverTime;

		await auth(request(app).delete(`/api/v1/operations/${operacion.id}`));
		await auth(request(app).delete(`/api/v1/categories/${categoria.id}`));

		const res = await get(`/api/v1/sync?since=${marca}`);

		expect(res.body.operations.deleted).toEqual([operacion.id]);
		expect(res.body.operations.updated).toHaveLength(0);
		expect(res.body.categories.deleted).toEqual([categoria.id]);
	});

	it("los montos llegan como número, no como objeto", async () => {
		await post("/api/v1/operations", gasto());

		const res = await get("/api/v1/sync");
		const operacion = res.body.operations.updated[0];

		expect(typeof operacion.amount).toBe("number");
		expect(typeof operacion.entries[0].amount).toBe("number");
	});

	it("no devuelve nada de otro usuario", async () => {
		await post("/api/v1/operations", gasto());

		const res = await get("/api/v1/sync", otroToken);

		expect(res.body.accounts.updated).toHaveLength(0);
		expect(res.body.operations.updated).toHaveLength(0);
	});

	it("un since que no es fecha se rechaza", async () => {
		const res = await get("/api/v1/sync?since=ayer");

		expect(res.status).toBe(400);
	});

	it("sin token no responde", async () => {
		const res = await request(app).get("/api/v1/sync");

		expect(res.status).toBe(401);
	});
});
