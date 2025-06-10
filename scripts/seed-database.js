const { db, users, userRoles } = require('../src/lib/db');
const { hashPassword } = require('../src/lib/auth/password');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  console.log('📝 Seeding user roles...');
  const roles = [
    {
      id: 1,
      name: 'admin',
      description: 'Administrator with full system access',
      permissions: JSON.stringify(['read', 'write', 'delete', 'admin'])
    },
    {
      id: 2, 
      name: 'user',
      description: 'Regular user with basic access',
      permissions: JSON.stringify(['read'])
    },
    {
      id: 3,
      name: 'guest',
      description: 'Guest user with limited access',
      permissions: JSON.stringify(['read'])
    }
  ];

  for (const role of roles) {
    try {
      await db.insert(userRoles).values(role).onConflictDoNothing();
      console.log(`✅ Seeded role: ${role.name}`);
    } catch (error) {
      console.error(`❌ Failed to seed role ${role.name}:`, error);
    }
  }

  console.log('👥 Seeding test users...');
  const testUsers = [
    {
      id: 'admin-user-id-12345',
      email: 'admin@aitechj.com',
      password: process.env.TEST_ADMIN_PASSWORD,
      roleId: 1, // admin role
      subscriptionTier: 'admin',
      emailVerified: true,
      isActive: true
    },
    {
      id: 'basic-user-id-12345', 
      email: 'basic@aitechj.com',
      password: process.env.TEST_BASIC_PASSWORD,
      roleId: 2, // user role
      subscriptionTier: 'basic',
      emailVerified: true,
      isActive: true
    },
    {
      id: 'premium-user-id-12345',
      email: 'premium@aitechj.com', 
      password: process.env.TEST_PREMIUM_PASSWORD,
      roleId: 2, // user role
      subscriptionTier: 'premium',
      emailVerified: true,
      isActive: true
    }
  ];

  for (const user of testUsers) {
    try {
      const hashedPassword = await hashPassword(user.password);
      
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        passwordHash: hashedPassword,
        roleId: user.roleId,
        subscriptionTier: user.subscriptionTier,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();
      
      console.log(`✅ Seeded user: ${user.email} (${user.subscriptionTier})`);
    } catch (error) {
      console.error(`❌ Failed to seed user ${user.email}:`, error);
    }
  }
  
  console.log('🎉 Database seeding completed!');
  console.log('📋 Test credentials:');
  console.log('   Admin: admin@aitechj.com / [password from env]');
  console.log('   Basic: basic@aitechj.com / [password from env]');
  console.log('   Premium: premium@aitechj.com / [password from env]');
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };
