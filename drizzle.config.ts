import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/aitechj_dev',
  },
  introspect: {
    casing: 'preserve',
  },
} satisfies Config;
