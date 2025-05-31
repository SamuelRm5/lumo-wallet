export const applyAssociations = sequelize => {
	const { Cuentas, Movimientos } = sequelize;

	Cuentas.hasMany(Movimientos, {
		foreignKey: "cuentaId",
		as: "movimientos",
		onDelete: "CASCADE",
	});

	Movimientos.belongsTo(Cuentas, {
		foreignKey: "cuentaId",
		as: "cuenta",
		onDelete: "CASCADE",
	});
};
