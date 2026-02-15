"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";

interface BoardRealtimeProps {
    boardId: string;
}

export const BoardRealtime = ({ boardId }: BoardRealtimeProps) => {
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        if (!socket) {
            console.log("[BoardRealtime] No socket available yet");
            return;
        }

        console.log("[BoardRealtime] Socket available, connected:", socket.connected, "id:", socket.id);

        const joinBoard = () => {
            console.log("[BoardRealtime] Emitting join-board for:", boardId);
            socket.emit("join-board", boardId);
        };

        // Join immediately if already connected
        if (socket.connected) {
            joinBoard();
        }

        // Also join on future connects (reconnections)
        socket.on("connect", joinBoard);

        // Note: Actual state updates are handled by BoardContent component
        // This component just ensures we're joined to the board room

        return () => {
            socket.off("connect", joinBoard);
        };
    }, [socket, isConnected, boardId]);

    return null;
};
