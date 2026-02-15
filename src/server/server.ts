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

        // Client tells server about a board mutation → relay to OTHER clients in the room
        socket.on("notify-board-update", (boardId: string) => {
            console.log(`Board update notification for board:${boardId} from ${socket.id}`);
            socket.to(`board:${boardId}`).emit("board-updated");
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
