"use client";

import { useState, useEffect } from "react";
import { getBoardActivities } from "@/actions/task";
import { Button } from "@/components/ui/button";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";

interface ActivityLogProps {
    boardId: string;
}

interface ActivityItem {
    id: string;
    action: string;
    createdAt: Date;
    user: { name: string | null; email: string };
    task: { content: string };
}

export function ActivityLog({ boardId }: ActivityLogProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const fetchActivities = async (p: number) => {
        setLoading(true);
        const result = await getBoardActivities(boardId, p, 10);
        if (result.success && result.data) {
            setActivities(result.data as ActivityItem[]);
            setTotalPages(result.pagination!.totalPages);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (open) fetchActivities(page);
    }, [page, open]);

    if (!open) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="gap-1"
            >
                <Activity className="h-4 w-4" />
                Activity
            </Button>
        );
    }

    return (
        <div className="fixed right-0 top-14 bottom-0 w-80 bg-background border-l border-border/40 z-30 flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-3 border-b border-border/40">
                <h3 className="font-semibold text-sm flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    Activity Log
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    ✕
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
                ) : activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
                ) : (
                    activities.map((a) => (
                        <div key={a.id} className="text-sm border-b border-border/20 pb-2">
                            <p>
                                <span className="font-medium">{a.user.name || a.user.email}</span>{" "}
                                <span className="text-muted-foreground">{a.action}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(a.createdAt).toLocaleString()}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border/40">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
