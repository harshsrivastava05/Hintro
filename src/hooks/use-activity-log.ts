import { useState, useEffect, useCallback, useRef } from "react";
import { getBoardActivities } from "@/actions/task";
import { useSocket } from "@/components/providers/socket-provider";
import { toast } from "sonner";
import { ActivityItem } from "@/types/activity";

// Cache for activities per board
const activityCache = new Map<string, {
    activities: ActivityItem[];
    totalPages: number;
    lastFetched: number;
    page: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useActivityLog(boardId: string, open: boolean) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const { socket } = useSocket();
    const [lastActivityId, setLastActivityId] = useState<string | null>(null);
    const cacheInvalidatedRef = useRef(false);

    const processActivities = useCallback((data: unknown[]): ActivityItem[] => {
        return data.map((a: unknown) => {
            if (!a || typeof a !== 'object') return null;
            const activity = a as Record<string, unknown>;
            return {
                id: String(activity.id || ''),
                action: String(activity.action || ''),
                createdAt: activity.createdAt instanceof Date
                    ? activity.createdAt
                    : typeof activity.createdAt === 'string'
                        ? new Date(activity.createdAt)
                        : new Date(),
                user: activity.user && typeof activity.user === 'object'
                    ? {
                        name: (activity.user as { name?: unknown }).name as string | null,
                        email: String((activity.user as { email?: unknown }).email || ''),
                    }
                    : { name: null, email: '' },
                task: activity.task && typeof activity.task === 'object'
                    ? {
                        content: String((activity.task as { content?: unknown }).content || ''),
                    }
                    : { content: '' },
            } as ActivityItem;
        }).filter((a): a is ActivityItem => a !== null);
    }, []);

    const fetchActivities = useCallback(async (p: number, forceRefresh = false) => {
        const cacheKey = `${boardId}-${p}`;
        const cached = activityCache.get(cacheKey);
        const now = Date.now();

        // Use cache if available, not invalidated, and not expired
        if (!forceRefresh && cached && !cacheInvalidatedRef.current && (now - cached.lastFetched) < CACHE_DURATION) {
            setActivities(cached.activities);
            setTotalPages(cached.totalPages);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const result = await getBoardActivities(boardId, p, 15);
            if (result.success && result.data) {
                const processedActivities = processActivities(result.data as unknown[]);
                const totalPagesValue = result.pagination?.totalPages || 1;

                // Update cache
                activityCache.set(cacheKey, {
                    activities: processedActivities,
                    totalPages: totalPagesValue,
                    lastFetched: now,
                    page: p,
                });

                setActivities(processedActivities);
                setTotalPages(totalPagesValue);

                // Reset invalidation flag after successful fetch
                if (cacheInvalidatedRef.current) {
                    cacheInvalidatedRef.current = false;
                }
            } else {
                setActivities([]);
                setTotalPages(0);
            }
        } catch (error) {
            console.error("[ActivityLog] Error fetching activities:", error);
            setActivities([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    }, [boardId, processActivities]);

    // Load from cache or fetch when dialog opens or page changes
    useEffect(() => {
        if (open) {
            fetchActivities(page, false);
        }
    }, [page, open, fetchActivities]);

    // Invalidate cache and refresh when activities are updated via socket
    useEffect(() => {
        if (!socket) return;
        const handleActivityUpdate = () => {
            // Invalidate all cache entries for this board
            const keysToDelete: string[] = [];
            activityCache.forEach((_, key) => {
                if (key.startsWith(`${boardId}-`)) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach(key => activityCache.delete(key));

            // Mark cache as invalidated
            cacheInvalidatedRef.current = true;

            // Refresh if dialog is open
            if (open) {
                fetchActivities(page, true);
            }
        };
        socket.on("activity-updated", handleActivityUpdate);
        return () => {
            socket.off("activity-updated", handleActivityUpdate);
        };
    }, [socket, open, page, boardId, fetchActivities]);

    // Listen for activity updates even when dialog is closed (for toasts)
    useEffect(() => {
        if (!socket) return;
        const handleActivityUpdate = async () => {
            // Invalidate cache for toast
            const cacheKey = `${boardId}-1`;
            activityCache.delete(cacheKey);
            cacheInvalidatedRef.current = true;

            // Fetch only the latest activity to show toast
            try {
                const result = await getBoardActivities(boardId, 1, 1);
                if (result.success && result.data && result.data.length > 0) {
                    const processed = processActivities(result.data as unknown[]);
                    if (processed.length > 0) {
                        const latestActivity = processed[0];
                        const activityId = latestActivity.id;

                        // Only show toast if this is a new activity
                        if (activityId && activityId !== lastActivityId) {
                            const userName = latestActivity.user?.name || latestActivity.user?.email || 'Someone';
                            const actionText = latestActivity.action || 'performed an action';
                            const taskContent = latestActivity.task?.content || '';

                            toast.info(`${userName} ${actionText}`, {
                                description: taskContent ? `Task: "${taskContent}"` : undefined,
                                duration: 4000,
                            });

                            setLastActivityId(activityId);

                            // Update cache with new data
                            activityCache.set(cacheKey, {
                                activities: processed,
                                totalPages: result.pagination?.totalPages || 1,
                                lastFetched: Date.now(),
                                page: 1,
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("[ActivityLog] Error fetching latest activity for toast:", error);
            }
        };
        socket.on("activity-updated", handleActivityUpdate);
        return () => {
            socket.off("activity-updated", handleActivityUpdate);
        };
    }, [socket, boardId, lastActivityId, processActivities]);

    return {
        activities,
        page,
        setPage,
        totalPages,
        loading
    };
}
