import { z } from "zod";
import { idParam } from "./common.js";

const platform = z.enum(["android", "ios"], {
	errorMap: () => ({ message: "La plataforma debe ser android o ios" }),
});

export const registerDeviceSchema = {
	body: z.object({
		expoPushToken: z
			.string({ required_error: "El token de Expo es obligatorio" })
			.trim()
			.min(1, "El token de Expo no puede estar vacío")
			.max(255, "El token de Expo no puede superar los 255 caracteres"),
		platform,
	}),
};

export const deviceIdSchema = { params: idParam("id") };
