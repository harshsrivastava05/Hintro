"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export async function register(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password || !name) {
        return { error: "Missing required fields" };
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
        return { error: "User already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
        },
    });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "7d",
    });

    (await cookies()).set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });

    revalidatePath("/");
    return { success: true, user: { id: user.id, email: user.email, name: user.name } };
}

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Missing required fields" };
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
        return { error: "Invalid credentials" };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return { error: "Invalid credentials" };
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "7d",
    });

    (await cookies()).set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });

    revalidatePath("/");
    return { success: true, user: { id: user.id, email: user.email, name: user.name } };
}

export async function logout() {
    (await cookies()).delete("token");
    revalidatePath("/");
}

export async function getCurrentUser() {
    const token = (await cookies()).get("token")?.value;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await db.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name };
    } catch (error) {
        console.error("JWT verification failed:", error); // Log error
        return null;
    }
}
