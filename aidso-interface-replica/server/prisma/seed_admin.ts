const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

async function main() {
  console.log('Creating specific admin user...');

  const email = process.env.ADMIN_EMAIL || 'admin';
  const password = process.env.ADMIN_PASSWORD || '111111';
  const name = process.env.ADMIN_NAME || 'Admin User';
  const plan = process.env.ADMIN_PLAN || 'ENTERPRISE';

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
        name,
        password: hashPassword(password),
        role: 'ADMIN',
        membership: {
            upsert: {
                create: { plan, status: 'ACTIVE' },
                update: { plan, status: 'ACTIVE' }
            }
        }
    },
    create: {
      email,
      name,
      password: hashPassword(password),
      role: 'ADMIN',
      membership: {
          create: {
              plan,
              status: 'ACTIVE'
          }
      }
    },
  });

  console.log(`Admin ready: ${adminUser.email} / ${password}`);
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
