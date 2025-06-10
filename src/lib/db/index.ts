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
  const stubLocks = new Map<string, Promise<void>>();
  
  const stubStorage = {
    users: new Map<string, any>(),
    aiConversations: new Map<string, any>(),
  };
  
  const createQueryChain = (tableName: string, data: any[] = []) => ({
    where: (condition: any) => createQueryChain(tableName, data),
    leftJoin: () => createQueryChain(tableName, data),
    limit: (count: number) => createQueryChain(tableName, data.slice(0, count)),
    offset: (count: number) => createQueryChain(tableName, data.slice(count)),
    orderBy: () => createQueryChain(tableName, data),
    then: (resolve: any) => resolve(data),
    catch: (reject: any) => Promise.resolve(data)
  });

  return {
    select: (fields?: any) => ({
      from: (table: any) => {
        console.log('🔍 Stub database select called with table:', table?.constructor?.name || 'unknown');
        const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
        console.log('🔍 Stub database select from:', tableName);
        
        if (tableName === 'users') {
          const userData = Array.from(stubStorage.users.values());
          console.log('🔍 Returning users data:', userData.length, 'records');
          return createQueryChain('users', userData);
        } else if (tableName === 'ai_conversations') {
          const conversationData = Array.from(stubStorage.aiConversations.values());
          console.log('🔍 Returning ai_conversations data:', conversationData.length, 'records');
          return createQueryChain('ai_conversations', conversationData);
        }
        
        console.log('🔍 Unknown table, returning empty data for:', tableName);
        return createQueryChain(tableName, []);
      }
    }),
    insert: (table: any) => ({
      values: (data: any) => ({
        returning: (fields?: any) => {
          const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
          const id = `stub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const record = { ...data, id };
          
          console.log(`💾 Stub database inserting into ${tableName}:`, record);
          
          if (tableName === 'users') {
            stubStorage.users.set(data.id || id, record);
          } else if (tableName === 'ai_conversations') {
            stubStorage.aiConversations.set(id, record);
          }
          
          return Promise.resolve([{ id: data.id || id }]);
        },
        onConflictDoNothing: () => ({
          returning: (fields?: any) => {
            const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
            const id = `stub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const record = { ...data, id };
            
            console.log(`💾 Stub database inserting (on conflict do nothing) into ${tableName}:`, record);
            
            if (tableName === 'users') {
              if (!stubStorage.users.has(data.id)) {
                stubStorage.users.set(data.id || id, record);
              }
            } else if (tableName === 'ai_conversations') {
              stubStorage.aiConversations.set(id, record);
            }
            
            return Promise.resolve([{ id: data.id || id }]);
          }
        })
      })
    }),
    update: (table: any) => ({
      set: (data: any) => ({
        where: (condition: any) => ({
          returning: (fields?: any) => Promise.resolve([])
        })
      })
    }),
    delete: (table: any) => ({
      where: (condition: any) => ({
        returning: (fields?: any) => Promise.resolve([])
      })
    }),
    query: () => Promise.resolve([]),
    transaction: async (callback: any) => {
      console.log('🔧 Stub database transaction started with locking simulation');
      const lockKey = 'quota_lock';
      
      if (stubLocks.has(lockKey)) {
        await stubLocks.get(lockKey);
      }
      
      let resolveLock: () => void;
      const lockPromise = new Promise<void>(resolve => {
        resolveLock = resolve;
      });
      stubLocks.set(lockKey, lockPromise);
      
      try {
        const result = await callback({
          select: (fields?: any) => ({
            from: (table: any) => {
              const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
              console.log('🔍 Stub transaction select from:', tableName);
              
              if (tableName === 'users') {
                const userData = Array.from(stubStorage.users.values());
                return createQueryChain('users', userData);
              } else if (tableName === 'ai_conversations') {
                const conversationData = Array.from(stubStorage.aiConversations.values());
                return createQueryChain('ai_conversations', conversationData);
              }
              
              return createQueryChain(tableName, []);
            }
          }),
          insert: (table: any) => ({
            values: (data: any) => ({
              returning: (fields?: any) => {
                const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
                const id = `stub_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const record = { ...data, id };
                
                console.log(`💾 Stub transaction inserting into ${tableName}:`, record);
                
                if (tableName === 'users') {
                  stubStorage.users.set(data.id || id, record);
                } else if (tableName === 'ai_conversations') {
                  stubStorage.aiConversations.set(id, record);
                }
                
                return Promise.resolve([{ id: data.id || id }]);
              },
              onConflictDoNothing: () => ({
                returning: (fields?: any) => {
                  const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
                  const id = `stub_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  const record = { ...data, id };
                  
                  console.log(`💾 Stub transaction inserting (on conflict do nothing) into ${tableName}:`, record);
                  
                  if (tableName === 'users') {
                    if (!stubStorage.users.has(data.id)) {
                      stubStorage.users.set(data.id || id, record);
                    }
                  } else if (tableName === 'ai_conversations') {
                    stubStorage.aiConversations.set(id, record);
                  }
                  
                  return Promise.resolve([{ id: data.id || id }]);
                }
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
      } finally {
        stubLocks.delete(lockKey);
        resolveLock!();
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
