import { db, userRoles, users } from './index';
import { hashPassword } from '../auth/password';
import { eq } from 'drizzle-orm';

export async function seedUserRoles() {
  const roles = [
    {
      name: 'guest',
      description: 'Guest user with limited access',
      permissions: {
        content: ['read'],
        ai_chat: { max_requests_per_month: 0 },
        admin_dashboard: false,
        user_management: false,
      },
    },
    {
      name: 'basic',
      description: 'Basic subscriber with limited AI access',
      permissions: {
        content: ['read'],
        ai_chat: { max_requests_per_month: 50 },
        admin_dashboard: false,
        user_management: false,
      },
    },
    {
      name: 'premium',
      description: 'Premium subscriber with unlimited access',
      permissions: {
        content: ['read'],
        ai_chat: { max_requests_per_month: -1 }, // unlimited
        admin_dashboard: false,
        user_management: false,
      },
    },
    {
      name: 'moderator',
      description: 'Content moderator with review permissions',
      permissions: {
        content: ['read', 'review', 'edit'],
        ai_chat: { max_requests_per_month: -1 },
        admin_dashboard: true,
        user_management: false,
      },
    },
    {
      name: 'admin',
      description: 'Administrator with full system access',
      permissions: {
        content: ['create', 'read', 'edit', 'delete', 'review'],
        ai_chat: { max_requests_per_month: -1 },
        admin_dashboard: true,
        user_management: true,
      },
    },
  ];

  for (const role of roles) {
    await db.insert(userRoles).values(role).onConflictDoNothing();
  }

  console.log('User roles seeded successfully');
}

export async function seedAdminUser() {
  const adminRole = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.name, 'admin'))
    .limit(1);

  if (adminRole.length === 0) {
    throw new Error('Admin role not found. Please seed user roles first.');
  }

  const adminPassword = await hashPassword('Admin123!');
  
  await db.insert(users).values({
    email: 'admin@aitechj.com',
    passwordHash: adminPassword,
    roleId: adminRole[0].id,
    subscriptionTier: 'admin',
    emailVerified: true,
    isActive: true,
  }).onConflictDoNothing();

  console.log('Admin user seeded successfully');
}
