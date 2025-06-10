import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (typeof window === 'undefined') {
  require('dotenv').config({ path: '.env.local' });
}

const isLocalDev = process.env.NODE_ENV === 'development';
const databaseUrl = process.env.DATABASE_URL;
const useStubDb = process.env.USE_STUB_DB === 'true';
const isVercelBuild = process.env.VERCEL === '1' && process.env.VERCEL_ENV === undefined;
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || isVercelBuild || !databaseUrl;

console.log('Database connection debug:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL_EXISTS: !!databaseUrl,
  USE_STUB_DB: useStubDb,
  IS_BUILD_TIME: isBuildTime
});

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
        returning: () => Promise.resolve([{ id: `stub_${Date.now()}` }]),
        onConflictDoNothing: () => ({
          returning: () => Promise.resolve([{ id: `stub_${Date.now()}` }])
        })
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
    query: () => Promise.resolve([]),
    transaction: async (callback: any) => {
      console.log('🔧 Stub database transaction started');
      try {
        const result = await callback({
          select: () => ({
            from: () => createQueryChain()
          }),
          insert: () => ({
            values: () => ({
              returning: () => Promise.resolve([{ id: `stub_tx_${Date.now()}` }]),
              onConflictDoNothing: () => ({
                returning: () => Promise.resolve([{ id: `stub_tx_${Date.now()}` }])
              })
            })
          }),
          execute: (sql: any) => {
            console.log('🔧 Stub transaction execute SQL:', sql);
            return Promise.resolve();
          }
        });
        console.log('✅ Stub database transaction completed successfully');
        return result;
      } catch (error) {
        console.error('❌ Stub database transaction failed:', error);
        throw error;
      }
    }
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
  console.warn('Environment details:', {
    NEXT_PHASE: process.env.NEXT_PHASE,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    hasDatabase: !!databaseUrl
  });
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
