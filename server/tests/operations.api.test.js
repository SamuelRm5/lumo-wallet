import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import createApp from "../src/app.js";

const app = createApp();

let token;
let otroToken;
let source;
let cash;
let receivable;
let comida;

const auth = (req, bearer = token) => req.set("Authorization", `Bearer ${bearer}`);

const post = (path, body, bearer) => auth(request(app).post(path), bearer).send(body);
const get = (path, bearer) => auth(request(app).get(path), bearer);

const crearCuenta = async (type, name, bearer = token) =>
	(await post("/api/v1/accounts", { name, type }, bearer)).body;

const operar = (body, bearer) => post("/api/v1/operations", body, bearer);

const DATE = "2026-08-05T14:30:00-05:00";

beforeEach(async () => {
	token = (
		await request(app).post("/api/v1/auth/register").send({
			name: "Samuel",
			email: "samuel@lumo.test",
			password: "password-de-prueba-123",
		})
	).body.token;

	otroToken = (
		await request(app).post("/api/v1/auth/register").send({
			name: "Otro",
			email: "otro@lumo.test",
			password: "password-de-prueba-123",
		})
	).body.token;

	source = await crearCuenta("source", "Salario");
	cash = await crearCuenta("cash", "Bancolombia");
	receivable = await crearCuenta("receivable", "Préstamo a Juan");

	const categorias = await get("/api/v1/categories?kind=expense");
	comida = categorias.body.data.find(c => c.name === "Comida");
});

describe("POST /operations", () => {
	it("crea la operación con sus dos asientos", async () => {
		const res = await operar({
			kind: "expense",
			amount: 200000,
			date: DATE,
			fromAccountId: cash.id,
			sourceAccountId: source.id,
			categoryId: comida.id,
			description: "Mercado",
		});

		expect(res.status).toBe(201);
		expect(res.body.entries).toHaveLength(2);
		expect(res.body.entries.every(e => e.amount === -200000)).toBe(true);
		expect(res.body.entries.every(e => e.accountName)).toBe(true);
		expect(res.body.category.name).toBe("Comida");
		expect(typeof res.body.amount).toBe("number");
	});

	it("prestar plata es una sola llamada y no aparece como gasto", async () => {
		await operar({
			kind: "income", amount: 5000000, date: DATE,
			toAccountId: cash.id, sourceAccountId: source.id,
		});

		const res = await operar({
			kind: "transfer", amount: 3000000, date: DATE,
			fromAccountId: cash.id, toAccountId: receivable.id,
			description: "Préstamo a Juan",
		});

		expect(res.status).toBe(201);

		const stats = await get(
			"/api/v1/operations/stats?from=2026-08-01&to=2026-08-31",
		);
		expect(stats.body.expense).toBe(0);
		expect(stats.body.income).toBe(5000000);
	});

	it("rechaza romper la ecuación de control con 400", async () => {
		const res = await operar({
			kind: "transfer", amount: 1000, date: DATE,
			fromAccountId: cash.id, toAccountId: source.id,
		});

		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("exige los campos propios de cada forma", async () => {
		const sinDestino = await operar({ kind: "income", amount: 1000, date: DATE });
		expect(sinDestino.status).toBe(400);
		expect(sinDestino.body.error.details.some(d => d.path.includes("toAccountId"))).toBe(true);

		const ajusteSinMotivo = await operar({
			kind: "adjustment", amount: 1000, date: DATE,
			accountId: cash.id, direction: "out",
		});
		expect(ajusteSinMotivo.status).toBe(400);
	});

	it("no deja usar la cuenta de otro usuario", async () => {
		const ajena = await crearCuenta("cash", "Suya", otroToken);

		const res = await operar({
			kind: "income", amount: 1000, date: DATE,
			toAccountId: ajena.id, sourceAccountId: source.id,
		});

		expect(res.status).toBe(404);
	});
});

describe("GET /operations", () => {
	// Un mes ya cerrado: las fechas futuras las rechaza la validación, y con
	// razón, porque la date la manda el cliente desde su propio reloj
	beforeEach(async () => {
		for (let i = 1; i <= 25; i += 1) {
			const res = await operar({
				kind: "income",
				amount: i * 1000,
				date: `2026-06-${String(i).padStart(2, "0")}T10:00:00-05:00`,
				toAccountId: cash.id,
				sourceAccountId: source.id,
			});
			expect(res.status).toBe(201);
		}
	});

	it("pagina por cursor sin repetir ni saltarse filas", async () => {
		const vistos = new Set();
		let cursor = null;
		let paginas = 0;

		do {
			const url = `/api/v1/operations?limit=10${cursor ? `&cursor=${cursor}` : ""}`;
			const res = await get(url);

			expect(res.status).toBe(200);
			for (const operacion of res.body.data) {
				expect(vistos.has(operacion.id)).toBe(false);
				vistos.add(operacion.id);
			}

			cursor = res.body.meta.nextCursor;
			paginas += 1;
		} while (cursor && paginas < 10);

		expect(vistos.size).toBe(25);
		expect(paginas).toBe(3);
	});

	it("filtra por cuenta, tipo y rango de fechas", async () => {
		const porCuenta = await get(`/api/v1/operations?accountId=${receivable.id}`);
		expect(porCuenta.body.data).toHaveLength(0);

		const porTipo = await get("/api/v1/operations?kind=expense");
		expect(porTipo.body.data).toHaveLength(0);

		// El extremo final incluye el día entero, no se corta a medianoche UTC
		const porFecha = await get(
			"/api/v1/operations?from=2026-06-01&to=2026-06-05&limit=100",
		);
		expect(porFecha.body.data).toHaveLength(5);
	});

	it("un cursor corrupto devuelve 400", async () => {
		const res = await get("/api/v1/operations?cursor=basura");
		expect(res.status).toBe(400);
	});

	it("no lista operaciones de otro usuario", async () => {
		const res = await get("/api/v1/operations?limit=100", otroToken);
		expect(res.body.data).toHaveLength(0);
	});
});

describe("GET /operations/stats", () => {
	const rango = "from=2026-08-01&to=2026-08-31";

	it("no cuenta cada operación dos veces", async () => {
		await operar({
			kind: "income", amount: 3000000, date: DATE,
			toAccountId: cash.id, sourceAccountId: source.id,
		});
		await operar({
			kind: "expense", amount: 200000, date: DATE,
			fromAccountId: cash.id, sourceAccountId: source.id,
			categoryId: comida.id,
		});

		const res = await get(`/api/v1/operations/stats?${rango}`);

		expect(res.body.income).toBe(3000000);
		expect(res.body.expense).toBe(200000);
		expect(res.body.net).toBe(2800000);
	});

	it("separa los ajustes del desglose por categoría", async () => {
		await operar({
			kind: "expense", amount: 200000, date: DATE,
			fromAccountId: cash.id, sourceAccountId: source.id,
			categoryId: comida.id,
		});
		await operar({
			kind: "expense", amount: 90000, date: DATE,
			fromAccountId: cash.id, sourceAccountId: source.id,
		});
		await operar({
			kind: "adjustment", amount: 40000, date: DATE,
			accountId: cash.id, sourceAccountId: source.id,
			direction: "out", description: "Conciliación",
		});

		const res = await get(`/api/v1/operations/stats?${rango}`);

		expect(res.body.expense).toBe(290000);
		expect(res.body.adjustments).toBe(-40000);

		const categorias = res.body.byCategory;
		expect(categorias.find(c => c.name === "Comida").total).toBe(200000);
		expect(categorias.find(c => c.categoryId === null).name).toBe("Sin categoría");
		expect(categorias.find(c => c.categoryId === null).total).toBe(90000);
		// Los ajustes no crean una categoría fantasma
		expect(categorias.some(c => c.kind === "adjustment")).toBe(false);
	});

	it("agrupa por mes", async () => {
		await operar({
			kind: "income", amount: 1000, date: "2026-07-15T10:00:00-05:00",
			toAccountId: cash.id, sourceAccountId: source.id,
		});
		await operar({
			kind: "income", amount: 2000, date: "2026-08-15T10:00:00-05:00",
			toAccountId: cash.id, sourceAccountId: source.id,
		});

		const res = await get("/api/v1/operations/stats?from=2026-07-01&to=2026-08-31");

		expect(res.body.byMonth).toHaveLength(2);
		expect(res.body.byMonth[0]).toMatchObject({ month: "2026-07", income: 1000 });
		expect(res.body.byMonth[1]).toMatchObject({ month: "2026-08", income: 2000 });
	});
});

describe("ciclo de vida por HTTP", () => {
	it("editar, borrar y consultar", async () => {
		const creada = await operar({
			kind: "income", amount: 1000000, date: DATE,
			toAccountId: cash.id, sourceAccountId: source.id,
		});

		const editada = await auth(
			request(app).put(`/api/v1/operations/${creada.body.id}`),
		).send({
			kind: "income", amount: 1500000, date: DATE,
			toAccountId: cash.id, sourceAccountId: source.id,
		});

		expect(editada.status).toBe(200);
		expect(editada.body.amount).toBe(1500000);
		expect(editada.body.entries).toHaveLength(2);

		const borrada = await auth(
			request(app).delete(`/api/v1/operations/${creada.body.id}`),
		);
		expect(borrada.status).toBe(204);

		const despues = await get(`/api/v1/operations/${creada.body.id}`);
		expect(despues.status).toBe(404);

		const resumen = await get("/api/v1/summary");
		expect(resumen.body.byType.cash).toBe(0);
		expect(resumen.body.discrepancy).toBe(0);
	});
});

describe("categorías", () => {
	it("el registro siembra el catálogo inicial", async () => {
		const res = await get("/api/v1/categories");
		expect(res.body.data).toHaveLength(13);
	});

	it("rechaza un nombre repetido dentro del mismo tipo", async () => {
		const res = await post("/api/v1/categories", {
			name: "Comida",
			kind: "expense",
		});
		expect(res.status).toBe(409);
	});

	it("el mismo nombre en otro tipo sí se permite", async () => {
		const res = await post("/api/v1/categories", {
			name: "Comida",
			kind: "income",
		});
		expect(res.status).toBe(201);
	});

	it("borrar es suave y la operación la conserva", async () => {
		const operacion = await operar({
			kind: "expense", amount: 50000, date: DATE,
			fromAccountId: cash.id, sourceAccountId: source.id,
			categoryId: comida.id,
		});

		const borrada = await auth(
			request(app).delete(`/api/v1/categories/${comida.id}`),
		);
		expect(borrada.status).toBe(204);

		const lista = await get("/api/v1/categories");
		expect(lista.body.data.some(c => c.id === comida.id)).toBe(false);

		const stats = await get(
			"/api/v1/operations/stats?from=2026-08-01&to=2026-08-31",
		);
		expect(stats.body.byCategory.find(c => c.categoryId === comida.id).total).toBe(50000);

		const consultada = await get(`/api/v1/operations/${operacion.body.id}`);
		expect(consultada.status).toBe(200);
	});

	it("rechaza un color que no es hexadecimal", async () => {
		const res = await post("/api/v1/categories", {
			name: "Nueva",
			kind: "expense",
			color: "rojo",
		});
		expect(res.status).toBe(400);
	});
});
