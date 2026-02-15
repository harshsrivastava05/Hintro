require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
    console.log('Starting Prisma Client...');
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        },
        log: ['query', 'info', 'warn', 'error'],
    });

    try {
        console.log('Connecting...');
        await prisma.$connect();
        console.log('Connected successfully.');

        console.log('Running query...');
        const count = await prisma.user.count();
        console.log(`User  count: ${count}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
        console.log('Disconnected.');
    }
}

main();
