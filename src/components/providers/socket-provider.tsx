"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        if (socketRef.current) return; // Already initialized

        const url = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        console.log("[SocketProvider] Connecting to:", url);

        const socketInstance = io(url, {
            path: "/api/socket/io",
            addTrailingSlash: false,
        });

        socketInstance.on("connect", () => {
            console.log("[SocketProvider] Connected:", socketInstance.id);
            setIsConnected(true);
            forceUpdate((n) => n + 1); // Force re-render so children get the socket
        });

        socketInstance.on("disconnect", () => {
            console.log("[SocketProvider] Disconnected");
            setIsConnected(false);
        });

        socketInstance.on("connect_error", (err) => {
            console.error("[SocketProvider] Connection error:", err.message);
        });

        socketRef.current = socketInstance;
        forceUpdate((n) => n + 1); // Trigger re-render with socket instance

        return () => {
            socketInstance.disconnect();
            socketRef.current = null;
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
