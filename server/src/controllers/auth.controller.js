import loadModels from "../database/models/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
	conflict,
	notFound,
	unauthenticated,
	validationError,
} from "../lib/errors.js";
import env from "../config/env.js";

const { Usuarios } = await loadModels();

const register = async (req, res, next) => {
	const { nombre, email, password } = req.body;

	try {
		const existingUser = await Usuarios.findOne({
			where: { email, estado: "activo" },
		});

		if (existingUser) {
			return next(conflict("Ya existe un usuario con este email"));
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const usuario = await Usuarios.create({
			nombre,
			email,
			password: hashedPassword,
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
		const usuario = await Usuarios.findOne({
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
		const usuario = await Usuarios.findByPk(req.userId, {
			attributes: ["id", "nombre", "email", "estado"],
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
		const usuario = await Usuarios.findByPk(req.userId, {
			attributes: ["id", "nombre", "email", "createdAt"],
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
		const usuario = await Usuarios.findByPk(req.userId);

		if (!usuario) {
			return next(notFound("Usuario no encontrado"));
		}

		if (email && email !== usuario.email) {
			const existingUser = await Usuarios.findOne({
				where: { email, estado: "activo" },
			});

			if (existingUser) {
				return next(conflict("Ya existe un usuario con este email"));
			}
		}

		usuario.nombre = nombre || usuario.nombre;
		usuario.email = email || usuario.email;

		await usuario.save();

		res.json({
			id: usuario.id,
			nombre: usuario.nombre,
			email: usuario.email,
		});
	} catch (error) {
		next(error);
	}
};

const changePassword = async (req, res, next) => {
	const { currentPassword, newPassword } = req.body;

	try {
		if (!currentPassword || !newPassword) {
			return next(
				validationError(
					"Contraseña actual y nueva contraseña son requeridas",
				),
			);
		}

		if (newPassword.length < 6) {
			return next(
				validationError(
					"La nueva contraseña debe tener al menos 6 caracteres",
				),
			);
		}

		const usuario = await Usuarios.findByPk(req.userId);

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

		usuario.password = await bcrypt.hash(newPassword, 10);
		await usuario.save();

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
