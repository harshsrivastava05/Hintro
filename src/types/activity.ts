export interface ActivityItem {
    id: string;
    action: string;
    createdAt: Date | string;
    user: { name: string | null; email: string };
    task: { content: string };
}
