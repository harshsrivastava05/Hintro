"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinBoard } from "@/actions/board";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";

export function JoinBoardDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [boardId, setBoardId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async () => {
        if (!boardId.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const result = await joinBoard(boardId.trim());
            if (result.error) {
                setError(result.error);
            } else {
                setOpen(false);
                setBoardId("");
                router.refresh();
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="h-full min-h-[140px] w-full group relative flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 hover:border-border hover:bg-accent/5 transition-all duration-300">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/50 group-hover:bg-accent group-hover:scale-110 transition-all duration-300">
                        <UserPlus className="h-6 w-6 text-foreground/70" />
                    </div>
                    <span className="font-medium text-foreground/80">Join a Board</span>
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Join a Board</DialogTitle>
                    <DialogDescription>
                        Paste the board ID shared with you to join and collaborate.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Input
                        placeholder="Paste board ID here..."
                        value={boardId}
                        onChange={(e) => setBoardId(e.target.value)}
                        className="font-mono text-sm"
                    />
                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={loading || !boardId.trim()}>
                        {loading ? "Joining..." : "Join Board"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
