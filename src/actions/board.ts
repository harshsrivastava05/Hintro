"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "./auth";
import { revalidatePath } from "next/cache";

export async function createBoard(title: string) {
    const user = await getCurrentUser();
    if (!user) {
        return { error: "Unauthorized" };
    }

    const board = await db.board.create({
        data: {
            title,
            ownerId: user.id,
        },
    });

    revalidatePath("/dashboard");
    return { success: true, data: board };
}

export async function getBoards() {
    const user = await getCurrentUser();
    if (!user) {
        return { error: "Unauthorized" };
    }

    const boards = await db.board.findMany({
        where: {
            OR: [
                { ownerId: user.id },
                { members: { some: { userId: user.id } } },
            ],
        },
        include: {
            owner: { select: { name: true } },
            members: { select: { userId: true } },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    return { success: true, data: boards };
}

export async function getBoardById(boardId: string) {
    const user = await getCurrentUser();
    if (!user) {
        return { error: "Unauthorized" };
    }

    const board = await db.board.findUnique({
        where: {
            id: boardId,
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: {
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
            },
            lists: {
                orderBy: {
                    order: "asc"
                },
                include: {
                    tasks: {
                        orderBy: {
                            order: "asc"
                        }
                    }
                }
            }
        }
    });

    if (!board) return { error: "Not found" };

    // Allow access if user is owner OR a member
    const isMember = board.members.some((m) => m.userId === user.id);
    if (board.ownerId !== user.id && !isMember) {
        return { error: "Unauthorized" };
    }

    return { success: true, data: board };
}

export async function joinBoard(boardId: string) {
    const user = await getCurrentUser();
    if (!user) {
        return { error: "Unauthorized" };
    }

    const board = await db.board.findUnique({ where: { id: boardId } });
    if (!board) {
        return { error: "Board not found. Check the ID and try again." };
    }

    if (board.ownerId === user.id) {
        return { error: "You already own this board." };
    }

    // Check if already a member
    const existing = await db.boardMember.findUnique({
        where: {
            userId_boardId: { userId: user.id, boardId },
        },
    });

    if (existing) {
        return { error: "You are already a member of this board." };
    }

    await db.boardMember.create({
        data: {
            userId: user.id,
            boardId,
        },
    });

    revalidatePath("/dashboard");
    return { success: true };
}

export async function deleteBoard(boardId: string) {
    const user = await getCurrentUser();
    if (!user) {
        return { error: "Unauthorized" };
    }

    const board = await db.board.findUnique({
        where: { id: boardId },
    });

    if (!board) {
        return { error: "Board not found" };
    }

    // Only the owner can delete the board
    if (board.ownerId !== user.id) {
        return { error: "Only the board owner can delete the board" };
    }

    // Delete the board (cascade will delete lists, tasks, activities, and members)
    await db.board.delete({
        where: { id: boardId },
    });

    revalidatePath("/dashboard");
    return { success: true };
}