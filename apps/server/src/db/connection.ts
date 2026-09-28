import { PGlite } from '@electric-sql/pglite';
import { drizzle as pgliteDrizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as pgDrizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import * as schema from './schema.js';
export type Database = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export const migrationsFolder = fileURLToPath(new URL('../../drizzle/', import.meta.url));
export async function connectDatabase(options: {
  driver: 'postgres' | 'pglite';
  url?: string;
  dataDir?: string;
}) {
  if (options.driver === 'pglite') {
    if (options.dataDir) await mkdir(options.dataDir, { recursive: true });
    const client = new PGlite(options.dataDir);
    await client.waitReady;
    const db = pgliteDrizzle(client, { schema });
    return {
      db,
      migrate: () => migratePglite(db, { migrationsFolder }),
      close: () => client.close(),
    };
  }
  if (!options.url) throw new Error('DATABASE_URL is required.');
  const pool = new pg.Pool({
    connectionString: options.url,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 30000,
  });
  pool.on('error', () => console.error('PostgreSQL connection error'));
  const db = pgDrizzle(pool, { schema });
  return { db, migrate: () => migratePg(db, { migrationsFolder }), close: () => pool.end() };
}
