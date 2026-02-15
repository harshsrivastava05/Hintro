export interface Task {
    id: string;
    content: string;
    order: number;
    listId: string;
    assigneeId: string | null;
}

export interface List {
    id: string;
    title: string;
    order: number;
    tasks: Task[];
}

export interface Member {
    userId: string;
    user: { id: string; name: string | null; email: string };
}

export interface BoardContentProps {
    boardId: string;
    initialLists: List[];
    members: Member[];
    ownerId: string;
    ownerName: string | null;
}
