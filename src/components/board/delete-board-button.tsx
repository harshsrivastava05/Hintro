"use client";

import { useState } from "react";
import { deleteBoard } from "@/actions/board";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeleteBoardButtonProps {
    boardId: string;
    boardTitle: string;
}

export function DeleteBoardButton({ boardId, boardTitle }: DeleteBoardButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${boardTitle}"? This action cannot be undone and will delete all lists, tasks, and activities.`)) {
            return;
        }

        setIsDeleting(true);
        const result = await deleteBoard(boardId);
        setIsDeleting(false);

        if (result.success) {
            router.push("/dashboard");
        } else {
            alert(result.error || "Failed to delete board");
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
            <Trash2 className="h-4 w-4 mr-1" />
            {isDeleting ? "Deleting..." : "Delete Board"}
        </Button>
    );
}

