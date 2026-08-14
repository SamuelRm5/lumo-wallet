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
			usuarioId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: {
					model: "usuarios",
					key: "id",
				},
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
			// ÍNDICES DE RENDIMIENTO OPTIMIZADOS
			indexes: [
				{
					// Índice compuesto crítico para consultas por usuario
					name: "idx_cuentas_usuario_estado",
					fields: ["usuarioId", "estado"],
					using: "BTREE",
					comment:
						"Optimiza queries principales de cuentas por usuario",
				},
				{
					// Índice para filtros por tipo de cuenta
					name: "idx_cuentas_tipo",
					fields: ["tipo"],
					using: "BTREE",
					comment: "Filtros por normal/deuda/fuente",
				},
				{
					// Índice temporal para ordenamientos
					name: "idx_cuentas_fecha",
					fields: ["createdAt"],
					using: "BTREE",
					comment: "Ordenamiento temporal de cuentas",
				},
				{
					// Índice para búsquedas de texto en nombres
					name: "idx_cuentas_nombre",
					fields: [
						{
							name: "nombre",
							length: 20, // Índice parcial
						},
					],
					using: "BTREE",
					comment: "Búsquedas por nombre de cuenta",
				},
			],
		},
	);

	return Cuentas;
}
