"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";
import { revalidatePath } from "next/cache";
import { emitBoardUpdate, emitEvent } from "@/lib/socket-utils";

export async function deleteTask(taskId: string, boardId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) return { error: "Task not found" };

    const listId = task.listId;

    // Note: We can't log task deletion as an activity because activities are cascade-deleted
    // when tasks are deleted. The activity log will only show activities for existing tasks.

    // Delete the task (cascade will delete all activities for this task)
    await db.task.delete({ where: { id: taskId } });

    // Emit socket event for task deletion
    emitEvent("task-deleted", {
        boardId,
        taskId,
        listId,
    });

    emitEvent("activity-updated", { boardId });
    emitBoardUpdate(boardId);
    revalidatePath(`/board/${boardId}`);
    return { success: true };
}
