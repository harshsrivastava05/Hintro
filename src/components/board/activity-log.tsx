"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { useActivityLog } from "@/hooks/use-activity-log";
import { ActivityItem } from "./activity-item";

interface ActivityLogProps {
    boardId: string;
}

export function ActivityLog({ boardId }: ActivityLogProps) {
    const [open, setOpen] = useState(false);
    const { activities, page, setPage, totalPages, loading } = useActivityLog(boardId, open);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                >
                    <Activity className="h-4 w-4 text-slate-900" />
                    <span className="text-black">Activity</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col ">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 ">
                        <Activity className="h-5 w-5 " />
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
                            {activities.map((activity) => (
                                <ActivityItem key={activity.id} activity={activity} />
                            ))}
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
