export const applyAssociations = sequelize => {
	const { Usuarios, Cuentas, Movimientos } = sequelize;

	// Relación Usuario -> Cuentas
	Usuarios.hasMany(Cuentas, {
		foreignKey: "usuarioId",
		as: "cuentas",
		onDelete: "CASCADE",
	});

	Cuentas.belongsTo(Usuarios, {
		foreignKey: "usuarioId",
		as: "usuario",
		onDelete: "CASCADE",
	});

	// Relación Cuenta -> Movimientos (existente)
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
