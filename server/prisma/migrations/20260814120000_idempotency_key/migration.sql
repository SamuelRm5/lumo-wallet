-- Clave de idempotencia para POST /operations. En red móvil un POST puede
-- expirar por timeout habiéndose aplicado, y sin esto el reintento duplica la
-- operación.
--
-- El índice es único por usuario y admite varios NULL: en MySQL un índice
-- único no considera iguales dos filas con NULL, así que las operaciones sin
-- clave no chocan entre sí.
ALTER TABLE `operations` ADD COLUMN `idempotencyKey` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `operations_userId_idempotencyKey_key`
  ON `operations`(`userId`, `idempotencyKey`);
