#!/usr/bin/env sh
# Restaura el ultimo respaldo en una base aparte y compara los conteos con el
# origen. Un respaldo que nunca se ha restaurado no es un respaldo.
#
#   ./scripts/restore-check.sh
#   ./scripts/restore-check.sh backups/lumo-wallet-20260814-030000.sql.gz

set -eu

cd "$(dirname "$0")/.."

. "$(dirname "$0")/db-url.sh"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
FILE="${1:-$(ls -1t "$BACKUP_DIR"/${DB_NAME}-*.sql.gz 2>/dev/null | head -1)}"

if [ -z "${FILE:-}" ] || [ ! -f "$FILE" ]; then
	echo "No hay ningun respaldo que restaurar en $BACKUP_DIR" >&2
	exit 1
fi

SCRATCH="${DB_NAME}_restore_check"

ejecutar() {
	MYSQL_PWD="$DB_PASSWORD" "$MYSQL_BIN" \
		--host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
		--default-character-set=utf8mb4 "$@"
}

contar() {
	ejecutar --skip-column-names --batch "$1" -e "
		SELECT CONCAT(
			(SELECT COUNT(*) FROM users), '/',
			(SELECT COUNT(*) FROM accounts), '/',
			(SELECT COUNT(*) FROM operations), '/',
			(SELECT COUNT(*) FROM entries));"
}

echo "Restaurando $FILE en $SCRATCH"

ejecutar -e "DROP DATABASE IF EXISTS \`$SCRATCH\`;
	CREATE DATABASE \`$SCRATCH\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"

gzip -dc "$FILE" | ejecutar "$SCRATCH"

ORIGEN="$(contar "$DB_NAME")"
COPIA="$(contar "$SCRATCH")"

ejecutar -e "DROP DATABASE \`$SCRATCH\`;"

echo "usuarios/cuentas/operaciones/asientos"
echo "  origen: $ORIGEN"
echo "  copia:  $COPIA"

if [ "$ORIGEN" != "$COPIA" ]; then
	echo "La restauracion no coincide con el origen" >&2
	exit 1
fi

echo "Restauracion verificada"
