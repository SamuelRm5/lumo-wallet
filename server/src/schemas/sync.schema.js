import { z } from "zod";

export const syncSchema = {
	query: z.object({
		// Ausente significa sincronización completa: es la primera vez que el
		// dispositivo se conecta
		since: z
			.string()
			.datetime({ offset: true, message: "since debe ser una fecha ISO con zona horaria" })
			.transform(value => new Date(value))
			.optional(),
	}),
};
