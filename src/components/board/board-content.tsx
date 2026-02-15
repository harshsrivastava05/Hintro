"use client";

import { useState, useCallback } from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { CreateTaskForm } from "./create-task-form";
import { CreateListForm } from "./create-list-form";
import { TaskDetailDialog } from "./task-detail-dialog";
import { reorderTasks } from "@/actions/task";
import { useSocket } from "@/components/providers/socket-provider";

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

    const allUsers = [
        { id: ownerId, name: ownerName || "Owner" },
        ...members.map((m) => ({ id: m.user.id, name: m.user.name || m.user.email })),
    ];

    const getAssigneeName = (assigneeId: string | null) => {
        if (!assigneeId) return null;
        return allUsers.find((u) => u.id === assigneeId)?.name || null;
    };

    // Notify other clients via socket
    const notifyUpdate = useCallback(() => {
        if (socket) {
            socket.emit("notify-board-update", boardId);
        }
    }, [socket, boardId]);

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
            notifyUpdate();
        },
        [lists, boardId, notifyUpdate]
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
                            {list.title}
                            <span className="text-xs font-normal text-muted-foreground">
                                {list.tasks.length}
                            </span>
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
