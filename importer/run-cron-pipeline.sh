#!/bin/bash

set -euo pipefail

cron_env_file="${CRON_ENV_FILE:-/run/importer-cron.env}"

if [ ! -r "$cron_env_file" ]; then
    echo "$(date): Cron environment file is missing or unreadable: $cron_env_file" >&2
    exit 1
fi

# Cron starts jobs with a minimal environment. The importer entrypoint writes
# the required container variables here before starting the cron daemon.
source "$cron_env_file"

required_variables=(
    DATABASE_URL
    DB_USER
    DB_PASSWORD
    DROPBOX_PATH
    DBT_TARGET
    SHOPIFY_SHOP_URL
    SHOPIFY_ACCESS_TOKEN
)

for variable_name in "${required_variables[@]}"; do
    if [ -z "${!variable_name:-}" ]; then
        echo "$(date): Required cron environment variable is missing: $variable_name" >&2
        exit 1
    fi
done

if [ "${1:-}" = "--check-environment" ]; then
    echo "Cron environment is ready."
    exit 0
fi

exec /app/entrypoint.sh incremental
