import { ActivityItem as ActivityItemType } from "@/types/activity";

interface ActivityItemProps {
    activity: ActivityItemType;
}

export function ActivityItem({ activity }: ActivityItemProps) {
    if (!activity || !activity.id) return null;

    // Handle createdAt - convert to Date if needed (though the hook should have handled it)
    const createdAt = activity.createdAt instanceof Date
        ? activity.createdAt
        : typeof activity.createdAt === 'string'
            ? new Date(activity.createdAt)
            : new Date();

    // Get user display name
    const userName = activity.user?.name || activity.user?.email || 'Unknown';

    // Get action text
    const actionText = activity.action || 'performed an action';

    return (
        <div className="px-2 py-3 hover:bg-muted/50 transition-colors rounded-md">
            <div className="flex flex-col gap-1">
                <p className="text-sm leading-relaxed break-words">
                    <span className="font-semibold text-foreground">
                        {userName}
                    </span>
                    {" "}
                    <span className="text-muted-foreground">
                        {actionText}
                    </span>
                </p>
                {activity.task?.content && (
                    <p className="text-xs text-muted-foreground/60 italic mt-0.5">
                        Task: "{activity.task.content}"
                    </p>
                )}
                <p className="text-xs text-muted-foreground/70 mt-1">
                    {createdAt.toLocaleString()}
                </p>
            </div>
        </div>
    );
}
