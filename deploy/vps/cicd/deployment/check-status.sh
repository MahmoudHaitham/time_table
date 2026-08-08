#!/bin/bash

echo "=========================================="
echo "🔍 Timetable System Status"
echo "=========================================="

APP_DIR="${APP_DIR:-$HOME/portfolio}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

cd "$APP_DIR" 2>/dev/null || { echo "❌ Cannot cd to $APP_DIR"; exit 1; }

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-timetable_admin}"
POSTGRES_DB="${POSTGRES_DB:-timetable_db}"

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

echo ""
echo "📦 Docker Containers:"
echo "---"
compose ps

echo ""
echo "🗄️  Database Health:"
echo "---"
if docker inspect --format='{{.State.Health.Status}}' portfolio-db >/dev/null 2>&1; then
  echo "Container: $(docker inspect --format='{{.State.Health.Status}}' portfolio-db)"
  compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
    "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" \
    2>/dev/null || echo "Could not query database"
else
  echo "portfolio-db container not found"
fi

echo ""
echo "🌐 Caddy Status:"
echo "---"
sudo systemctl status caddy --no-pager 2>/dev/null | grep Active || echo "Caddy not installed or not running"

echo ""
echo "📋 Recent Logs (last 15 lines):"
echo "---"
compose logs --tail=15

echo ""
echo "=========================================="
echo "✅ Status check complete!"
echo "=========================================="
