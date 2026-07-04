# Dash2 - E-commerce Business Intelligence Dashboard

A modern Next.js 16 analytics dashboard for e-commerce business intelligence, built with TypeScript, Tailwind CSS, and powered by a DBT data pipeline.

## Features

- **📊 Company Analytics** - Health scoring, growth trends, and customer prioritization
- **📦 Product Management** - Inventory tracking, sales analytics, and performance metrics  
- **📋 Order Management** - Comprehensive order tracking with search and filtering
- **📈 Revenue Dashboards** - Real-time metrics with year-over-year comparisons
- **🎨 Professional UI** - Clean, responsive design with dark mode support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL with Drizzle ORM
- **Components**: shadcn/ui
- **Data Pipeline**: DBT analytics pipeline

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Database

The app connects to a DBT analytics pipeline via PostgreSQL. Configure your connection in `.env.local`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

The dashboard is database-first for Drizzle: dbt owns the `analytics_mart` schema, and Drizzle Kit introspects it into `drizzle/schema.ts`. The app imports that generated schema through `lib/db`; do not manually copy generated schema files into `lib/db`.

After dbt mart schema changes, regenerate the dashboard schema:

```bash
npm run db:pull
```

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run lint         # Run ESLint
npm run db:pull      # Introspect analytics_mart into drizzle/schema.ts
npm run db:studio    # Open database browser
```

Built with ❤️ for modern e-commerce analytics.
