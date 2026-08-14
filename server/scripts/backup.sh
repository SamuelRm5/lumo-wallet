#!/usr/bin/env sh
# Volcado comprimido de la base, con retencion. Lee DATABASE_URL de server/.env
# salvo que ya venga en el entorno.
#
#   ./scripts/backup.sh
#   BACKUP_DIR=/var/backups/lumo RETENTION_DAYS=30 ./scripts/backup.sh
#
# En el servidor, una vez al dia:
#   0 3 * * * cd /srv/lumo/server && ./scripts/backup.sh >> /var/log/lumo-backup.log 2>&1

set -eu

cd "$(dirname "$0")/.."

. "$(dirname "$0")/db-url.sh"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# --single-transaction toma el volcado sin bloquear escrituras: en InnoDB es
# consistente y la aplicacion sigue respondiendo mientras corre
MYSQL_PWD="$DB_PASSWORD" "$MYSQLDUMP_BIN" \
	--host="$DB_HOST" \
	--port="$DB_PORT" \
	--user="$DB_USER" \
	--single-transaction \
	--routines \
	--triggers \
	--default-character-set=utf8mb4 \
	"$DB_NAME" | gzip > "$FILE"

# Un volcado que no se puede descomprimir no es un respaldo: se comprueba antes
# de borrar los anteriores
gzip -t "$FILE"

echo "Respaldo escrito en $FILE ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -type f -mtime "+$RETENTION_DAYS" -print -delete
