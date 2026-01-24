
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding admin data...');

  // Create Users
  const users = [
    { email: 'alice@tech.com', name: 'Alice Chen', role: 'ADMIN', plan: 'ENTERPRISE' },
    { email: 'bob@dev.io', name: 'Bob Zhang', role: 'USER', plan: 'PRO' },
    { email: 'charlie@gmail.com', name: 'Charlie Wu', role: 'USER', plan: 'FREE' },
    { email: 'david@agency.net', name: 'David Liu', role: 'USER', plan: 'PRO' },
    { email: 'eve@startup.cc', name: 'Eve Wang', role: 'USER', plan: 'FREE' },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: 'hashed_password_placeholder', // In real app, hash this!
        role: u.role as any,
        membership: {
            create: {
                plan: u.plan as any,
                status: 'ACTIVE'
            }
        }
      },
    });
    console.log(`Created user with id: ${user.id}`);
  }

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
