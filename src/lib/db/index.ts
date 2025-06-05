import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const isLocalDev = process.env.NODE_ENV === 'development';
const databaseUrl = process.env.DATABASE_URL;
const useStubDb = process.env.USE_STUB_DB === 'true';
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || !databaseUrl;

let client: any = null;
let db: any = null;

function createStubDb() {
  const createQueryChain = () => ({
    where: () => createQueryChain(),
    leftJoin: () => createQueryChain(),
    limit: () => createQueryChain(),
    offset: () => createQueryChain(),
    orderBy: () => createQueryChain(),
    then: (resolve: any) => resolve([]),
    catch: (reject: any) => Promise.resolve([])
  });

  return {
    select: () => ({
      from: () => createQueryChain()
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

function createRealDb(url: string) {
  try {
    const client = postgres(url, { 
      prepare: false,
      max: 1,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 10
    });
    return drizzle(client, { schema });
  } catch (error) {
    console.warn('Failed to create database connection, using stub:', error);
    return createStubDb();
  }
}

if (isBuildTime) {
  console.warn('⚠️ Build time detected—using stub database');
  db = createStubDb();
} else if (useStubDb) {
  console.warn('⚠️ USE_STUB_DB=true—using stub database for development');
  db = createStubDb();
} else if (databaseUrl) {
  db = createRealDb(databaseUrl);
} else {
  console.warn('⚠️ No DATABASE_URL set—using stub database');
  db = createStubDb();
}

export { client, db };
export * from './schema';
