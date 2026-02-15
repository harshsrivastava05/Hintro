import { db } from "../lib/db";
import bcrypt from "bcryptjs";

async function main() {
    const users = [
        { email: "test@gmail.com", password: "test12345", name: "Test User 1" },
        { email: "test1@gmail.com", password: "test12345", name: "Test User 2" },
    ];

    console.log("Seeding users...");

    for (const u of users) {
        const existing = await db.user.findUnique({ where: { email: u.email } });
        if (!existing) {
            const hashedPassword = await bcrypt.hash(u.password, 10);
            await db.user.create({
                data: {
                    email: u.email,
                    password: hashedPassword,
                    name: u.name,
                },
            });
            console.log(`✅ Created user: ${u.email}`);
        } else {
            console.log(`ℹ️ User already exists: ${u.email}`);
        }
    }
    console.log("Done!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
