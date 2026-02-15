"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "./auth";
import { revalidatePath } from "next/cache";

export async function createList(boardId: string, title: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    // Get last list order
    const lastList = await db.list.findFirst({
        where: { boardId },
        orderBy: { order: "desc" },
    });

    const order = lastList ? lastList.order + 1 : 0;

    const list = await db.list.create({
        data: {
            title,
            boardId,
            order,
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io;
    if (io) io.to(`board:${boardId}`).emit("board-updated");

    revalidatePath(`/board/${boardId}`);
    return { success: true, data: list };
}
