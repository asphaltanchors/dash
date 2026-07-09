# Proxmox Deployment

This deployment is intentionally small: Docker Compose runs Postgres, the dashboard,
the importer cron container, and an rclone Dropbox sync sidecar.

## VM layout

- App checkout: `/srv/aac-bi/app`
- Dropbox sync: `/srv/aac-bi/dropbox/Dropbox/quickbooks-csv`
- rclone config: `/srv/aac-bi/rclone`
- Importer cron logs: `/srv/aac-bi/logs/importer`
- Database backups: `/srv/aac-bi/backups`

## Required `.env`

Create `/srv/aac-bi/app/.env`:

```bash
DB_USER=postgres
DB_PASSWORD=replace-me
SHOPIFY_SHOP_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=replace-me

# Bind dashboard to the Tailscale IP for private access.
DASHBOARD_BIND=100.114.85.125
POSTGRES_BIND=127.0.0.1

RCLONE_REMOTE=dropbox:quickbooks-csv
RCLONE_SYNC_INTERVAL_SECONDS=900
TZ=America/Los_Angeles
```

## Dropbox auth

Configure the Dropbox remote once on the VM:

```bash
docker run --rm -it \
  -v /srv/aac-bi/rclone:/config/rclone \
  rclone/rclone:latest config
```

Create a remote named `dropbox`. The compose sidecar syncs
`dropbox:quickbooks-csv` into the importer path. The synced folder must contain
`seed/` and `input/`.

## Commands

Run from `/srv/aac-bi/app`:

```bash
ops/deploy.sh deploy       # git pull, rebuild/start, dbt run, dashboard health check
ops/deploy.sh status       # containers, importer logs, order freshness
ops/deploy.sh seed         # one-time historical load
ops/deploy.sh incremental  # manual daily load
ops/deploy.sh test         # dbt tests
ops/deploy.sh backup-db    # pg_dump to /srv/aac-bi/backups
ops/deploy.sh logs importer
```

`deploy` stops immediately if the pull, container rebuild, dbt run, or dashboard
check fails. The dashboard check probes `http://${DASHBOARD_BIND}:3000/` from the
VM (using `127.0.0.1` when the bind address is unset or listens on all interfaces).
Set `DASHBOARD_HEALTH_URL` in `.env` to override the probe URL.

After a VM reboot, Docker restart policies should bring the stack back.
