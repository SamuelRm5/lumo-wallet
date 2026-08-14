-- Migración del modelo de movimientos sueltos al de operaciones con asientos.
--
-- Las tres tablas anteriores se renombran en vez de borrarse: son la única
-- forma de reconstruir algo si aparece un error semanas después. Se borran con
-- una migración propia cuando la app nueva lleve un mes en uso.

SET @migrated_at = NOW(3);

-- ----------------------------------------------------------------------------
-- 1. Apartar el modelo anterior
-- ----------------------------------------------------------------------------
RENAME TABLE `usuarios` TO `usuarios_legacy`;
RENAME TABLE `cuentas` TO `cuentas_legacy`;
RENAME TABLE `movimientos` TO `movimientos_legacy`;

-- ----------------------------------------------------------------------------
-- 2. Crear el modelo nuevo
-- ----------------------------------------------------------------------------
-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `type` ENUM('source', 'cash', 'receivable', 'liability') NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'COP',
    `lastReconciledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `accounts_userId_deletedAt_idx`(`userId`, `deletedAt`),
    INDEX `accounts_userId_type_idx`(`userId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `icon` VARCHAR(60) NULL,
    `color` CHAR(7) NULL,
    `kind` ENUM('income', 'expense') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `categories_userId_kind_idx`(`userId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `kind` ENUM('income', 'expense', 'transfer', 'adjustment') NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `categoryId` INTEGER NULL,
    `date` DATETIME(3) NOT NULL,
    `description` VARCHAR(255) NULL,
    `status` ENUM('pending', 'confirmed') NOT NULL DEFAULT 'confirmed',
    `origin` ENUM('manual', 'recurring', 'reconciliation', 'legacy') NOT NULL DEFAULT 'manual',
    `recurringRuleId` INTEGER NULL,
    `scheduledDate` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `operations_userId_date_idx`(`userId`, `date`),
    INDEX `operations_userId_categoryId_date_idx`(`userId`, `categoryId`, `date`),
    INDEX `operations_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `operations_recurringRuleId_scheduledDate_key`(`recurringRuleId`, `scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operationId` INTEGER NOT NULL,
    `accountId` INTEGER NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,

    INDEX `entries_accountId_idx`(`accountId`),
    INDEX `entries_operationId_idx`(`operationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `kind` ENUM('income', 'expense', 'transfer') NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `categoryId` INTEGER NULL,
    `sourceAccountId` INTEGER NULL,
    `fromAccountId` INTEGER NULL,
    `toAccountId` INTEGER NULL,
    `frequency` ENUM('weekly', 'biweekly', 'monthly', 'yearly') NOT NULL,
    `dayOfMonth` INTEGER NULL,
    `dayOfWeek` INTEGER NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `mode` ENUM('auto', 'reminder') NOT NULL,
    `nextRunAt` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `recurring_rules_userId_nextRunAt_idx`(`userId`, `nextRunAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `expoPushToken` VARCHAR(255) NOT NULL,
    `platform` ENUM('android', 'ios') NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `devices_expoPushToken_key`(`expoPushToken`),
    INDEX `devices_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `deviceId` INTEGER NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `refresh_tokens_userId_idx`(`userId`),
    INDEX `refresh_tokens_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operations` ADD CONSTRAINT `operations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operations` ADD CONSTRAINT `operations_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operations` ADD CONSTRAINT `operations_recurringRuleId_fkey` FOREIGN KEY (`recurringRuleId`) REFERENCES `recurring_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entries` ADD CONSTRAINT `entries_operationId_fkey` FOREIGN KEY (`operationId`) REFERENCES `operations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entries` ADD CONSTRAINT `entries_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_rules` ADD CONSTRAINT `recurring_rules_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_rules` ADD CONSTRAINT `recurring_rules_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_rules` ADD CONSTRAINT `recurring_rules_sourceAccountId_fkey` FOREIGN KEY (`sourceAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_rules` ADD CONSTRAINT `recurring_rules_fromAccountId_fkey` FOREIGN KEY (`fromAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_rules` ADD CONSTRAINT `recurring_rules_toAccountId_fkey` FOREIGN KEY (`toAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `devices` ADD CONSTRAINT `devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- ----------------------------------------------------------------------------
-- 3. Restricción que Prisma no genera desde el esquema
-- ----------------------------------------------------------------------------
-- El monto de la operación es el que escribe y ve el usuario, y siempre es
-- positivo. entries.amount NO lleva CHECK: va firmado y ser negativo es normal.
ALTER TABLE `operations`
  ADD CONSTRAINT `chk_operations_amount_positive` CHECK (`amount` > 0);

-- ----------------------------------------------------------------------------
-- 4. Copiar los datos
-- ----------------------------------------------------------------------------
-- Los ids se conservan para que el histórico siga siendo rastreable.
-- No se guardó nunca la fecha real de baja, así que las filas inactivas llevan
-- todas la marca de tiempo de esta migración.
INSERT INTO `users` (`id`, `name`, `email`, `password`, `status`, `createdAt`, `updatedAt`)
SELECT `id`, `nombre`, `email`, `password`,
       CASE WHEN `estado` = 'activo' THEN 'active' ELSE 'disabled' END,
       `createdAt`, `createdAt`
FROM `usuarios_legacy`;

-- normal -> cash, fuente -> source, deuda -> receivable.
-- deuda son cuentas por cobrar: plata que a ti te deben. Ver BACKEND.md 11.1
INSERT INTO `accounts` (`id`, `userId`, `name`, `description`, `type`, `currency`, `lastReconciledAt`, `createdAt`, `updatedAt`, `deletedAt`)
SELECT `id`, `usuarioId`, `nombre`, `descripcion`,
       CASE `tipo`
         WHEN 'normal' THEN 'cash'
         WHEN 'fuente' THEN 'source'
         WHEN 'deuda'  THEN 'receivable'
       END,
       'COP', NULL, `createdAt`, `createdAt`,
       CASE WHEN `estado` = 'inactivo' THEN @migrated_at ELSE NULL END
FROM `cuentas_legacy`;

-- Cada movimiento entra como una operación de un solo asiento, marcada legacy.
-- No cumplen el invariante de los dos asientos y es deliberado: se verifica al
-- escribir, nunca al leer.
INSERT INTO `operations` (`id`, `userId`, `kind`, `amount`, `categoryId`, `date`, `description`, `status`, `origin`, `recurringRuleId`, `scheduledDate`, `createdAt`, `updatedAt`, `deletedAt`)
SELECT m.`id`, c.`usuarioId`,
       CASE m.`tipo` WHEN 'ingreso' THEN 'income' ELSE 'expense' END,
       m.`monto`, NULL, m.`createdAt`, m.`descripcion`, 'confirmed', 'legacy', NULL, NULL,
       m.`createdAt`, m.`createdAt`,
       CASE WHEN m.`estado` = 'inactivo' THEN @migrated_at ELSE NULL END
FROM `movimientos_legacy` m
JOIN `cuentas_legacy` c ON c.`id` = m.`cuentaId`;

-- El signo del asiento. En las cuentas por cobrar va invertido respecto al
-- modelo viejo: allí un egreso significaba "le presté más" y un ingreso "me
-- abonó", así que el saldo almacenado era el negativo de lo que le deben a uno.
-- Ver BACKEND.md 11.1
INSERT INTO `entries` (`operationId`, `accountId`, `amount`)
SELECT m.`id`, m.`cuentaId`,
       CASE
         WHEN c.`tipo` = 'deuda' AND m.`tipo` = 'ingreso' THEN -m.`monto`
         WHEN c.`tipo` = 'deuda' AND m.`tipo` = 'egreso'  THEN  m.`monto`
         WHEN m.`tipo` = 'ingreso'                        THEN  m.`monto`
         ELSE -m.`monto`
       END
FROM `movimientos_legacy` m
JOIN `cuentas_legacy` c ON c.`id` = m.`cuentaId`;

-- ----------------------------------------------------------------------------
-- 5. Catálogo inicial de categorías para los usuarios que ya existen
-- ----------------------------------------------------------------------------
INSERT INTO `categories` (`userId`, `name`, `icon`, `kind`, `createdAt`, `updatedAt`)
SELECT u.`id`, s.`name`, s.`icon`, s.`kind`, @migrated_at, @migrated_at
FROM `users` u
CROSS JOIN (
            SELECT 'Comida'     AS `name`, 'food'       AS `icon`, 'expense' AS `kind`
  UNION ALL SELECT 'Transporte',           'transport',           'expense'
  UNION ALL SELECT 'Servicios',            'utilities',           'expense'
  UNION ALL SELECT 'Salud',                'health',              'expense'
  UNION ALL SELECT 'Hogar',                'home',                'expense'
  UNION ALL SELECT 'Ocio',                 'leisure',             'expense'
  UNION ALL SELECT 'Educación',            'education',           'expense'
  UNION ALL SELECT 'Otros',                'other',               'expense'
  UNION ALL SELECT 'Salario',              'salary',              'income'
  UNION ALL SELECT 'Freelance',            'freelance',           'income'
  UNION ALL SELECT 'Ventas',               'sales',               'income'
  UNION ALL SELECT 'Regalos',              'gift',                'income'
  UNION ALL SELECT 'Otros',                'other',               'income'
) s;
