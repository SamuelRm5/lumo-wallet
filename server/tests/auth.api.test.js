import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import createApp from "../src/app.js";

const app = createApp();

const CREDENCIALES = {
	name: "Samuel",
	email: "samuel@lumo.test",
	password: "password-de-prueba-123",
};

let sesion;

const post = (path, body) => request(app).post(path).send(body);

beforeEach(async () => {
	sesion = (await post("/api/v1/auth/register", CREDENCIALES)).body;
});

describe("apertura de sesión", () => {
	it("entrega access token corto y refresh token opaco", async () => {
		expect(sesion.accessToken).toBeTruthy();
		expect(sesion.refreshToken).toBeTruthy();
		expect(sesion.expiresIn).toBe(900);
		expect(sesion.user.email).toBe(CREDENCIALES.email);
		// El refresh token no es un JWT: no lleva información dentro
		expect(sesion.refreshToken.split(".")).toHaveLength(1);
	});

	it("el access token sirve para las rutas protegidas", async () => {
		const res = await request(app)
			.get("/api/v1/auth/me")
			.set("Authorization", `Bearer ${sesion.accessToken}`);

		expect(res.status).toBe(200);
	});
});

describe("POST /auth/refresh", () => {
	it("rota el token: el nuevo sirve y el viejo deja de servir", async () => {
		const renovada = await post("/api/v1/auth/refresh", {
			refreshToken: sesion.refreshToken,
		});

		expect(renovada.status).toBe(200);
		expect(renovada.body.refreshToken).not.toBe(sesion.refreshToken);

		const conElNuevo = await post("/api/v1/auth/refresh", {
			refreshToken: renovada.body.refreshToken,
		});
		expect(conElNuevo.status).toBe(200);
	});

	/**
	 * Reusar un token ya consumido es la señal de que fue robado: el legítimo
	 * ya lo rotó, así que quien lo presenta tiene una copia.
	 */
	it("reusar un token ya consumido cierra todas las sesiones", async () => {
		const renovada = await post("/api/v1/auth/refresh", {
			refreshToken: sesion.refreshToken,
		});

		const reuso = await post("/api/v1/auth/refresh", {
			refreshToken: sesion.refreshToken,
		});
		expect(reuso.status).toBe(401);
		expect(reuso.body.error.message).toMatch(/todas las sesiones/);

		// Y el token que era válido tampoco sirve ya
		const despues = await post("/api/v1/auth/refresh", {
			refreshToken: renovada.body.refreshToken,
		});
		expect(despues.status).toBe(401);
	});

	it("un refresh token inventado devuelve 401", async () => {
		const res = await post("/api/v1/auth/refresh", { refreshToken: "inventado" });
		expect(res.status).toBe(401);
	});
});

describe("POST /auth/logout", () => {
	it("revoca el token del dispositivo", async () => {
		const res = await post("/api/v1/auth/logout", {
			refreshToken: sesion.refreshToken,
		});
		expect(res.status).toBe(204);

		const despues = await post("/api/v1/auth/refresh", {
			refreshToken: sesion.refreshToken,
		});
		expect(despues.status).toBe(401);
	});
});

describe("PUT /auth/password", () => {
	it("cambiar la contraseña cierra todas las sesiones", async () => {
		const otra = await post("/api/v1/auth/login", {
			email: CREDENCIALES.email,
			password: CREDENCIALES.password,
		});

		const cambio = await request(app)
			.put("/api/v1/auth/password")
			.set("Authorization", `Bearer ${sesion.accessToken}`)
			.send({
				currentPassword: CREDENCIALES.password,
				newPassword: "otra-password-distinta-456",
			});
		expect(cambio.status).toBe(200);

		for (const token of [sesion.refreshToken, otra.body.refreshToken]) {
			const res = await post("/api/v1/auth/refresh", { refreshToken: token });
			expect(res.status).toBe(401);
		}

		const conLaNueva = await post("/api/v1/auth/login", {
			email: CREDENCIALES.email,
			password: "otra-password-distinta-456",
		});
		expect(conLaNueva.status).toBe(200);
	});
});
