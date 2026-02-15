
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
});

async function main() {
    console.log("Connecting to DB...");
    try {
        await prisma.$connect();
        console.log("Connected successfully!");
        try {
            const userCount = await prisma.user.count();
            console.log(`User count: ${userCount}`);
        } catch (e) {
            console.error("Error counting users:", e);
        }
    } catch (e) {
        console.error("Error connecting to DB:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
