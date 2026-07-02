#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-aac-bi}"
COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.proxmox.yml)

cd "$ROOT"

compose() {
  docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" "$@"
}

require_env() {
  local missing=0
  for name in DB_USER DB_PASSWORD SHOPIFY_SHOP_URL SHOPIFY_ACCESS_TOKEN; do
    if [[ -z "${!name:-}" ]]; then
      echo "Missing required env var: $name" >&2
      missing=1
    fi
  done
  if [[ "$missing" -ne 0 ]]; then
    exit 1
  fi
}

load_env() {
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
}

deploy() {
  require_env
  mkdir -p \
    "${DROPBOX_SYNC_DIR:-/srv/aac-bi/dropbox/Dropbox/quickbooks-csv}" \
    "${RCLONE_CONFIG_DIR:-/srv/aac-bi/rclone}" \
    "${CRON_LOG_DIR:-/srv/aac-bi/logs/importer}" \
    "${BACKUP_DIR:-/srv/aac-bi/backups}"
  compose up -d --build
}

backup_db() {
  require_env
  mkdir -p "${BACKUP_DIR:-/srv/aac-bi/backups}"
  local stamp
  stamp="$(date +%Y%m%d_%H%M%S)"
  compose exec -T postgres pg_dump -U "$DB_USER" -d yourdb > "${BACKUP_DIR:-/srv/aac-bi/backups}/yourdb_${stamp}.sql"
  echo "${BACKUP_DIR:-/srv/aac-bi/backups}/yourdb_${stamp}.sql"
}

status() {
  compose ps
  echo
  compose logs --tail=80 importer
  echo
  compose exec -T postgres psql -U "${DB_USER:-postgres}" -d yourdb -c \
    "select min(order_date) as min_order_date, max(order_date) as max_order_date, count(*) as orders from analytics_mart.fct_orders;" \
    || true
}

load_env

case "${1:-deploy}" in
  deploy)
    deploy
    ;;
  up)
    require_env
    compose up -d
    ;;
  down)
    compose down
    ;;
  logs)
    if [[ -n "${2:-}" ]]; then
      compose logs -f "$2"
    else
      compose logs -f
    fi
    ;;
  ps|status)
    status
    ;;
  seed)
    require_env
    compose exec importer /app/entrypoint.sh seed
    ;;
  incremental)
    require_env
    compose exec importer /app/entrypoint.sh incremental
    ;;
  test)
    require_env
    compose exec importer /app/entrypoint.sh test
    ;;
  backup-db)
    backup_db
    ;;
  *)
    echo "Usage: $0 {deploy|up|down|logs [service]|ps|status|seed|incremental|test|backup-db}" >&2
    exit 2
    ;;
esac
