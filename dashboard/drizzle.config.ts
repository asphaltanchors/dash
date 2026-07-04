import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardDir = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(dashboardDir, '../.env') });
config({ path: path.resolve(dashboardDir, '.env'), override: true });
config({ path: path.resolve(dashboardDir, '.env.local'), override: true });

const databaseUrl =
  process.env.DATABASE_URL ??
  buildLocalDatabaseUrl();

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DB_USER/DB_PASSWORD must be set for Drizzle Kit');
}

function buildLocalDatabaseUrl() {
  const { DB_USER, DB_PASSWORD } = process.env;

  if (!DB_USER || !DB_PASSWORD) {
    return undefined;
  }

  const user = encodeURIComponent(DB_USER);
  const password = encodeURIComponent(DB_PASSWORD);
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5432';
  const database = process.env.DB_NAME ?? 'yourdb';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

export default defineConfig({
  out: './drizzle',
  schema: './drizzle/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  schemaFilter: ['analytics_mart'],
  introspect: {
    casing: 'camel',
  },
});
