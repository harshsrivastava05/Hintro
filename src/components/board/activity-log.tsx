"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getBoardActivities } from "@/actions/task";
import { useSocket } from "@/components/providers/socket-provider";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface ActivityLogProps {
    boardId: string;
}

interface ActivityItem {
    id: string;
    action: string;
    createdAt: Date | string;
    user: { name: string | null; email: string };
    task: { content: string };
}

// Cache for activities per board
const activityCache = new Map<string, {
    activities: ActivityItem[];
    totalPages: number;
    lastFetched: number;
    page: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function ActivityLog({ boardId }: ActivityLogProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                >
                    <Activity className="h-4 w-4" />
                    Activity
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Log
                    </DialogTitle>
                </DialogHeader>

                {/* Activity List Container */}
                <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-sm text-muted-foreground">Loading activities...</p>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground text-center">
                                No activity yet.
                            </p>
                            <p className="text-xs text-muted-foreground/70 text-center mt-1">
                                Activities will appear here as you work on the board.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {activities.map((activity) => {
                                if (!activity || !activity.id) return null;

                                // Handle createdAt - convert to Date if needed
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
                                    <div 
                                        key={activity.id} 
                                        className="px-2 py-3 hover:bg-muted/50 transition-colors rounded-md"
                                    >
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
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between py-2 border-t border-border -mx-6 px-6 mt-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={page <= 1 || loading}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Prev
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
