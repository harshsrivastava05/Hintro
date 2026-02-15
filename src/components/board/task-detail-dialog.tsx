"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTaskContent, deleteTask, assignTask } from "@/actions/task";
import { Trash2, UserPlus } from "lucide-react";

interface TaskDetailDialogProps {
    task: {
        id: string;
        content: string;
        assigneeId: string | null;
    };
    boardId: string;
    members: { userId: string; user: { id: string; name: string | null; email: string } }[];
    ownerId: string;
    ownerName: string | null;
    onMutate?: () => void;
    children: React.ReactNode;
}

export function TaskDetailDialog({
    task,
    boardId,
    members,
    ownerId,
    ownerName,
    onMutate,
    children,
}: TaskDetailDialogProps) {
    const [open, setOpen] = useState(false);
    const [content, setContent] = useState(task.content);
    const [saving, setSaving] = useState(false);

    const allUsers = [
        { id: ownerId, name: ownerName || "Owner" },
        ...members.map((m) => ({ id: m.user.id, name: m.user.name || m.user.email })),
    ];

    const handleSave = async () => {
        if (!content.trim() || content === task.content) return;
        setSaving(true);
        await updateTaskContent(task.id, content.trim(), boardId);
        setSaving(false);
        onMutate?.();
    };

    const handleDelete = async () => {
        await deleteTask(task.id, boardId);
        setOpen(false);
        onMutate?.();
    };

    const handleAssign = async (userId: string | null) => {
        await assignTask(task.id, userId, boardId);
        onMutate?.();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Content */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Content</label>
                        <Input
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="text-sm"
                        />
                        {content !== task.content && (
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : "Save"}
                            </Button>
                        )}
                    </div>

                    {/* Assign */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-1">
                            <UserPlus className="h-3.5 w-3.5" />
                            Assign to
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={task.assigneeId === null ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleAssign(null)}
                                className="text-xs"
                            >
                                Unassigned
                            </Button>
                            {allUsers.map((u) => (
                                <Button
                                    key={u.id}
                                    variant={task.assigneeId === u.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleAssign(u.id)}
                                    className="text-xs"
                                >
                                    {u.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-row justify-between sm:justify-between">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
