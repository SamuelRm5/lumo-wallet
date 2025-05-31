import { Model, DataTypes } from "sequelize";

export default function (sequelize) {
	class Cuentas extends Model {}

	Cuentas.init(
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
			descripcion: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			tipo: {
				type: DataTypes.ENUM("normal", "deuda", "fuente"),
				allowNull: false,
				defaultValue: "deuda",
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
			modelName: "cuenta",
			tableName: "cuentas",
		},
	);

	return Cuentas;
}
