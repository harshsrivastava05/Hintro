"use server";

import { db } from "@/lib/db";

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
