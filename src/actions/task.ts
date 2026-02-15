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

async function logActivity(userId: string, taskId: string, action: string) {
    await db.activity.create({ data: { userId, taskId, action } });
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

    // Log before deleting (cascade deletes activities)
    await db.task.delete({ where: { id: taskId } });

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

    revalidatePath(`/board/${boardId}`);
    return { success: true, data: task };
}

export async function reorderTasks(
    boardId: string,
    updates: { id: string; listId: string; order: number }[]
) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    // Get current tasks to detect cross-list moves
    const taskIds = updates.map((u) => u.id);
    const currentTasks = await db.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, listId: true, content: true },
    });

    await db.$transaction(
        updates.map((u) =>
            db.task.update({
                where: { id: u.id },
                data: { listId: u.listId, order: u.order },
            })
        )
    );

    // Log activity for tasks that moved between lists
    for (const update of updates) {
        const current = currentTasks.find((t) => t.id === update.id);
        if (current && current.listId !== update.listId) {
            await logActivity(user.id, update.id, `moved task "${current.content}" to another list`);
        }
    }

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
}
