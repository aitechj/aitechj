import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const client = postgres(connectionString, { 
  prepare: false,
  max: 1,
  idle_timeout: 20,
  max_lifetime: 60 * 30
});
export const db = drizzle(client, { schema });

export * from './schema';
