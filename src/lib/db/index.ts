import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const isLocalDev = process.env.NODE_ENV === 'development';
const databaseUrl = process.env.DATABASE_URL;

let client: any = null;
let db: any = null;

if (isLocalDev) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for development');
  }
  client = postgres(databaseUrl, { 
    prepare: false,
    max: 1,
    idle_timeout: 20,
    max_lifetime: 60 * 30
  });
  db = drizzle(client, { schema });
} else if (databaseUrl) {
  client = postgres(databaseUrl, { 
    prepare: false,
    max: 1,
    idle_timeout: 20,
    max_lifetime: 60 * 30
  });
  db = drizzle(client, { schema });
} else {
  console.warn('⚠️ No DATABASE_URL set—using stub database for build');
  client = null;
  db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            offset: () => ({
              orderBy: () => Promise.resolve([])
            }),
            orderBy: () => Promise.resolve([])
          }),
          orderBy: () => Promise.resolve([])
        }),
        leftJoin: () => ({
          where: () => ({
            limit: () => ({
              offset: () => ({
                orderBy: () => Promise.resolve([])
              }),
              orderBy: () => Promise.resolve([])
            }),
            orderBy: () => Promise.resolve([])
          }),
          limit: () => ({
            offset: () => ({
              orderBy: () => Promise.resolve([])
            }),
            orderBy: () => Promise.resolve([])
          }),
          orderBy: () => Promise.resolve([])
        }),
        limit: () => ({
          offset: () => ({
            orderBy: () => Promise.resolve([])
          }),
          orderBy: () => Promise.resolve([])
        }),
        orderBy: () => Promise.resolve([])
      })
    }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([])
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([])
        })
      })
    }),
    delete: () => ({
      where: () => ({
        returning: () => Promise.resolve([])
      })
    }),
    query: () => Promise.resolve([])
  } as any;
}

export { client, db };
export * from './schema';
