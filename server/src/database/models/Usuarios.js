import { Model, DataTypes } from "sequelize";

export default function (sequelize) {
	class Usuarios extends Model {}

	Usuarios.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			nombre: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			email: {
				type: DataTypes.STRING(255),
				allowNull: false,
				unique: true,
				validate: {
					isEmail: true,
				},
			},
			password: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			createdAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},
			estado: {
				type: DataTypes.ENUM("activo", "inactivo"),
				allowNull: false,
				defaultValue: "activo",
			},
		},
		{
			sequelize,
			modelName: "usuario",
			tableName: "usuarios",
		},
	);

	return Usuarios;
}
