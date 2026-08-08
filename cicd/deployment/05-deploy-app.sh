#!/bin/bash
set -e

echo "📦 Deploying Timetable application..."

APP_DIR="${APP_DIR:-$HOME/portfolio}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

cd "$APP_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ Error: $COMPOSE_FILE not found in $APP_DIR"
  exit 1
fi

if [ ! -f .env ] && [ -f deploy/vps/root.env.template ]; then
  echo "⚠️  Root .env missing — copy deploy/vps/root.env.template to .env for Postgres credentials."
fi

if [ ! -f backend/.env ]; then
  echo "❌ Error: backend/.env not found!"
  echo "Copy deploy/vps/backend.env.template to backend/.env and fill in values."
  exit 1
fi

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

echo "Pulling latest images..."
compose pull backend frontend

echo "Starting database..."
compose up -d db

echo "Waiting for database to be healthy..."
for i in $(seq 1 30); do
  DB_STATUS=$(docker inspect --format='{{.State.Health.Status}}' portfolio-db 2>/dev/null || echo "missing")
  if [ "$DB_STATUS" = "healthy" ]; then
    echo "✅ Database is healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ Database did not become healthy in time"
    compose logs db --tail=30
    exit 1
  fi
  sleep 2
done

POSTGRES_USER="${POSTGRES_USER:-timetable_admin}"
POSTGRES_DB="${POSTGRES_DB:-timetable_db}"

TABLE_COUNT=$(compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" \
  2>/dev/null | tr -d '[:space:]' || echo "0")

if [ "${TABLE_COUNT:-0}" = "0" ]; then
  echo ""
  echo "⚠️  Database is empty (no tables found)."
  echo "Run the one-time restore before using the app:"
  echo "  1. Upload terms.sql to $APP_DIR"
  echo "  2. bash cicd/deployment/06-restore-database.sh"
  echo ""
fi

echo "Starting all services..."
compose up -d

echo ""
echo "✅ Application deployed!"
echo ""
compose ps

echo ""
echo "📋 View logs: docker compose -f $COMPOSE_FILE logs -f"
echo "📋 Check status: bash cicd/deployment/check-status.sh"
