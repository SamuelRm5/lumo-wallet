# Descompone DATABASE_URL en las piezas que piden mysql y mysqldump. Se incluye
# desde los demas scripts con `.`, no se ejecuta suelto.

if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
	DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' .env | tr -d '"' | tr -d "'" | tr -d '\r')"
fi

if [ -z "${DATABASE_URL:-}" ]; then
	echo "DATABASE_URL no esta definida ni en el entorno ni en server/.env" >&2
	exit 1
fi

# mysql://usuario:password@host:puerto/base
SIN_ESQUEMA="${DATABASE_URL#*://}"
CREDENCIALES="${SIN_ESQUEMA%%@*}"
SERVIDOR="${SIN_ESQUEMA#*@}"

DB_USER="${CREDENCIALES%%:*}"
DB_PASSWORD="${CREDENCIALES#*:}"
DB_HOST="${SERVIDOR%%[:/]*}"
DB_NAME="${SERVIDOR#*/}"
DB_NAME="${DB_NAME%%\?*}"

PUERTO="${SERVIDOR#*:}"
DB_PORT="${PUERTO%%/*}"
[ "$DB_PORT" = "$SERVIDOR" ] && DB_PORT=3306

# En Windows los binarios de MySQL no estan en el PATH; en el servidor si
MYSQL_BIN_DIR="${MYSQL_BIN_DIR:-}"
if [ -n "$MYSQL_BIN_DIR" ]; then
	MYSQL_BIN="$MYSQL_BIN_DIR/mysql"
	MYSQLDUMP_BIN="$MYSQL_BIN_DIR/mysqldump"
else
	MYSQL_BIN="${MYSQL_BIN:-mysql}"
	MYSQLDUMP_BIN="${MYSQLDUMP_BIN:-mysqldump}"
fi

export DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME MYSQL_BIN MYSQLDUMP_BIN
