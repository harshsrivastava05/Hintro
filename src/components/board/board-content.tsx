"use client";

import { useCallback } from "react";
import {
    DragDropContext,
    type DropResult,
} from "@hello-pangea/dnd";
import { CreateListForm } from "./create-list-form";
import { reorderTasks } from "@/actions/task";
import { useBoardSocket } from "@/hooks/use-board-socket";
import { ListColumn } from "./list-column";
import { BoardContentProps } from "@/types/board";

export function BoardContent({ boardId, initialLists, members, ownerId, ownerName }: BoardContentProps) {
    const { lists, setLists, notifyUpdate } = useBoardSocket(boardId, initialLists);

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
            // Socket event will be emitted by the server action
        },
        [lists, boardId, setLists]
    );

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-x-3 h-full items-start">
                {lists.map((list) => (
                    <ListColumn
                        key={list.id}
                        list={list}
                        boardId={boardId}
                        members={members}
                        ownerId={ownerId}
                        ownerName={ownerName}
                        notifyUpdate={notifyUpdate}
                    />
                ))}
                <CreateListForm boardId={boardId} onCreated={notifyUpdate} />
            </div>
        </DragDropContext>
    );
}
