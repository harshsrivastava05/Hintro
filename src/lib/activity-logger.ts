import { db } from "@/lib/db";

export async function logActivity(userId: string, taskId: string, action: string) {
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
