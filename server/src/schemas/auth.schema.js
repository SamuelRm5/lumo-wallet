import { z } from "zod";
import { requiredText } from "./common.js";

const email = z
	.string({ required_error: "El email es obligatorio" })
	.trim()
	.toLowerCase()
	.email("El email no tiene un formato válido")
	.max(255, "El email no puede superar los 255 caracteres");

const password = z
	.string({ required_error: "La contraseña es obligatoria" })
	.min(8, "La contraseña debe tener al menos 8 caracteres")
	.max(72, "La contraseña no puede superar los 72 caracteres");

export const registerSchema = {
	body: z.object({
		nombre: requiredText(100, "El nombre"),
		email,
		password,
	}),
};

export const loginSchema = {
	body: z.object({
		email,
		// En el login no se valida la longitud: una contraseña vieja más corta
		// debe poder seguir entrando
		password: z
			.string({ required_error: "La contraseña es obligatoria" })
			.min(1, "La contraseña no puede estar vacía"),
	}),
};

export const updateProfileSchema = {
	body: z
		.object({
			nombre: requiredText(100, "El nombre").optional(),
			email: email.optional(),
		})
		.refine(
			data => data.nombre !== undefined || data.email !== undefined,
			"Envía al menos un campo para actualizar",
		),
};

export const changePasswordSchema = {
	body: z.object({
		currentPassword: z
			.string({ required_error: "La contraseña actual es obligatoria" })
			.min(1, "La contraseña actual no puede estar vacía"),
		newPassword: password,
	}),
};
