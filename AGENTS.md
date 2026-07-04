# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo Business Intelligence system orchestrated via Docker Compose:

1. **Dashboard** (`dashboard/`): Next.js 15 analytics dashboard for e-commerce BI
2. **Importer** (`importer/`): Multi-source data pipeline combining DLT extraction + DBT transformations
3. **PostgreSQL**: Shared database backend with analytics schema

The system processes data from QuickBooks and Shopify sources, transforms it through a DBT pipeline, and serves it via a modern dashboard interface.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Dropbox    │─────▶│   Importer   │─────▶│  PostgreSQL │
│  (Sources)  │      │  DLT + DBT   │      │  (analytics)│
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │  Dashboard  │
                                            │  Next.js 15 │
                                            └─────────────┘
```

### Data Flow
1. **Source Data**: QuickBooks XLSX exports and Shopify API data in Dropbox sync folder
2. **DLT Extraction**: Loads raw data into PostgreSQL `raw` schema
3. **DBT Transformations**: Processes through staging → intermediate → mart layers
4. **Dashboard Consumption**: Next.js app queries `fct_*` tables for analytics

### Repository Structure
- `dashboard/` - Next.js dashboard
- `importer/` - DLT + DBT data pipeline
- `data/` - local development data mount
- `ops/` - deployment and operations scripts
- `docs/` - deployment and operational documentation
- `importer/AGENTS.md` contains detailed importer-specific guidance

## Docker Compose Services

The system runs as three containerized services:

```yaml
services:
  postgres:      # PostgreSQL 16 database
  importer:      # Data pipeline (cron job in prod, manual in dev)
  dashboard:     # Next.js dashboard (port 3000)
```

### Environment Configuration

The project uses docker-compose override files for dev/prod separation:

- **`docker-compose.yml`**: Base configuration (shared)
- **`docker-compose.override.yml`**: Development mode (auto-loaded, has hot reload, volume mounts)
- **`docker-compose.prod.yml`**: Production mode (explicit, runs cron, no volumes)
- **`docker-compose.proxmox.yml`**: Proxmox/Tailscale deployment override with Dropbox sync and persistent logs

Create a `.env` file in the root directory:

```bash
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
```

The `DATABASE_URL` is automatically constructed as:
```
postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/yourdb
```

## Key Commands

### Development Mode (Hot Reload)

```bash
# Start all services in dev mode (uses override automatically)
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f dashboard
docker-compose logs -f importer

# Rebuild after dependency changes (package.json, requirements.txt)
docker-compose up -d --build

# Stop all services
docker-compose down

# Dashboard runs on http://localhost:3000 with hot reload
```

### Production Mode

```bash
# Start in production mode (explicit override)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### Proxmox Deployment

```bash
# From the deployed checkout on the VM
ops/deploy.sh deploy       # rebuild and start
ops/deploy.sh status       # containers, importer logs, order freshness
ops/deploy.sh seed         # one-time historical load
ops/deploy.sh incremental  # manual daily load
ops/deploy.sh test         # dbt tests
ops/deploy.sh backup-db    # pg_dump backup
```

See `docs/proxmox-deploy.md` for VM layout, Dropbox rclone setup, and required `.env` values.

### Importer Pipeline Operations

```bash
# Run initial historical data load (one-time setup)
# In dev: Place files in ./data/seed/ directory first
docker-compose exec importer python orchestrator.py --seed

# Run incremental load (daily operation)
# In dev: Place files in ./data/input/ directory first
docker-compose exec importer python orchestrator.py --incremental

# Run specific source only
docker-compose exec importer python orchestrator.py --seed --source quickbooks
docker-compose exec importer python orchestrator.py --incremental --source shopify

# Run DBT tests
docker-compose exec importer /bin/sh -c "source .venv/bin/activate && dbt test"

# Interactive shell for debugging
docker-compose exec importer /bin/sh
```

**Development Data Location:**
- Place your QuickBooks XLSX files in `./data/seed/` (historical) or `./data/input/` (incremental)
- See `data/README.md` for detailed file structure and usage
- In dev, `DROPBOX_PATH` points to `/data` (mounted from `./data`)
- In prod, `DROPBOX_PATH` points to `/dropbox/Dropbox/quickbooks-csv` (actual Dropbox sync)

### Dashboard Operations

```bash
# View dashboard logs
docker-compose logs -f dashboard

# Access dashboard
# Open http://localhost:3000

# Interactive shell
docker-compose exec dashboard /bin/sh
```

**Dashboard verification note:** Do not run `npm run build` locally for dashboard changes; development runs through the Docker Compose dashboard container and local builds can poison the running container state. Use `npm run lint` locally, and use container-based rebuilds only when a dependency or deployment change requires it.

### Database Operations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U ${DB_USER} -d yourdb

# View mart tables (dashboard data)
docker-compose exec postgres psql -U ${DB_USER} -d yourdb -c "\dt mart.*"

# Query example
docker-compose exec postgres psql -U ${DB_USER} -d yourdb -c "SELECT COUNT(*) FROM mart.fct_orders;"
```

## Development Workflow

### Working in the Monorepo

Dashboard and importer code are normal directories in this repository. Make cross-cutting changes in one branch and one commit/PR when that matches the work.

### Cross-Project Communication

The `DBT_CANDIDATES.md` file exists in both `dashboard/` and `importer/` directories and serves as a communication channel:

- **Dashboard discovers issues** → Documents in `dashboard/DBT_CANDIDATES.md`
- **Importer team implements fixes** → References `importer/DBT_CANDIDATES.md`
- These files track data quality issues, pipeline optimization opportunities, and schema improvements

**Important**: Do NOT automatically implement items from `DBT_CANDIDATES.md` - they represent a backlog requiring evaluation.

### Making Pipeline Changes

1. Work in `importer/` directory (see `importer/AGENTS.md` for details)
2. Test locally or rebuild importer container
3. Changes propagate to dashboard automatically via shared database

### Making Dashboard Changes

1. Work in `dashboard/` directory (see `dashboard/AGENTS.md` for details)
2. Dashboard hot-reloads in development mode
3. Production changes require `docker-compose up -d --build dashboard`

## Data Schema Overview

### Importer Output (mart schema)
- `fct_orders` - Order-level analytics (primary dashboard table)
- `fct_products` - Product catalog with pricing/margins
- `fct_order_line_items` - Line item details for invoices
- `fct_companies` - Consolidated company master
- `fct_company_orders` - Company purchasing patterns
- `fct_order_attribution` - Shopify marketing attribution
- `bridge_customer_company` - Customer-to-company links

### Dashboard Consumption
- Next.js app queries these `fct_*` tables via Drizzle ORM
- Uses PostgreSQL connection defined in `DATABASE_URL`
- Schema definitions in `dashboard/drizzle/schema.ts`

## Common Development Tasks

### Initial Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd bi

# 2. Create environment file
cat > .env <<EOF
DB_USER=postgres
DB_PASSWORD=your_secure_password
EOF

# 3. Start services
docker-compose up -d

# 4. Load initial data (one-time)
docker-compose exec importer python orchestrator.py --seed

# 5. Access dashboard
open http://localhost:3000
```

### Debugging Data Issues

```bash
# 1. Check importer logs for pipeline errors
docker-compose logs importer

# 2. Connect to database to inspect data
docker-compose exec postgres psql -U postgres -d yourdb

# 3. Run DBT tests to validate transformations
docker-compose exec importer /bin/sh -c "source .venv/bin/activate && dbt test"

# 4. Check dashboard queries
docker-compose logs dashboard
```

### Updating Dependencies

For importer (Python):
```bash
cd importer/
# Update requirements.txt
docker-compose up -d --build importer
```

For dashboard (Node.js):
```bash
cd dashboard/
npm install <package>
docker-compose up -d --build dashboard
```

## Important Notes

### Component-Specific Guidance
- Refer to `importer/AGENTS.md` for pipeline development details.
- Dashboard guidance lives in `dashboard/README.md` and colocated docs.

### Data Pipeline Modes
- **Seed mode** (`--seed`): Loads historical data from `seed/` directory (one-time)
- **Incremental mode** (`--incremental`): Processes daily updates from `input/` directory

### Database Connection
- Services communicate via Docker network using service names
- Importer and Dashboard connect to `postgres:5432` (internal)
- Host machine can connect via `localhost:5432` (if exposed)

### Practical Importer Notes
- **DBT output schemas**: The dashboard-facing DBT models are materialized into `analytics_mart`, `analytics_intermediate`, and `analytics_staging`. When validating imports in SQL, do not expect a plain `mart` schema.
- **Direct host SQL access**: For faster ad hoc queries, use host `psql` against the Docker-exposed database: `PGPASSWORD=test psql -h localhost -p 5432 -U test -d yourdb`
- **Dev importer intake path**: In the current dev Docker Compose setup, the running importer container uses `DROPBOX_PATH=/dropbox`, not `/data`. Files placed in local `./data/input` are visible in the container at `/data/input`, but they are not automatically picked up by the live importer unless `DROPBOX_PATH` is changed or the files are staged into the active intake path.
- **QuickBooks filename contract**: The QuickBooks pipeline is filename-sensitive. Seed imports expect `all_lists.xlsx` and `all_transactions.xlsx`. Incremental imports expect dated files matching patterns like `All Lists_MM_DD_YYYY_H_MM_SS.xlsx` and `All Transactions_MM_DD_YYYY_H_MM_SS.xlsx`. Generic names like `lists.xlsx` or `transactions.xlsx` will not be discovered.
- **Website/Webgility attribution rule**: Website orders no longer always arrive as QuickBooks `sales_receipt` rows. Under the Shopify -> Webgility -> QuickBooks flow, many website orders land as `invoice` rows with `order_number like 'S-%'` and `terms = 'Credit Card'`. Channel attribution work should preserve this rule.

### Development vs Production
- **Development**: Use `docker-compose up` without `-d` to see live logs
- **Production**: Run with `-d` flag and monitor via `docker-compose logs`
- Importer runs as cron job in production (daily at midnight)

### Git Workflow
- This is a single monorepo. Do not use `git submodule` commands.
- Commit dashboard, importer, DBT, and deployment changes together when they are part of the same behavior.
- The historical dashboard and importer git logs were merged into this repo under their directory prefixes.
