import loadModels from "../database/models/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { Usuarios } = await loadModels();

const register = async (req, res) => {
	const { nombre, email, password } = req.body;

	try {
		// Validar que no exista el usuario
		const existingUser = await Usuarios.findOne({
			where: { email, estado: "activo" },
		});

		if (existingUser) {
			return res.status(400).json({
				error: "Ya existe un usuario con este email",
			});
		}

		// Hash de la contraseña
		const hashedPassword = await bcrypt.hash(password, 10);

		// Crear usuario
		const usuario = await Usuarios.create({
			nombre,
			email,
			password: hashedPassword,
		});

		// Generar JWT
		const token = jwt.sign(
			{
				userId: usuario.id,
				email: usuario.email,
			},
			process.env.JWT_SECRET,
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
		console.error("Error en register:", error);
		res.status(500).json({
			error: "Error interno del servidor",
		});
	}
};

const login = async (req, res) => {
	const { email, password } = req.body;

	try {
		// Buscar usuario activo
		const usuario = await Usuarios.findOne({
			where: { email, estado: "activo" },
		});

		if (!usuario) {
			return res.status(401).json({
				error: "Credenciales inválidas",
			});
		}

		// Verificar contraseña
		const isValidPassword = await bcrypt.compare(
			password,
			usuario.password,
		);

		if (!isValidPassword) {
			return res.status(401).json({
				error: "Credenciales inválidas",
			});
		}

		// Generar JWT
		const token = jwt.sign(
			{
				userId: usuario.id,
				email: usuario.email,
			},
			process.env.JWT_SECRET,
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
		console.error("Error en login:", error);
		res.status(500).json({
			error: "Error interno del servidor",
		});
	}
};

const validateToken = async (req, res) => {
	try {
		// El middleware ya validó el token y estableció req.userId
		const usuario = await Usuarios.findByPk(req.userId, {
			attributes: ["id", "nombre", "email", "estado"], // Excluir password
		});

		console.log("Usuario validado:", usuario, req.userId);

		if (!usuario || usuario.estado !== "activo") {
			return res.status(401).json({
				error: "Usuario no válido",
			});
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
		console.error("Error en validateToken:", error);
		res.status(401).json({
			error: "Token inválido",
		});
	}
};

const getProfile = async (req, res) => {
	try {
		const usuario = await Usuarios.findByPk(req.userId, {
			attributes: ["id", "nombre", "email", "createdAt"],
		});

		if (!usuario) {
			return res.status(404).json({
				error: "Usuario no encontrado",
			});
		}

		res.json(usuario);
	} catch (error) {
		console.error("Error en getProfile:", error);
		res.status(500).json({
			error: "Error interno del servidor",
		});
	}
};

const updateProfile = async (req, res) => {
	const { nombre, email } = req.body;

	try {
		const usuario = await Usuarios.findByPk(req.userId);

		if (!usuario) {
			return res.status(404).json({
				error: "Usuario no encontrado",
			});
		}

		// Verificar si el email ya existe (si cambió)
		if (email && email !== usuario.email) {
			const existingUser = await Usuarios.findOne({
				where: { email, estado: "activo" },
			});

			if (existingUser) {
				return res.status(400).json({
					error: "Ya existe un usuario con este email",
				});
			}
		}

		// Actualizar datos
		usuario.nombre = nombre || usuario.nombre;
		usuario.email = email || usuario.email;

		await usuario.save();

		res.json({
			id: usuario.id,
			nombre: usuario.nombre,
			email: usuario.email,
		});
	} catch (error) {
		console.error("Error en updateProfile:", error);
		res.status(500).json({
			error: "Error interno del servidor",
		});
	}
};

const changePassword = async (req, res) => {
	const { currentPassword, newPassword } = req.body;

	try {
		// Validar campos requeridos
		if (!currentPassword || !newPassword) {
			return res.status(400).json({
				error: "Contraseña actual y nueva contraseña son requeridas",
			});
		}

		// Validar longitud mínima
		if (newPassword.length < 6) {
			return res.status(400).json({
				error: "La nueva contraseña debe tener al menos 6 caracteres",
			});
		}

		// Buscar usuario
		const usuario = await Usuarios.findByPk(req.userId);

		if (!usuario) {
			return res.status(404).json({
				error: "Usuario no encontrado",
			});
		}

		// Verificar contraseña actual
		const isValidCurrentPassword = await bcrypt.compare(
			currentPassword,
			usuario.password,
		);

		if (!isValidCurrentPassword) {
			return res.status(401).json({
				error: "Contraseña actual incorrecta",
			});
		}

		// Verificar que la nueva contraseña sea diferente
		const isSamePassword = await bcrypt.compare(
			newPassword,
			usuario.password,
		);

		if (isSamePassword) {
			return res.status(400).json({
				error: "La nueva contraseña debe ser diferente a la actual",
			});
		}

		// Hash de la nueva contraseña
		const hashedNewPassword = await bcrypt.hash(newPassword, 10);

		// Actualizar contraseña
		usuario.password = hashedNewPassword;
		await usuario.save();

		res.json({
			message: "Contraseña actualizada exitosamente",
		});
	} catch (error) {
		console.error("Error en changePassword:", error);
		res.status(500).json({
			error: "Error interno del servidor",
		});
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
