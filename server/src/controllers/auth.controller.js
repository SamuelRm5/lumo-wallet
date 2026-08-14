import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
	conflict,
	notFound,
	unauthenticated,
	validationError,
} from "../lib/errors.js";
import prisma from "../config/prisma.js";
import env from "../config/env.js";

const register = async (req, res, next) => {
	const { nombre, email, password } = req.body;

	try {
		const existingUser = await prisma.usuarios.findFirst({
			where: { email, estado: "activo" },
		});

		if (existingUser) {
			return next(conflict("Ya existe un usuario con este email"));
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const usuario = await prisma.usuarios.create({
			data: {
				nombre,
				email,
				password: hashedPassword,
				createdAt: new Date(),
			},
		});

		const token = jwt.sign(
			{
				userId: usuario.id,
				email: usuario.email,
			},
			env.JWT_SECRET,
			{ expiresIn: "365d" }, // 1 año para uso familiar
		);
		res.status(201).json({
			token,
			user: {
				id: usuario.id,
				nombre: usuario.nombre,
				email: usuario.email,
			},
		});
	} catch (error) {
		next(error);
	}
};

const login = async (req, res, next) => {
	const { email, password } = req.body;

	try {
		const usuario = await prisma.usuarios.findFirst({
			where: { email, estado: "activo" },
		});

		if (!usuario) {
			return next(unauthenticated("Credenciales inválidas"));
		}

		const isValidPassword = await bcrypt.compare(
			password,
			usuario.password,
		);

		if (!isValidPassword) {
			return next(unauthenticated("Credenciales inválidas"));
		}

		const token = jwt.sign(
			{
				userId: usuario.id,
				email: usuario.email,
			},
			env.JWT_SECRET,
			{ expiresIn: "30d" }, // 30 días para uso familiar
		);

		res.json({
			token,
			user: {
				id: usuario.id,
				nombre: usuario.nombre,
				email: usuario.email,
			},
		});
	} catch (error) {
		next(error);
	}
};

const validateToken = async (req, res, next) => {
	try {
		// El middleware ya validó el token y estableció req.userId
		const usuario = await prisma.usuarios.findUnique({
			where: { id: req.userId },
			select: { id: true, nombre: true, email: true, estado: true },
		});

		if (!usuario || usuario.estado !== "activo") {
			return next(unauthenticated("Usuario no válido"));
		}

		res.json({
			valid: true,
			user: {
				id: usuario.id,
				nombre: usuario.nombre,
				email: usuario.email,
			},
		});
	} catch (error) {
		next(error);
	}
};

const getProfile = async (req, res, next) => {
	try {
		const usuario = await prisma.usuarios.findUnique({
			where: { id: req.userId },
			select: {
				id: true,
				nombre: true,
				email: true,
				createdAt: true,
			},
		});

		if (!usuario) {
			return next(notFound("Usuario no encontrado"));
		}

		res.json(usuario);
	} catch (error) {
		next(error);
	}
};

const updateProfile = async (req, res, next) => {
	const { nombre, email } = req.body;

	try {
		const usuario = await prisma.usuarios.findUnique({
			where: { id: req.userId },
		});

		if (!usuario) {
			return next(notFound("Usuario no encontrado"));
		}

		if (email && email !== usuario.email) {
			const existingUser = await prisma.usuarios.findFirst({
				where: { email, estado: "activo" },
			});

			if (existingUser) {
				return next(conflict("Ya existe un usuario con este email"));
			}
		}

		const actualizado = await prisma.usuarios.update({
			where: { id: usuario.id },
			data: {
				...(nombre !== undefined && { nombre }),
				...(email !== undefined && { email }),
			},
		});

		res.json({
			id: actualizado.id,
			nombre: actualizado.nombre,
			email: actualizado.email,
		});
	} catch (error) {
		next(error);
	}
};

const changePassword = async (req, res, next) => {
	const { currentPassword, newPassword } = req.body;

	try {
		const usuario = await prisma.usuarios.findUnique({
			where: { id: req.userId },
		});

		if (!usuario) {
			return next(notFound("Usuario no encontrado"));
		}

		const isValidCurrentPassword = await bcrypt.compare(
			currentPassword,
			usuario.password,
		);

		if (!isValidCurrentPassword) {
			return next(unauthenticated("Contraseña actual incorrecta"));
		}

		const isSamePassword = await bcrypt.compare(
			newPassword,
			usuario.password,
		);

		if (isSamePassword) {
			return next(
				validationError(
					"La nueva contraseña debe ser diferente a la actual",
				),
			);
		}

		await prisma.usuarios.update({
			where: { id: usuario.id },
			data: { password: await bcrypt.hash(newPassword, 10) },
		});

		res.json({
			message: "Contraseña actualizada exitosamente",
		});
	} catch (error) {
		next(error);
	}
};

export default {
	register,
	login,
	validateToken,
	getProfile,
	updateProfile,
	changePassword,
};
