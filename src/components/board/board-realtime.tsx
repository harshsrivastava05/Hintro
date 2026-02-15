"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useRouter } from "next/navigation";

interface BoardRealtimeProps {
    boardId: string;
}

export const BoardRealtime = ({ boardId }: BoardRealtimeProps) => {
    const { socket } = useSocket();
    const router = useRouter();

    useEffect(() => {
        if (!socket) return;

        socket.emit("join-board", boardId);

        const handleUpdate = () => {
            router.refresh();
        };

        socket.on("board-updated", handleUpdate);

        return () => {
            socket.off("board-updated", handleUpdate);
        }
    }, [socket, boardId, router]);

    return null;
}
