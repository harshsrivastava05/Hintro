"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "./auth";
import { revalidatePath } from "next/cache";

function emitEvent(event: string, data: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io;
    if (io && data && typeof data === "object" && "boardId" in data) {
        io.to(`board:${(data as { boardId: string }).boardId}`).emit(event, data);
    }
}

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

    // Emit socket event with list data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io;
    if (io) {
        io.to(`board:${boardId}`).emit("list-created", {
            boardId,
            list: {
                id: list.id,
                title: list.title,
                order: list.order,
                boardId: list.boardId,
                tasks: [],
            },
        });
        io.to(`board:${boardId}`).emit("board-updated");
    }

    revalidatePath(`/board/${boardId}`);
    return { success: true, data: list };
}

export async function deleteList(listId: string, boardId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    // Get list to check if it exists and get its title for activity log
    const list = await db.list.findUnique({
        where: { id: listId },
        include: {
            tasks: {
                select: { id: true },
            },
        },
    });

    if (!list) return { error: "List not found" };

    // Delete all tasks in the list first (cascade will handle this, but we need to log activities)
    // Note: Activities are tied to tasks, so when tasks are deleted, activities are also deleted
    await db.list.delete({
        where: { id: listId },
    });

    // Emit socket event for list deletion
    emitEvent("list-deleted", {
        boardId,
        listId,
    });

    emitEvent("activity-updated", { boardId });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io;
    if (io) {
        io.to(`board:${boardId}`).emit("board-updated");
    }

    revalidatePath(`/board/${boardId}`);
    return { success: true };
}
