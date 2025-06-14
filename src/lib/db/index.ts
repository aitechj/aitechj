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

function createStubDb() {
  const bcrypt = require('bcryptjs');

  // Clear data to prevent stale or duplicate records
  stubStorage.users.clear();
  stubStorage.userRoles.clear();
  stubStorage.aiConversations.clear();

  // Seed user roles
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

  // Seed users
  const testAdminPassword = process.env.TEST_ADMIN_PASSWORD || 'Admin123!';
  const testBasicPassword = process.env.TEST_BASIC_PASSWORD || 'Basic123!';
  const testPremiumPassword = process.env.TEST_PREMIUM_PASSWORD || 'Premium123!';

  console.log('🔧 Stub database seeding with test users');
  console.log('🔧 Using environment variables:', {
    hasAdminPassword: !!process.env.TEST_ADMIN_PASSWORD,
    hasBasicPassword: !!process.env.TEST_BASIC_PASSWORD,
    hasPremiumPassword: !!process.env.TEST_PREMIUM_PASSWORD,
    usingFallbacks: !process.env.TEST_ADMIN_PASSWORD || !process.env.TEST_BASIC_PASSWORD || !process.env.TEST_PREMIUM_PASSWORD
  });

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

  console.log('🌱 Stub database pre-seeded with test users and roles');

  // Return your stub DB API (no changes to how this works)
  return {
    select: () => createQueryChain('users', Array.from(stubStorage.users.values())),
    // ... You can keep the rest of your stub DB API as is, no change needed
  };
}

// Replace selection logic to always seed stub DB for runtime serverless
if (useStubDb || isBuildTime || !databaseUrl) {
  console.warn('⚠️ Using stub database (runtime safe)');
  db = createStubDb();
} else if (databaseUrl) {
  db = createRealDb(databaseUrl);
} else {
  console.warn('⚠️ No DATABASE_URL set—using stub database');
  db = createStubDb();
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

export { client, db };
export * from './schema';
