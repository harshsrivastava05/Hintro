"use client";

import { useState } from "react";
import { createList } from "@/actions/list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

export function CreateListForm({ boardId, onCreated }: { boardId: string; onCreated?: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState("");

    const onSubmit = async () => {
        if (!title) return;
        await createList(boardId, title);
        setTitle("");
        setIsEditing(false);
        onCreated?.();
    };

    if (!isEditing) {
        return (
            <Button
                className="w-80 shrink-0 h-10 px-2 justify-start font-medium"
                variant="secondary"
                onClick={() => setIsEditing(true)}
            >
                <Plus className="h-4 w-4 mr-2" />
                Add a list
            </Button>
        );
    }

    return (
        <div className="w-80 shrink-0 p-3 bg-secondary rounded-md space-y-4 shadow-sm">
            <Input
                placeholder="Enter list title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className="h-8"
            />
            <div className="flex items-center gap-x-2">
                <Button onClick={onSubmit} size="sm">Add List</Button>
                <Button onClick={() => setIsEditing(false)} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
