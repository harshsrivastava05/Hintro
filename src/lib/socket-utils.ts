export function emitBoardUpdate(boardId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io;
    if (io) io.to(`board:${boardId}`).emit("board-updated");
}

export function emitEvent(event: string, data: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io;
    if (io && data && typeof data === "object" && "boardId" in data) {
        io.to(`board:${(data as { boardId: string }).boardId}`).emit(event, data);
    }
}
