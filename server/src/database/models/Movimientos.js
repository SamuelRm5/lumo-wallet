import { Model, DataTypes } from "sequelize";

export default function (sequelize) {
	class Movimientos extends Model {}

	Movimientos.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			cuentaId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: {
					model: "cuentas", // Nombre de la tabla referenciada
					key: "id", // Clave primaria de la tabla referenciada
				},
			},
			tipo: {
				type: DataTypes.ENUM("ingreso", "egreso"),
				allowNull: false,
				defaultValue: "ingreso",
			},
			monto: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			descripcion: {
				type: DataTypes.STRING(255),
				allowNull: true,
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
			modelName: "movimiento",
			tableName: "movimientos",
		},
	);

	return Movimientos;
}
