import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import createApp from "../src/app.js";

const app = createApp();

let token;

const auth = req => req.set("Authorization", `Bearer ${token}`);
const get = path => auth(request(app).get(path));

beforeEach(async () => {
	token = (
		await request(app).post("/api/v1/auth/register").send({
			name: "Samuel",
			email: "samuel@lumo.test",
			password: "password-de-prueba-123",
		})
	).body.accessToken;

	await auth(request(app).post("/api/v1/accounts")).send({
		name: "Bancolombia",
		type: "cash",
	});
});

// MIN_CLIENT_VERSION vale 1.2.0 en el entorno de pruebas
describe("X-Client-Version", () => {
	const conVersion = version =>
		request(app).get("/api/health").set("X-Client-Version", version);

	it("una versión por debajo del mínimo recibe 426", async () => {
		const res = await conVersion("1.1.9");

		expect(res.status).toBe(426);
		expect(res.body.error.code).toBe("UPGRADE_REQUIRED");
	});

	it("la versión mínima y las posteriores pasan", async () => {
		expect((await conVersion("1.2.0")).status).toBe(200);
		expect((await conVersion("1.2.1")).status).toBe(200);
		expect((await conVersion("2.0")).status).toBe(200);
	});

	it("sin cabecera no se bloquea a nadie", async () => {
		const res = await request(app).get("/api/health");

		expect(res.status).toBe(200);
	});

	it("una cabecera con formato raro tampoco bloquea", async () => {
		const res = await conVersion("beta-3");

		expect(res.status).toBe(200);
	});
});

describe("ETag", () => {
	const revalidar = async path => {
		const primera = await get(path);
		expect(primera.status).toBe(200);
		expect(primera.headers.etag).toBeTruthy();

		return get(path).set("If-None-Match", primera.headers.etag);
	};

	it("GET /accounts sin cambios devuelve 304", async () => {
		const res = await revalidar("/api/v1/accounts");

		expect(res.status).toBe(304);
		expect(res.text).toBeFalsy();
	});

	it("GET /categories sin cambios devuelve 304", async () => {
		expect((await revalidar("/api/v1/categories")).status).toBe(304);
	});

	it("GET /summary sin cambios devuelve 304", async () => {
		expect((await revalidar("/api/v1/summary")).status).toBe(304);
	});

	it("crear una cuenta invalida el ETag anterior", async () => {
		const primera = await get("/api/v1/accounts");

		await auth(request(app).post("/api/v1/accounts")).send({
			name: "Nequi",
			type: "cash",
		});

		const segunda = await get("/api/v1/accounts").set(
			"If-None-Match",
			primera.headers.etag,
		);

		expect(segunda.status).toBe(200);
		expect(segunda.body.data).toHaveLength(2);
	});
});
