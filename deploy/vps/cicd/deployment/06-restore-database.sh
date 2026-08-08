#!/bin/bash
# One-time import of terms.sql into VPS PostgreSQL container.
set -e

APP_DIR="${APP_DIR:-$HOME/portfolio}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SQL_FILE="${SQL_FILE:-$APP_DIR/terms.sql}"

POSTGRES_USER="${POSTGRES_USER:-timetable_admin}"
POSTGRES_DB="${POSTGRES_DB:-timetable_db}"

echo "=========================================="
echo "🗄️  Timetable — Database Restore"
echo "=========================================="

cd "$APP_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ $COMPOSE_FILE not found in $APP_DIR"
  exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL dump not found: $SQL_FILE"
  echo "Upload terms.sql to $APP_DIR first."
  exit 1
fi

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

echo "Starting database container..."
compose up -d db

echo "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ PostgreSQL did not become ready in time"
    compose logs db --tail=30
    exit 1
  fi
  sleep 2
done

TABLE_COUNT=$(compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" \
  | tr -d '[:space:]')

if [ "${TABLE_COUNT:-0}" != "0" ] && [ "${FORCE_RESTORE:-0}" != "1" ]; then
  echo ""
  echo "⚠️  Database already has $TABLE_COUNT table(s)."
  echo "Skipping restore. To force: FORCE_RESTORE=1 bash cicd/deployment/06-restore-database.sh"
  exit 0
fi

echo "Importing $SQL_FILE (may take 1-2 minutes)..."
cat "$SQL_FILE" | compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo ""
echo "Verifying tables..."
compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"

echo ""
echo "Row counts:"
compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT 'terms' AS tbl, count(*) FROM terms
   UNION ALL SELECT 'users', count(*) FROM users
   UNION ALL SELECT 'sessions', count(*) FROM sessions;"

echo ""
echo "✅ Database restore complete!"
echo "Next: bash cicd/deployment/05-deploy-app.sh"
