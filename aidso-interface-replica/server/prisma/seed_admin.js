"use strict";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log('Creating specific admin user...');
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin' },
        update: {
            password: '111111', // In real app, hash this!
            role: 'ADMIN',
            membership: {
                upsert: {
                    create: { plan: 'ENTERPRISE', status: 'ACTIVE' },
                    update: { plan: 'ENTERPRISE', status: 'ACTIVE' }
                }
            }
        },
        create: {
            email: 'admin',
            name: 'Admin User',
            password: '111111', // In real app, hash this!
            role: 'ADMIN',
            membership: {
                create: {
                    plan: 'ENTERPRISE',
                    status: 'ACTIVE'
                }
            }
        },
    });
    console.log(`Created admin user: ${adminUser.email} / 111111`);
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
