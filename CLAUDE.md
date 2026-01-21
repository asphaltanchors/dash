# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-component Business Intelligence system consisting of two git submodules orchestrated via Docker Compose:

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

### Submodule Structure
- `dashboard/` - NextJS dashboard (separate git repo: asphaltanchors/dashboard)
- `importer/` - Data pipeline (separate git repo: asphaltanchors/importer)
- Each submodule has its own `CLAUDE.md` with detailed component-specific guidance

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

### Importer Pipeline Operations

```bash
# Run initial historical data load (one-time setup)
docker-compose exec importer python orchestrator.py --seed

# Run incremental load (daily operation)
docker-compose exec importer python orchestrator.py --incremental

# Run DBT tests
docker-compose exec importer /bin/sh -c "source .venv/bin/activate && dbt test"

# Interactive shell for debugging
docker-compose exec importer /bin/sh
```

### Dashboard Operations

```bash
# View dashboard logs
docker-compose logs -f dashboard

# Access dashboard
# Open http://localhost:3000

# Interactive shell
docker-compose exec dashboard /bin/sh
```

### Database Operations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U ${DB_USER} -d yourdb

# View mart tables (dashboard data)
docker-compose exec postgres psql -U ${DB_USER} -d yourdb -c "\dt mart.*"

# Query example
docker-compose exec postgres psql -U ${DB_USER} -d yourdb -c "SELECT COUNT(*) FROM mart.fct_orders;"
```

### Git Submodule Management

```bash
# Initialize submodules (first time setup)
git submodule init
git submodule update

# Update submodules to latest commits
git submodule update --remote

# Pull latest changes in all submodules
git submodule foreach git pull origin main

# Check submodule status
git submodule status
```

## Development Workflow

### Working with Submodules

When making changes to dashboard or importer:

1. **Navigate into the submodule directory**:
   ```bash
   cd dashboard/  # or importer/
   ```

2. **Make changes and commit within the submodule**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

3. **Update parent repo to reference new commits**:
   ```bash
   cd ..  # Back to root
   git add dashboard/  # or importer/
   git commit -m "Update dashboard submodule"
   git push
   ```

### Cross-Project Communication

The `DBT_CANDIDATES.md` file exists in both `dashboard/` and `importer/` directories and serves as a communication channel:

- **Dashboard discovers issues** → Documents in `dashboard/DBT_CANDIDATES.md`
- **Importer team implements fixes** → References `importer/DBT_CANDIDATES.md`
- These files track data quality issues, pipeline optimization opportunities, and schema improvements

**Important**: Do NOT automatically implement items from `DBT_CANDIDATES.md` - they represent a backlog requiring evaluation.

### Making Pipeline Changes

1. Work in `importer/` directory (see `importer/CLAUDE.md` for details)
2. Test locally or rebuild importer container
3. Changes propagate to dashboard automatically via shared database

### Making Dashboard Changes

1. Work in `dashboard/` directory (see `dashboard/CLAUDE.md` for details)
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
# 1. Clone repository with submodules
git clone --recurse-submodules <repo-url>
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

### Submodule-Specific Guidance
- Each submodule has its own detailed `CLAUDE.md` file
- Refer to `dashboard/CLAUDE.md` for dashboard development details
- Refer to `importer/CLAUDE.md` for pipeline development details

### Data Pipeline Modes
- **Seed mode** (`--seed`): Loads historical data from `seed/` directory (one-time)
- **Incremental mode** (`--incremental`): Processes daily updates from `input/` directory

### Database Connection
- Services communicate via Docker network using service names
- Importer and Dashboard connect to `postgres:5432` (internal)
- Host machine can connect via `localhost:5432` (if exposed)

### Development vs Production
- **Development**: Use `docker-compose up` without `-d` to see live logs
- **Production**: Run with `-d` flag and monitor via `docker-compose logs`
- Importer runs as cron job in production (daily at midnight)

### Git Workflow
- Parent repo tracks specific commits of submodules
- Updating submodules requires explicit commit in parent repo
- Each submodule can be developed independently
