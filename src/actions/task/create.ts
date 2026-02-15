"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-logger";
import { emitBoardUpdate, emitEvent } from "@/lib/socket-utils";

export async function createTask(listId: string, content: string, boardId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const lastTask = await db.task.findFirst({
        where: { listId },
        orderBy: { order: "desc" },
    });

    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await db.task.create({
        data: {
            content,
            listId,
            order,
            assigneeId: user.id,
        },
    });

    await logActivity(user.id, task.id, `created task "${content}"`);

    // Emit socket event with task data
    emitEvent("task-created", {
        boardId,
        listId,
        task: {
            id: task.id,
            content: task.content,
            order: task.order,
            listId: task.listId,
            assigneeId: task.assigneeId,
        },
    });

    emitEvent("activity-updated", { boardId });
    emitBoardUpdate(boardId);
    revalidatePath(`/board/${boardId}`);
    return { success: true, data: task };
}
