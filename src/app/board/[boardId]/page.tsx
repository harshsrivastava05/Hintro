import { getBoardById } from "@/actions/board";
import { getCurrentUser } from "@/actions/auth";
import { redirect, notFound } from "next/navigation";
import { BoardContent } from "@/components/board/board-content";
import { BoardRealtime } from "@/components/board/board-realtime";
import { ShareBoardDialog } from "@/components/board/share-board-dialog";
import { ActivityLog } from "@/components/board/activity-log";
import { DeleteBoardButton } from "@/components/board/delete-board-button";
import Link from "next/link";

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
        <div
            className="min-h-screen bg-no-repeat bg-cover bg-center relative"
            style={{
                backgroundImage: board.imageFullUrl ? `url(${board.imageFullUrl})` : undefined,
                backgroundColor: board.imageFullUrl ? undefined : "hsl(var(--background))"
            }}
        >
            {/* Dark overlay if image exists */}
            {board.imageFullUrl && <div className="absolute inset-0 bg-black/50" />}

            {/* Board Header */}
            <div className={`border-b border-border/40 backdrop-blur sticky top-0 z-40 ${board.imageFullUrl ? "bg-black/50 text-white border-transparent" : "bg-background/95"}`}>
                <div className="container max-w-screen-2xl flex items-center justify-between h-14 px-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className={`text-sm transition-colors ${board.imageFullUrl ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}>
                            ← Boards
                        </Link>
                    </div>
                </div>

                <div className="container max-w-screen-2xl flex items-center justify-between h-14 px-4 pt-4 pb-2">
                    <h1 className="text-xl font-bold">{board.title}</h1>
                    <div className="flex items-center gap-2">
                        {/* Board Actions */}
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
            <div className="p-4 overflow-x-auto relative z-10 h-[calc(100vh-130px)]">
                <BoardContent
                    boardId={board.id}
                    initialLists={board.lists}
                    members={board.members}
                    ownerId={board.owner.id}
                    ownerName={board.owner.name}
                />
            </div>

            {/* Attribution */}
            {board.imageLinkHTML && (
                <div className="absolute bottom-2 right-2 z-50 text-[10px] text-white/60 bg-black/40 px-2 py-1 rounded">
                    Photo by{" "}
                    <a
                        href={board.imageLinkHTML}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white"
                    >
                        {board.imageUserName}
                    </a>
                    {" "}on{" "}
                    <a
                        href="https://unsplash.com/?utm_source=hintro&utm_medium=referral"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white"
                    >
                        Unsplash
                    </a>
                </div>
            )}

            <BoardRealtime boardId={board.id} />
        </div>
    );
}
