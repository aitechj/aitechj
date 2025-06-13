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

const stubStorage = {
  users: new Map<string, any>(),
  aiConversations: new Map<string, any>(),
  userRoles: new Map<string, any>(),
};

let stubInitialized = false;

function createStubDb() {
  const stubLocks = new Map<string, Promise<void>>();

  if (!stubInitialized) {
    const bcrypt = require('bcryptjs');
    
    stubStorage.userRoles.set('1', {
      id: 1,
      name: 'admin',
      description: 'Administrator with full system access',
      permissions: JSON.stringify(['read', 'write', 'delete', 'admin'])
    });
    stubStorage.userRoles.set('2', {
      id: 2,
      name: 'user',
      description: 'Regular user with basic access',
      permissions: JSON.stringify(['read'])
    });
    stubStorage.userRoles.set('3', {
      id: 3,
      name: 'guest',
      description: 'Guest user with limited access',
      permissions: JSON.stringify(['read'])
    });

    const testAdminPassword = process.env.TEST_ADMIN_PASSWORD;
    const testBasicPassword = process.env.TEST_BASIC_PASSWORD;
    const testPremiumPassword = process.env.TEST_PREMIUM_PASSWORD;

    if (!testAdminPassword || !testBasicPassword || !testPremiumPassword) {
      console.warn('⚠️ Test user passwords not configured via environment variables');
      console.warn('⚠️ Skipping test user seeding - users will need to be created via other means');
    } else {

    stubStorage.users.set('admin-user-id-12345', {
      id: 'admin-user-id-12345',
      name: 'Admin User',
      email: 'admin@aitechj.com',
      passwordHash: bcrypt.hashSync(testAdminPassword, 12),
      roleId: 1,
      subscriptionTier: 'admin',
      periodStart: new Date(),
      queriesUsed: 0,
      emailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    stubStorage.users.set('basic-user-id-12345', {
      id: 'basic-user-id-12345',
      name: 'Basic User',
      email: 'basic@aitechj.com',
      passwordHash: bcrypt.hashSync(testBasicPassword, 12),
      roleId: 2,
      subscriptionTier: 'basic',
      periodStart: new Date(),
      queriesUsed: 0,
      emailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    stubStorage.users.set('premium-user-id-12345', {
      id: 'premium-user-id-12345',
      name: 'Premium User',
      email: 'premium@aitechj.com',
      passwordHash: bcrypt.hashSync(testPremiumPassword, 12),
      roleId: 2,
      subscriptionTier: 'premium',
      periodStart: new Date(),
      queriesUsed: 0,
      emailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    }

    stubInitialized = true;
    console.log('🌱 Stub database pre-seeded with test users and roles');
  }
  
  const createQueryChain = (tableName: string, data: any[] = [], whereConditions: any[] = []) => ({
    where: (condition: any) => {
      console.log('🔍 WHERE condition keys:', Object.keys(condition || {}));
      
      const newConditions = [...whereConditions, condition];
      
      let filteredData = data;
      
      if (condition && condition.queryChunks && Array.isArray(condition.queryChunks)) {
        console.log('🔍 QueryChunks length:', condition.queryChunks.length);
        
        let targetEmail: string | null = null;
        let targetId: string | null = null;
        
        try {
          for (const chunk of condition.queryChunks) {
            if (chunk && typeof chunk === 'object' && chunk.value) {
              const value = chunk.value;
              if (typeof value === 'string') {
                if (value.includes('@') && value.includes('.com')) {
                  targetEmail = value;
                  console.log('🔍 Found email in query chunks:', targetEmail);
                  break;
                } else if (value.startsWith('stub_') || value.includes('-user-id-') || 
                          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                  targetId = value;
                  console.log('🔍 Found user ID in query chunks:', targetId);
                  break;
                }
              }
            }
          }
          
          if (targetEmail) {
            filteredData = data.filter(record => {
              const email = record.user ? record.user.email : record.email;
              const matches = email === targetEmail;
              console.log(`🔍 Email filter: ${email} === ${targetEmail} -> ${matches}`);
              return matches;
            });
            console.log(`🔍 WHERE filtering ${tableName} by email: ${data.length} -> ${filteredData.length} records`);
          } else if (targetId) {
            filteredData = data.filter(record => {
              const id = record.user ? record.user.id : record.id;
              const matches = id === targetId;
              console.log(`🔍 ID filter: ${id} === ${targetId} -> ${matches}`);
              return matches;
            });
            console.log(`🔍 WHERE filtering ${tableName} by ID: ${data.length} -> ${filteredData.length} records`);
          } else {
            console.log('🔍 No email or ID found in query chunks, returning all records');
            filteredData = data;
          }
        } catch (error) {
          console.log('🔍 Error parsing query chunks:', error instanceof Error ? error.message : 'Unknown error');
          filteredData = data;
        }
      } else {
        console.log('🔍 Unknown condition structure, returning all records');
        filteredData = data;
      }
      
      return createQueryChain(tableName, filteredData, newConditions);
    },
    leftJoin: (joinTable: any, condition: any) => {
      const joinedData = data.map(record => {
        let joinedRecord = null;
        if (tableName === 'users' && condition?.left?.name === 'roleId') {
          const roleData = Array.from(stubStorage.userRoles.values());
          joinedRecord = roleData.find(role => role.id === record.roleId) || null;
        }
        return { user: record, role: joinedRecord };
      });
      console.log(`🔍 LEFT JOIN ${tableName}: ${data.length} records joined`);
      return createQueryChain(tableName, joinedData, whereConditions);
    },
    limit: (count: number) => createQueryChain(tableName, data.slice(0, count), whereConditions),
    offset: (count: number) => createQueryChain(tableName, data.slice(count), whereConditions),
    orderBy: () => createQueryChain(tableName, data, whereConditions),
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
        } else if (tableName === 'user_roles') {
          const roleData = Array.from(stubStorage.userRoles.values());
          console.log('🔍 Returning user_roles data:', roleData.length, 'records');
          return createQueryChain('user_roles', roleData);
        }
        
        console.log('🔍 Unknown table, returning empty data for:', tableName);
        return createQueryChain(tableName, []);
      }
    }),
    insert: (table: any) => ({
      values: (data: any) => ({
        returning: (fields?: any) => {
          const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
          const id = data.id || crypto.randomUUID();
          const record = { ...data, id };
          
          console.log(`💾 Stub database inserting into ${tableName}:`, record);
          
          if (tableName === 'users') {
            stubStorage.users.set(id, record);
          } else if (tableName === 'ai_conversations') {
            stubStorage.aiConversations.set(id, record);
          } else if (tableName === 'user_roles') {
            stubStorage.userRoles.set(data.id || id, record);
          }
          
          return Promise.resolve([{ id: data.id || id }]);
        },
        onConflictDoNothing: () => ({
          returning: (fields?: any) => {
            const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
            const id = data.id || crypto.randomUUID();
            const record = { ...data, id };
            
            console.log(`💾 Stub database inserting (on conflict do nothing) into ${tableName}:`, record);
            
            if (tableName === 'users') {
              if (!stubStorage.users.has(id)) {
                stubStorage.users.set(id, record);
              }
            } else if (tableName === 'ai_conversations') {
              stubStorage.aiConversations.set(id, record);
            } else if (tableName === 'user_roles') {
              if (!stubStorage.userRoles.has(data.id)) {
                stubStorage.userRoles.set(data.id || id, record);
              }
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
              } else if (tableName === 'user_roles') {
                const roleData = Array.from(stubStorage.userRoles.values());
                return createQueryChain('user_roles', roleData);
              }
              
              return createQueryChain(tableName, []);
            }
          }),
          insert: (table: any) => ({
            values: (data: any) => ({
              returning: (fields?: any) => {
                const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
                const id = data.id || crypto.randomUUID();
                const record = { ...data, id };
                
                console.log(`💾 Stub transaction inserting into ${tableName}:`, record);
                
                if (tableName === 'users') {
                  stubStorage.users.set(id, record);
                } else if (tableName === 'ai_conversations') {
                  stubStorage.aiConversations.set(id, record);
                } else if (tableName === 'user_roles') {
                  stubStorage.userRoles.set(data.id || id, record);
                }
                
                return Promise.resolve([{ id: data.id || id }]);
              },
              onConflictDoNothing: () => ({
                returning: (fields?: any) => {
                  const tableName = table?.[Symbol.for('drizzle:Name')] || table?._.name || table?._?.name || 'unknown';
                  const id = data.id || crypto.randomUUID();
                  const record = { ...data, id };
                  
                  console.log(`💾 Stub transaction inserting (on conflict do nothing) into ${tableName}:`, record);
                  
                  if (tableName === 'users') {
                    if (!stubStorage.users.has(id)) {
                      stubStorage.users.set(id, record);
                    }
                  } else if (tableName === 'ai_conversations') {
                    stubStorage.aiConversations.set(id, record);
                  } else if (tableName === 'user_roles') {
                    if (!stubStorage.userRoles.has(data.id)) {
                      stubStorage.userRoles.set(data.id || id, record);
                    }
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
