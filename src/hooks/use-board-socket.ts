import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { List, Task } from "@/types/board";

export const useBoardSocket = (boardId: string, initialLists: List[]) => {
    const [lists, setLists] = useState<List[]>(initialLists);
    const { socket } = useSocket();

    // Keep a ref to always have the latest socket (avoids stale closures in callbacks)
    const socketRef = useRef(socket);
    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    // Notify other clients via socket
    const notifyUpdate = useCallback(() => {
        const s = socketRef.current;
        if (s) {
            s.emit("notify-board-update", boardId);
        }
    }, [boardId]);

    useEffect(() => {
        if (!socket) return;

        const handleTaskCreated = (data: { listId: string; task: Task }) => {
            setLists((prevLists) =>
                prevLists.map((list) =>
                    list.id === data.listId
                        ? {
                            ...list,
                            tasks: [...list.tasks, data.task].sort((a, b) => a.order - b.order),
                        }
                        : list
                )
            );
        };

        const handleTaskUpdated = (data: { task: Task }) => {
            setLists((prevLists) =>
                prevLists.map((list) =>
                    list.tasks.some((t) => t.id === data.task.id)
                        ? {
                            ...list,
                            tasks: list.tasks.map((t) =>
                                t.id === data.task.id ? data.task : t
                            ),
                        }
                        : list
                )
            );
        };

        const handleTaskDeleted = (data: { taskId: string; listId: string }) => {
            setLists((prevLists) =>
                prevLists.map((list) =>
                    list.id === data.listId
                        ? {
                            ...list,
                            tasks: list.tasks.filter((t) => t.id !== data.taskId),
                        }
                        : list
                )
            );
        };

        const handleTaskMoved = (data: { updates: { id: string; listId: string; order: number }[] }) => {
            setLists((prevLists) => {
                const updatesMap = new Map(
                    data.updates.map((u) => [u.id, { listId: u.listId, order: u.order }])
                );

                const tasksToUpdate: Map<string, Task> = new Map();
                prevLists.forEach((list) => {
                    list.tasks.forEach((task) => {
                        if (updatesMap.has(task.id)) {
                            const update = updatesMap.get(task.id)!;
                            tasksToUpdate.set(task.id, {
                                ...task,
                                listId: update.listId,
                                order: update.order,
                            });
                        }
                    });
                });

                return prevLists.map((list) => {
                    const tasksInList: Task[] = [];

                    list.tasks.forEach((task) => {
                        if (!updatesMap.has(task.id)) {
                            tasksInList.push(task);
                        }
                    });

                    tasksToUpdate.forEach((task) => {
                        if (task.listId === list.id) {
                            tasksInList.push(task);
                        }
                    });

                    tasksInList.sort((a, b) => a.order - b.order);

                    return {
                        ...list,
                        tasks: tasksInList,
                    };
                });
            });
        };

        const handleListCreated = (data: { list: List }) => {
            setLists((prevLists) => [...prevLists, data.list]);
        };

        const handleListDeleted = (data: { listId: string }) => {
            setLists((prevLists) => prevLists.filter((list) => list.id !== data.listId));
        };

        socket.on("task-created", handleTaskCreated);
        socket.on("task-updated", handleTaskUpdated);
        socket.on("task-deleted", handleTaskDeleted);
        socket.on("task-moved", handleTaskMoved);
        socket.on("list-created", handleListCreated);
        socket.on("list-deleted", handleListDeleted);

        return () => {
            socket.off("task-created", handleTaskCreated);
            socket.off("task-updated", handleTaskUpdated);
            socket.off("task-deleted", handleTaskDeleted);
            socket.off("task-moved", handleTaskMoved);
            socket.off("list-created", handleListCreated);
            socket.off("list-deleted", handleListDeleted);
        };
    }, [socket]);

    return { lists, setLists, notifyUpdate };
};
