"use use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateTaskForm } from "./create-task-form";
import { TaskDetailDialog } from "./task-detail-dialog";
import { deleteList } from "@/actions/list";
import { Trash2 } from "lucide-react";
import { List, Member } from "@/types/board";

interface ListColumnProps {
    list: List;
    boardId: string;
    members: Member[];
    ownerId: string;
    ownerName: string | null;
    notifyUpdate: () => void;
}

export function ListColumn({
    list,
    boardId,
    members,
    ownerId,
    ownerName,
    notifyUpdate,
}: ListColumnProps) {
    const getAssigneeName = (assigneeId: string | null) => {
        if (!assigneeId) return null;
        const allUsers = [
            { id: ownerId, name: ownerName || "Owner" },
            ...members.map((m) => ({ id: m.user.id, name: m.user.name || m.user.email })),
        ];
        return allUsers.find((u) => u.id === assigneeId)?.name || null;
    };

    return (
        <div className="w-80 shrink-0 bg-white/90 rounded-md p-2 shadow-sm">
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
    );
}
