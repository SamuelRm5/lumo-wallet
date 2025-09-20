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
			// 🚀 ÍNDICES DE RENDIMIENTO OPTIMIZADOS
			indexes: [
				{
					// Índice compuesto crítico para consultas principales
					name: "idx_movimientos_cuenta_estado",
					fields: ["cuentaId", "estado"],
					using: "BTREE",
					comment:
						"Optimiza queries de cálculo de totales por cuenta",
				},
				{
					// Índice para filtros por tipo de movimiento
					name: "idx_movimientos_tipo",
					fields: ["tipo"],
					using: "BTREE",
					comment: "Filtros por ingreso/egreso",
				},
				{
					// Índice temporal para ordenamientos y analytics
					name: "idx_movimientos_fecha",
					fields: ["createdAt"],
					using: "BTREE",
					comment: "Ordenamientos temporales y filtros por fecha",
				},
				{
					// Índice compuesto para analytics y reportes avanzados
					name: "idx_movimientos_analytics",
					fields: ["cuentaId", "createdAt", "tipo", "estado"],
					using: "BTREE",
					comment: "Optimización para gráficos y reportes temporales",
				},
				{
					// 📅 NUEVO: Índice optimizado para rangos de fechas
					name: "idx_movimientos_fecha_rango",
					fields: ["cuentaId", "createdAt", "estado"],
					using: "BTREE",
					comment:
						"Optimizado para búsquedas por rango de fechas específico por cuenta",
				},
			],
		},
	);

	return Movimientos;
}
