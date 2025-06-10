const { db, users } = require('../src/lib/db');
const { hashPassword } = require('../src/lib/auth/password');

async function seedTestUsers() {
  console.log('🌱 Seeding test users...');
  
  const testUsers = [
    {
      id: 'admin-user-id-12345',
      email: 'admin@aitechj.com',
      password: 'admin123',
      role: 'admin',
      subscriptionTier: 'admin',
      emailVerified: true
    },
    {
      id: 'basic-user-id-12345', 
      email: 'basic@aitechj.com',
      password: 'basic123',
      role: 'user',
      subscriptionTier: 'basic',
      emailVerified: true
    },
    {
      id: 'premium-user-id-12345',
      email: 'premium@aitechj.com', 
      password: 'premium123',
      role: 'user',
      subscriptionTier: 'premium',
      emailVerified: true
    }
  ];

  for (const user of testUsers) {
    try {
      const hashedPassword = await hashPassword(user.password);
      
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        passwordHash: hashedPassword,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        emailVerified: user.emailVerified,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();
      
      console.log(`✅ Seeded user: ${user.email} (${user.subscriptionTier})`);
    } catch (error) {
      console.error(`❌ Failed to seed user ${user.email}:`, error);
    }
  }
  
  console.log('🎉 Test user seeding completed!');
}

if (require.main === module) {
  seedTestUsers().catch(console.error);
}

module.exports = { seedTestUsers };
