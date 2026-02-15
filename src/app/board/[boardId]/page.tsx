import { getBoardById } from "@/actions/board";
import { getCurrentUser } from "@/actions/auth";
import { redirect, notFound } from "next/navigation";
import { BoardContent } from "@/components/board/board-content";
import { BoardRealtime } from "@/components/board/board-realtime";
import { ShareBoardDialog } from "@/components/board/share-board-dialog";
import { ActivityLog } from "@/components/board/activity-log";
import { DeleteBoardButton } from "@/components/board/delete-board-button";

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/");
    }

    const { boardId } = await params;
    const { data: board, error } = await getBoardById(boardId);

    if (error || !board) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Board Header */}
            <div className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-40">
                <div className="container max-w-screen-2xl flex items-center justify-between h-14 px-4">
                    <div className="flex items-center gap-4">
                        <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            ← Boards
                        </a>
                        <h1 className="text-lg font-semibold">{board.title}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <ActivityLog boardId={board.id} />
                        <ShareBoardDialog
                            boardId={board.id}
                            members={board.members}
                            ownerName={board.owner.name}
                        />
                        {board.ownerId === user.id && (
                            <DeleteBoardButton boardId={board.id} boardTitle={board.title} />
                        )}
                    </div>
                </div>
            </div>

            {/* Board Content */}
            <div className="p-4 overflow-x-auto">
                <BoardContent
                    boardId={board.id}
                    initialLists={board.lists}
                    members={board.members}
                    ownerId={board.owner.id}
                    ownerName={board.owner.name}
                />
            </div>
            <BoardRealtime boardId={board.id} />
        </div>
    );
}
