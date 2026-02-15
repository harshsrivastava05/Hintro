"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check } from "lucide-react";

interface ShareBoardDialogProps {
    boardId: string;
    members: { user: { id: string; name: string | null; email: string } }[];
    ownerName: string | null;
}

export function ShareBoardDialog({ boardId, members, ownerName }: ShareBoardDialogProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(boardId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2 text-black" />
                    <span className="text-black">Share</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share this board</DialogTitle>
                    <DialogDescription>
                        Share the board ID below with anyone to let them join and collaborate.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Input
                            value={boardId}
                            readOnly
                            className="font-mono text-sm bg-muted text-black"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopy}
                            className="shrink-0"
                        >
                            {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4 text-black" />
                            )}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-medium">Members</p>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                                    {ownerName?.[0]?.toUpperCase() || "O"}
                                </div>
                                {ownerName} (Owner)
                            </div>
                            {members.map((m) => (
                                <div key={m.user.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium">
                                        {m.user.name?.[0]?.toUpperCase() || "M"}
                                    </div>
                                    {m.user.name || m.user.email}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
