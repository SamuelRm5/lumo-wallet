-- CreateTable
CREATE TABLE `cuentas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `tipo` ENUM('normal', 'deuda', 'fuente') NOT NULL DEFAULT 'deuda',
    `createdAt` DATETIME(0) NOT NULL,
    `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',

    INDEX `idx_cuentas_fecha`(`createdAt`),
    INDEX `idx_cuentas_nombre`(`nombre`(20)),
    INDEX `idx_cuentas_tipo`(`tipo`),
    INDEX `idx_cuentas_usuario_estado`(`usuarioId`, `estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cuentaId` INTEGER NOT NULL,
    `tipo` ENUM('ingreso', 'egreso') NOT NULL DEFAULT 'ingreso',
    `monto` INTEGER NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `createdAt` DATETIME(0) NOT NULL,
    `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',

    INDEX `idx_movimientos_analytics`(`cuentaId`, `createdAt`, `tipo`, `estado`),
    INDEX `idx_movimientos_cuenta_estado`(`cuentaId`, `estado`),
    INDEX `idx_movimientos_fecha`(`createdAt`),
    INDEX `idx_movimientos_fecha_rango`(`cuentaId`, `createdAt`, `estado`),
    INDEX `idx_movimientos_tipo`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL,
    `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cuentas` ADD CONSTRAINT `cuentas_ibfk_1` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`cuentaId`) REFERENCES `cuentas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

