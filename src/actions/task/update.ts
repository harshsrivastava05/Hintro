"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-logger";
import { emitBoardUpdate, emitEvent } from "@/lib/socket-utils";

export async function updateTaskContent(taskId: string, content: string, boardId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const task = await db.task.update({
        where: { id: taskId },
        data: { content },
    });

    await logActivity(user.id, taskId, `updated task to "${content}"`);

    // Emit socket event with updated task data
    emitEvent("task-updated", {
        boardId,
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

export async function assignTask(taskId: string, assigneeId: string | null, boardId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const task = await db.task.update({
        where: { id: taskId },
        data: { assigneeId },
    });

    if (assigneeId) {
        const assignee = await db.user.findUnique({ where: { id: assigneeId }, select: { name: true } });
        await logActivity(user.id, taskId, `assigned task to ${assignee?.name || "someone"}`);
    } else {
        await logActivity(user.id, taskId, `unassigned task`);
    }

    // Emit socket event with updated task data
    emitEvent("task-updated", {
        boardId,
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

export async function updateTask(taskId: string, listId: string, order: number, boardId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const task = await db.task.update({
        where: { id: taskId },
        data: { listId, order },
    });

    // Emit socket event for task position update
    emitEvent("task-moved", {
        boardId,
        updates: [{ id: taskId, listId, order }],
    });

    emitBoardUpdate(boardId);
    revalidatePath(`/board/${boardId}`);
    return { success: true, data: task };
}

export async function reorderTasks(
    boardId: string,
    updates: { id: string; listId: string; order: number }[]
) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    // Get current tasks to detect moves and reorders - MUST be before the transaction
    const taskIds = updates.map((u) => u.id);
    const currentTasks = await db.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, listId: true, content: true, order: true },
    });

    console.log(`[reorderTasks] Current tasks:`, currentTasks.map(t => ({ id: t.id, listId: t.listId, order: t.order })));
    console.log(`[reorderTasks] Updates:`, updates.map(u => ({ id: u.id, listId: u.listId, order: u.order })));

    // Update tasks in transaction
    await db.$transaction(
        updates.map((u) =>
            db.task.update({
                where: { id: u.id },
                data: { listId: u.listId, order: u.order },
            })
        )
    );

    // Log activity for all task moves and reorders
    const activityPromises: Promise<unknown>[] = [];
    for (const update of updates) {
        const current = currentTasks.find((t) => t.id === update.id);
        if (current) {
            if (current.listId !== update.listId) {
                // Task moved between lists
                console.log(`[reorderTasks] Task ${update.id} moved from list ${current.listId} to ${update.listId}`);
                activityPromises.push(
                    logActivity(user.id, update.id, `moved task "${current.content}" to another list`).catch((err) => {
                        console.error(`[reorderTasks] Failed to log activity for task ${update.id}:`, err);
                    })
                );
            } else if (Math.abs(current.order - update.order) > 0.01) {
                // Task reordered within same list (using small epsilon for float comparison)
                console.log(`[reorderTasks] Task ${update.id} reordered from ${current.order} to ${update.order}`);
                activityPromises.push(
                    logActivity(user.id, update.id, `reordered task "${current.content}"`).catch((err) => {
                        console.error(`[reorderTasks] Failed to log activity for task ${update.id}:`, err);
                    })
                );
            }
        }
    }

    // Wait for all activities to be logged (but don't fail if some fail)
    const results = await Promise.allSettled(activityPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;
    console.log(`[reorderTasks] Activity logging: ${successCount} succeeded, ${failCount} failed`);

    // Small delay to ensure activities are committed to database
    await new Promise(resolve => setTimeout(resolve, 100));

    // Emit socket event with task move data
    emitEvent("task-moved", {
        boardId,
        updates: updates.map((u) => ({
            id: u.id,
            listId: u.listId,
            order: u.order,
        })),
    });

    emitEvent("activity-updated", { boardId });
    emitBoardUpdate(boardId);
    revalidatePath(`/board/${boardId}`);
    return { success: true };
}
