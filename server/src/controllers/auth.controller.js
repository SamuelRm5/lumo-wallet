import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { conflict, notFound, unauthenticated, validationError } from "../lib/errors.js";
import prisma from "../config/prisma.js";
import env from "../config/env.js";

const CATALOGO_INICIAL = [
	{ name: "Comida", icon: "food", kind: "expense" },
	{ name: "Transporte", icon: "transport", kind: "expense" },
	{ name: "Servicios", icon: "utilities", kind: "expense" },
	{ name: "Salud", icon: "health", kind: "expense" },
	{ name: "Hogar", icon: "home", kind: "expense" },
	{ name: "Ocio", icon: "leisure", kind: "expense" },
	{ name: "Educación", icon: "education", kind: "expense" },
	{ name: "Otros", icon: "other", kind: "expense" },
	{ name: "Salario", icon: "salary", kind: "income" },
	{ name: "Freelance", icon: "freelance", kind: "income" },
	{ name: "Ventas", icon: "sales", kind: "income" },
	{ name: "Regalos", icon: "gift", kind: "income" },
	{ name: "Otros", icon: "other", kind: "income" },
];

const publicUser = user => ({
	id: user.id,
	name: user.name,
	email: user.email,
});

const signToken = user =>
	jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET, {
		expiresIn: "30d",
	});

const register = async (req, res, next) => {
	const { name, email, password } = req.body;

	try {
		const existing = await prisma.user.findFirst({
			where: { email, status: "active" },
		});

		if (existing) {
			return next(conflict("Ya existe un usuario con este email"));
		}

		// El usuario nace con su catálogo de categorías sembrado
		const user = await prisma.user.create({
			data: {
				name,
				email,
				password: await bcrypt.hash(password, 10),
				categories: { create: CATALOGO_INICIAL },
			},
		});

		res.status(201).json({ token: signToken(user), user: publicUser(user) });
	} catch (error) {
		next(error);
	}
};

const login = async (req, res, next) => {
	const { email, password } = req.body;

	try {
		const user = await prisma.user.findFirst({
			where: { email, status: "active" },
		});

		if (!user || !(await bcrypt.compare(password, user.password))) {
			return next(unauthenticated("Credenciales inválidas"));
		}

		res.json({ token: signToken(user), user: publicUser(user) });
	} catch (error) {
		next(error);
	}
};

// Reemplaza a GET /validate y GET /profile, que devolvían lo mismo con formas
// distintas
const me = async (req, res, next) => {
	try {
		const user = await prisma.user.findUnique({ where: { id: req.userId } });

		if (!user || user.status !== "active") {
			return next(unauthenticated("Usuario no válido"));
		}

		res.json({ ...publicUser(user), createdAt: user.createdAt });
	} catch (error) {
		next(error);
	}
};

const updateMe = async (req, res, next) => {
	const { name, email } = req.body;

	try {
		const user = await prisma.user.findUnique({ where: { id: req.userId } });
		if (!user) return next(notFound("Usuario no encontrado"));

		if (email && email !== user.email) {
			const taken = await prisma.user.findFirst({
				where: { email, status: "active" },
			});
			if (taken) return next(conflict("Ya existe un usuario con este email"));
		}

		const updated = await prisma.user.update({
			where: { id: user.id },
			data: {
				...(name !== undefined && { name }),
				...(email !== undefined && { email }),
			},
		});

		res.json(publicUser(updated));
	} catch (error) {
		next(error);
	}
};

const changePassword = async (req, res, next) => {
	const { currentPassword, newPassword } = req.body;

	try {
		const user = await prisma.user.findUnique({ where: { id: req.userId } });
		if (!user) return next(notFound("Usuario no encontrado"));

		if (!(await bcrypt.compare(currentPassword, user.password))) {
			return next(unauthenticated("Contraseña actual incorrecta"));
		}

		if (await bcrypt.compare(newPassword, user.password)) {
			return next(
				validationError("La nueva contraseña debe ser diferente a la actual"),
			);
		}

		await prisma.user.update({
			where: { id: user.id },
			data: { password: await bcrypt.hash(newPassword, 10) },
		});

		res.json({ message: "Contraseña actualizada exitosamente" });
	} catch (error) {
		next(error);
	}
};

export default { register, login, me, updateMe, changePassword };
