import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import createApp from "../src/app.js";

const app = createApp();

let token;
let otroToken;

const TOKEN_EXPO = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
const OTRO_TOKEN_EXPO = "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]";

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

beforeEach(async () => {
	token = await registrar("samuel@lumo.test");
	otroToken = await registrar("otro@lumo.test");
});

describe("devices", () => {
	it("registra el dispositivo", async () => {
		const res = await post("/api/v1/devices", {
			expoPushToken: TOKEN_EXPO,
			platform: "android",
		});

		expect(res.status).toBe(201);
		expect(res.body.expoPushToken).toBe(TOKEN_EXPO);
	});

	it("registrar dos veces el mismo token no crea un duplicado", async () => {
		await post("/api/v1/devices", { expoPushToken: TOKEN_EXPO, platform: "ios" });
		await post("/api/v1/devices", { expoPushToken: TOKEN_EXPO, platform: "ios" });

		const lista = await get("/api/v1/devices");
		expect(lista.body.data).toHaveLength(1);
	});

	it("un teléfono que cambia de usuario deja de notificar al anterior", async () => {
		await post("/api/v1/devices", { expoPushToken: TOKEN_EXPO, platform: "android" });
		await post(
			"/api/v1/devices",
			{ expoPushToken: TOKEN_EXPO, platform: "android" },
			otroToken,
		);

		expect((await get("/api/v1/devices")).body.data).toHaveLength(0);
		expect((await get("/api/v1/devices", otroToken)).body.data).toHaveLength(1);
	});

	it("rechaza un token que no tiene formato de Expo", async () => {
		const res = await post("/api/v1/devices", {
			expoPushToken: "cualquier-cosa",
			platform: "android",
		});

		expect(res.status).toBe(400);
	});

	it("rechaza una plataforma desconocida", async () => {
		const res = await post("/api/v1/devices", {
			expoPushToken: TOKEN_EXPO,
			platform: "windows",
		});

		expect(res.status).toBe(400);
	});

	it("borra el dispositivo", async () => {
		const creado = await post("/api/v1/devices", {
			expoPushToken: TOKEN_EXPO,
			platform: "ios",
		});

		const borrado = await auth(
			request(app).delete(`/api/v1/devices/${creado.body.id}`),
		);
		expect(borrado.status).toBe(204);
		expect((await get("/api/v1/devices")).body.data).toHaveLength(0);
	});

	it("no lista ni borra dispositivos de otro usuario", async () => {
		const ajeno = await post(
			"/api/v1/devices",
			{ expoPushToken: OTRO_TOKEN_EXPO, platform: "ios" },
			otroToken,
		);

		expect((await get("/api/v1/devices")).body.data).toHaveLength(0);

		const borrado = await auth(request(app).delete(`/api/v1/devices/${ajeno.body.id}`));
		expect(borrado.status).toBe(404);
	});

	it("sin token no responde", async () => {
		const res = await request(app).get("/api/v1/devices");

		expect(res.status).toBe(401);
	});
});
