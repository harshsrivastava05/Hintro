"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateTaskForm } from "./create-task-form";
import { CreateListForm } from "./create-list-form";
import { TaskDetailDialog } from "./task-detail-dialog";
import { reorderTasks } from "@/actions/task";
import { deleteList } from "@/actions/list";
import { useSocket } from "@/components/providers/socket-provider";
import { Trash2 } from "lucide-react";

interface Task {
    id: string;
    content: string;
    order: number;
    listId: string;
    assigneeId: string | null;
}

interface List {
    id: string;
    title: string;
    order: number;
    tasks: Task[];
}

interface Member {
    userId: string;
    user: { id: string; name: string | null; email: string };
}

interface BoardContentProps {
    boardId: string;
    initialLists: List[];
    members: Member[];
    ownerId: string;
    ownerName: string | null;
}

export function BoardContent({ boardId, initialLists, members, ownerId, ownerName }: BoardContentProps) {
    const [lists, setLists] = useState<List[]>(initialLists);
    const { socket } = useSocket();

    // Keep a ref to always have the latest socket (avoids stale closures in callbacks)
    const socketRef = useRef(socket);
    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    // Listen to socket events for real-time updates
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
                // Create a map of updates by task id for quick lookup
                const updatesMap = new Map(
                    data.updates.map((u) => [u.id, { listId: u.listId, order: u.order }])
                );

                // Collect all tasks that need to be updated
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

                // Rebuild lists with updated tasks
                const newLists = prevLists.map((list) => {
                    // Get tasks that belong to this list after updates
                    const tasksInList: Task[] = [];
                    
                    // Add tasks that are already in this list and weren't moved
                    list.tasks.forEach((task) => {
                        if (!updatesMap.has(task.id)) {
                            tasksInList.push(task);
                        }
                    });

                    // Add tasks that were moved to this list
                    tasksToUpdate.forEach((task) => {
                        if (task.listId === list.id) {
                            tasksInList.push(task);
                        }
                    });

                    // Sort by order
                    tasksInList.sort((a, b) => a.order - b.order);

                    return {
                        ...list,
                        tasks: tasksInList,
                    };
                });

                return newLists;
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

    const allUsers = [
        { id: ownerId, name: ownerName || "Owner" },
        ...members.map((m) => ({ id: m.user.id, name: m.user.name || m.user.email })),
    ];

    const getAssigneeName = (assigneeId: string | null) => {
        if (!assigneeId) return null;
        return allUsers.find((u) => u.id === assigneeId)?.name || null;
    };

    // Notify other clients via socket — uses ref to always get the latest socket
    const notifyUpdate = useCallback(() => {
        const s = socketRef.current;
        console.log("[BoardContent] notifyUpdate called, socket:", !!s, "connected:", s?.connected);
        if (s) {
            s.emit("notify-board-update", boardId);
            console.log("[BoardContent] Emitted notify-board-update for board:", boardId);
        } else {
            console.warn("[BoardContent] Socket is null, cannot notify!");
        }
    }, [boardId]);

    const onDragEnd = useCallback(
        async (result: DropResult) => {
            const { destination, source } = result;

            if (!destination) return;
            if (
                destination.droppableId === source.droppableId &&
                destination.index === source.index
            ) {
                return;
            }

            const newLists = lists.map((list) => ({
                ...list,
                tasks: [...list.tasks],
            }));

            const sourceList = newLists.find((l) => l.id === source.droppableId);
            const destList = newLists.find((l) => l.id === destination.droppableId);

            if (!sourceList || !destList) return;

            const [movedTask] = sourceList.tasks.splice(source.index, 1);
            if (!movedTask) return;

            movedTask.listId = destination.droppableId;
            destList.tasks.splice(destination.index, 0, movedTask);

            const updates: { id: string; listId: string; order: number }[] = [];

            if (source.droppableId === destination.droppableId) {
                destList.tasks.forEach((task, index) => {
                    task.order = index;
                    updates.push({ id: task.id, listId: destList.id, order: index });
                });
            } else {
                sourceList.tasks.forEach((task, index) => {
                    task.order = index;
                    updates.push({ id: task.id, listId: sourceList.id, order: index });
                });
                destList.tasks.forEach((task, index) => {
                    task.order = index;
                    updates.push({ id: task.id, listId: destList.id, order: index });
                });
            }

            setLists(newLists);
            await reorderTasks(boardId, updates);
            // Socket event will be emitted by the server action, no need to notify manually
        },
        [lists, boardId]
    );

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-x-3 h-full items-start">
                {lists.map((list) => (
                    <div
                        key={list.id}
                        className="w-80 shrink-0 bg-secondary/50 rounded-md p-2"
                    >
                        <div className="px-2 py-3 font-semibold text-sm flex justify-between items-center">
                            <span>{list.title}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-normal text-muted-foreground">
                                    {list.tasks.length}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={async () => {
                                        if (confirm(`Delete list "${list.title}"? This will also delete all tasks in this list.`)) {
                                            await deleteList(list.id, boardId);
                                            notifyUpdate();
                                        }
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <Droppable droppableId={list.id}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex flex-col gap-y-2 mb-2 min-h-[20px] rounded transition-colors ${snapshot.isDraggingOver ? "bg-accent/30" : ""
                                        }`}
                                >
                                    {list.tasks.map((task, index) => (
                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                >
                                                    <TaskDetailDialog
                                                        task={task}
                                                        boardId={boardId}
                                                        members={members}
                                                        ownerId={ownerId}
                                                        ownerName={ownerName}
                                                        onMutate={notifyUpdate}
                                                    >
                                                        <Card
                                                            className={`bg-background shadow-sm transition-all cursor-grab active:cursor-grabbing ${snapshot.isDragging
                                                                    ? "shadow-lg rotate-2 scale-105"
                                                                    : "hover:shadow-md"
                                                                }`}
                                                        >
                                                            <CardContent className="p-3 text-sm">
                                                                <p>{task.content}</p>
                                                                {task.assigneeId && (
                                                                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                                                        <span className="h-4 w-4 rounded-full bg-primary/20 text-[10px] flex items-center justify-center font-medium">
                                                                            {getAssigneeName(task.assigneeId)?.[0]?.toUpperCase() || "?"}
                                                                        </span>
                                                                        {getAssigneeName(task.assigneeId)}
                                                                    </p>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    </TaskDetailDialog>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                        <CreateTaskForm listId={list.id} boardId={boardId} onCreated={notifyUpdate} />
                    </div>
                ))}
                <CreateListForm boardId={boardId} onCreated={notifyUpdate} />
            </div>
        </DragDropContext>
    );
}
