import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { realpathSync } from "fs";
// import express from "express"; // Using native http for simplicity with Next.js unless express needed for middleware

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// Resolve the real path to avoid Turbopack panics with Windows junctions (Dropbox Desktop backup)
const dir = realpathSync.native(process.cwd());
process.chdir(dir);
// when using middleware `hostname` and `port` must be provided  below
const app = next({ dev, hostname, port, dir });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            // Be sure to pass `true` as the second argument to `url.parse`.
            // This tells it to parse the query portion of the URL.
            const parsedUrl = parse(req.url!, true);
            const { pathname } = parsedUrl;

            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error("Error occurred handling", req.url, err);
            res.statusCode = 500;
            res.end("internal server error");
        }
    });

    const io = new Server(server, {
        path: "/api/socket/io",
        addTrailingSlash: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).io = io;

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        socket.on("join-board", (boardId: string) => {
            socket.join(`board:${boardId}`);
            console.log(`Socket ${socket.id} joined board:${boardId}`);
        });

        // Client tells server about a board mutation → relay to ALL clients in the room (including sender)
        socket.on("notify-board-update", (boardId: string) => {
            console.log(`Board update notification for board:${boardId} from ${socket.id}`);
            io.to(`board:${boardId}`).emit("board-updated");
        });

        // Handle specific update events with data
        socket.on("task-created", (data: { boardId: string; task: unknown; listId: string }) => {
            socket.to(`board:${data.boardId}`).emit("task-created", data);
        });

        socket.on("task-updated", (data: { boardId: string; task: unknown }) => {
            socket.to(`board:${data.boardId}`).emit("task-updated", data);
        });

        socket.on("task-deleted", (data: { boardId: string; taskId: string; listId: string }) => {
            socket.to(`board:${data.boardId}`).emit("task-deleted", data);
        });

        socket.on("task-moved", (data: { boardId: string; updates: unknown[] }) => {
            socket.to(`board:${data.boardId}`).emit("task-moved", data);
        });

        socket.on("list-created", (data: { boardId: string; list: unknown }) => {
            socket.to(`board:${data.boardId}`).emit("list-created", data);
        });

        socket.on("list-deleted", (data: { boardId: string; listId: string }) => {
            socket.to(`board:${data.boardId}`).emit("list-deleted", data);
        });

        socket.on("activity-updated", (data: { boardId: string }) => {
            socket.to(`board:${data.boardId}`).emit("activity-updated", data);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
