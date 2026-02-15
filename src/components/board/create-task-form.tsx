"use client";

import { useState } from "react";
import { createTask } from "@/actions/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Or Textarea
import { Plus, X } from "lucide-react";

export function CreateTaskForm({ listId, boardId, onCreated }: { listId: string; boardId: string; onCreated?: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState("");

    const onSubmit = async () => {
        if (!content) return;
        await createTask(listId, content, boardId);
        setContent("");
        setIsEditing(false);
        onCreated?.();
    };

    if (!isEditing) {
        return (
            <Button
                className="w-full justify-start px-2 py-1.5 h-auto text-muted-foreground hover:text-foreground"
                variant="ghost"
                onClick={() => setIsEditing(true)}
            >
                <Plus className="h-4 w-4 mr-2" />
                Add a task
            </Button>
        );
    }

    return (
        <div className="space-y-2">
            <Input // Should be Textarea for multi-line? Input is minimal.
                placeholder="Enter task content..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
                className="h-8"
            />
            <div className="flex items-center gap-x-2">
                <Button onClick={onSubmit} size="sm">Add Task</Button>
                <Button onClick={() => setIsEditing(false)} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
