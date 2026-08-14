import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import createApp from "../src/app.js";

const app = createApp();

let token;
let otroToken;
let source;
let cash;

const auth = (req, bearer = token) => req.set("Authorization", `Bearer ${bearer}`);
const post = (path, body, bearer) => auth(request(app).post(path), bearer).send(body);
const get = (path, bearer) => auth(request(app).get(path), bearer);

const DATE = "2026-08-05T14:30:00-05:00";

const regla = extra => ({
	name: "Arriendo",
	kind: "expense",
	amount: 1500000,
	frequency: "monthly",
	dayOfMonth: 5,
	startDate: "2026-01-05",
	mode: "auto",
	fromAccountId: cash.id,
	sourceAccountId: source.id,
	...extra,
});

beforeEach(async () => {
	token = (
		await request(app).post("/api/v1/auth/register").send({
			name: "Samuel",
			email: "samuel@lumo.test",
			password: "password-de-prueba-123",
		})
	).body.accessToken;

	otroToken = (
		await request(app).post("/api/v1/auth/register").send({
			name: "Otro",
			email: "otro@lumo.test",
			password: "password-de-prueba-123",
		})
	).body.accessToken;

	source = (await post("/api/v1/accounts", { name: "Salario", type: "source" })).body;
	cash = (await post("/api/v1/accounts", { name: "Bancolombia", type: "cash" })).body;
});

describe("recurring-rules", () => {
	it("crea la regla y calcula la siguiente ejecución", async () => {
		const res = await post("/api/v1/recurring-rules", regla());

		expect(res.status).toBe(201);
		expect(res.body.nextRunAt).toBeTruthy();
		// La regla empieza en enero y hoy es agosto: la próxima no es la primera
		expect(new Date(res.body.nextRunAt) >= new Date("2026-08-01")).toBe(true);
	});

	it("recorta el día al último del mes en vez de desbordarse", async () => {
		const res = await post(
			"/api/v1/recurring-rules",
			regla({ dayOfMonth: 31, startDate: "2026-02-01", name: "Suscripción" }),
		);

		expect(res.status).toBe(201);
		const dia = new Date(res.body.nextRunAt).getUTCDate();
		expect(dia).toBeLessThanOrEqual(31);
	});

	it("una regla mensual sin día del mes se rechaza", async () => {
		const res = await post(
			"/api/v1/recurring-rules",
			{ ...regla(), dayOfMonth: undefined },
		);

		expect(res.status).toBe(400);
		expect(res.body.error.details.some(d => d.path.includes("dayOfMonth"))).toBe(true);
	});

	it("una semanal exige día de la semana", async () => {
		const res = await post("/api/v1/recurring-rules", {
			...regla(),
			frequency: "weekly",
			dayOfMonth: undefined,
		});

		expect(res.status).toBe(400);
	});

	it("una transferencia recurrente no lleva cuenta fuente", async () => {
		const receivable = (
			await post("/api/v1/accounts", { name: "Juan", type: "receivable" })
		).body;

		const res = await post("/api/v1/recurring-rules", {
			...regla(),
			kind: "transfer",
			toAccountId: receivable.id,
		});

		expect(res.status).toBe(400);
	});

	it("no acepta cuentas de otro usuario", async () => {
		const ajena = (
			await post("/api/v1/accounts", { name: "Suya", type: "cash" }, otroToken)
		).body;

		const res = await post(
			"/api/v1/recurring-rules",
			regla({ fromAccountId: ajena.id }),
		);

		expect(res.status).toBe(404);
	});

	it("borrar es suave y desaparece del listado", async () => {
		const creada = await post("/api/v1/recurring-rules", regla());

		const borrada = await auth(
			request(app).delete(`/api/v1/recurring-rules/${creada.body.id}`),
		);
		expect(borrada.status).toBe(204);

		const lista = await get("/api/v1/recurring-rules");
		expect(lista.body.data).toHaveLength(0);
	});

	it("no lista ni borra reglas de otro usuario", async () => {
		const creada = await post("/api/v1/recurring-rules", regla());

		const ajena = await get("/api/v1/recurring-rules", otroToken);
		expect(ajena.body.data).toHaveLength(0);

		const borrado = await auth(
			request(app).delete(`/api/v1/recurring-rules/${creada.body.id}`),
			otroToken,
		);
		expect(borrado.status).toBe(404);
	});
});

describe("idempotencia de POST /operations", () => {
	const crear = clave =>
		auth(request(app).post("/api/v1/operations"))
			.set("Idempotency-Key", clave)
			.send({
				kind: "expense",
				amount: 200000,
				date: DATE,
				fromAccountId: cash.id,
				sourceAccountId: source.id,
				description: "Mercado",
			});

	it("repetir la misma clave devuelve la operación ya creada", async () => {
		const primera = await crear("abc-123");
		expect(primera.status).toBe(201);

		const segunda = await crear("abc-123");
		expect(segunda.status).toBe(200);
		expect(segunda.body.id).toBe(primera.body.id);

		const lista = await get("/api/v1/operations?limit=100");
		expect(lista.body.data).toHaveLength(1);
	});

	it("claves distintas crean operaciones distintas", async () => {
		await crear("clave-1");
		await crear("clave-2");

		const lista = await get("/api/v1/operations?limit=100");
		expect(lista.body.data).toHaveLength(2);
	});

	it("sin clave no hay deduplicación", async () => {
		const cuerpo = {
			kind: "expense",
			amount: 200000,
			date: DATE,
			fromAccountId: cash.id,
			sourceAccountId: source.id,
		};

		await post("/api/v1/operations", cuerpo);
		await post("/api/v1/operations", cuerpo);

		const lista = await get("/api/v1/operations?limit=100");
		expect(lista.body.data).toHaveLength(2);
	});
});
