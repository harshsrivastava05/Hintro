"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "./auth";
import { revalidatePath } from "next/cache";

// ─── Helpers ─────────────────────────────────────────────

function emitBoardUpdate(boardId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io;
    if (io) io.to(`board:${boardId}`).emit("board-updated");
}

function emitEvent(event: string, data: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io;
    if (io && data && typeof data === "object" && "boardId" in data) {
        io.to(`board:${(data as { boardId: string }).boardId}`).emit(event, data);
    }
}

async function logActivity(userId: string, taskId: string, action: string) {
    try {
        const activity = await db.activity.create({ 
            data: { userId, taskId, action } 
        });
        console.log(`[logActivity] Created activity: ${action} for task ${taskId} by user ${userId}`);
        return activity;
    } catch (error) {
        console.error("[logActivity] Failed to log activity:", error);
        // Don't throw - activity logging shouldn't break the main operation
        throw error; // Actually, let's see if this is causing issues - but we'll catch it in the caller
    }
}

// ─── Create ──────────────────────────────────────────────

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

// ─── Update Content ──────────────────────────────────────

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

// ─── Delete ──────────────────────────────────────────────

export async function deleteTask(taskId: string, boardId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) return { error: "Task not found" };

    const listId = task.listId;
    const taskContent = task.content;
    
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

// ─── Assign User ─────────────────────────────────────────

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

// ─── Reorder / Move ──────────────────────────────────────

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

// ─── Get Activity ────────────────────────────────────────

export async function getTaskActivities(taskId: string) {
    const activities = await db.activity.findMany({
        where: { taskId },
        include: {
            user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });
    return { success: true, data: activities };
}

// ─── Get Board Activities (paginated) ────────────────────

export async function getBoardActivities(boardId: string, page: number = 1, pageSize: number = 20) {
    try {
        const board = await db.board.findUnique({
            where: { id: boardId },
            select: {
                lists: {
                    select: {
                        tasks: { select: { id: true } },
                    },
                },
            },
        });

        if (!board) return { error: "Board not found" };

        const taskIds = board.lists.flatMap((l) => l.tasks.map((t) => t.id));

        // If no tasks, return empty result
        if (taskIds.length === 0) {
            return {
                success: true,
                data: [],
                pagination: {
                    page,
                    pageSize,
                    total: 0,
                    totalPages: 0,
                },
            };
        }

        const [activities, total] = await Promise.all([
            db.activity.findMany({
                where: { taskId: { in: taskIds } },
                include: {
                    user: { select: { name: true, email: true } },
                    task: { select: { content: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.activity.count({
                where: { taskId: { in: taskIds } },
            }),
        ]);

        console.log(`[getBoardActivities] Found ${activities.length} activities for board ${boardId} (total: ${total}, taskIds: ${taskIds.length})`);

        return {
            success: true,
            data: activities,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    } catch (error) {
        console.error("[getBoardActivities] Error:", error);
        return { error: "Failed to fetch activities" };
    }
}
