import { getBoards } from "@/actions/board";
import { getCurrentUser } from "@/actions/auth";
import { redirect } from "next/navigation";
import { CreateBoardModal } from "@/components/dashboard/create-board-modal";
import { JoinBoardDialog } from "@/components/dashboard/join-board-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { CardTitle, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/dashboard/navbar";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/");
    }

    const params = await searchParams;
    const query = params.q || "";
    const page = parseInt(params.page || "1", 10);
    const pageSize = 12;

    const { data: allBoards } = await getBoards();

    // Client-side filtering (search)
    const filtered = query
        ? allBoards?.filter((b) =>
            b.title.toLowerCase().includes(query.toLowerCase())
        )
        : allBoards;

    // Pagination
    const total = filtered?.length || 0;
    const totalPages = Math.ceil(total / pageSize);
    const boards = filtered?.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-background to-background" />

            <Navbar user={user} />

            <div className="container max-w-screen-2xl py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Boards</h1>
                        <p className="text-muted-foreground">Manage your projects and tasks.</p>
                    </div>
                    <DashboardSearch initialQuery={query} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Create New Board Card */}
                    <CreateBoardModal>
                        <button className="h-full min-h-[140px] w-full group relative flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 hover:border-border hover:bg-accent/5 transition-all duration-300">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/50 group-hover:bg-accent group-hover:scale-110 transition-all duration-300">
                                <Plus className="h-6 w-6 text-foreground/70" />
                            </div>
                            <span className="font-medium text-foreground/80">Create New Board</span>
                        </button>
                    </CreateBoardModal>

                    {/* Join Board Card */}
                    <JoinBoardDialog />

                    {/* Existing Boards */}
                    {boards?.map((board) => (
                        <Link key={board.id} href={`/board/${board.id}`} className="block h-full">
                            <GlassCard hoverEffect className="h-full flex flex-col min-h-[140px]">
                                <CardTitle className="mb-2 text-lg">{board.title}</CardTitle>
                                <CardContent className="p-0 mt-auto space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        {board.ownerId === user.id ? "You" : board.owner?.name || "Unknown"} · Created {new Date(board.createdAt).toLocaleDateString()}
                                    </p>
                                    {board.members && board.members.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {board.members.length} member{board.members.length > 1 ? "s" : ""}
                                        </p>
                                    )}
                                </CardContent>
                            </GlassCard>
                        </Link>
                    ))}

                    {boards?.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground bg-white/30 rounded-xl border border-dashed border-border/50">
                            {query ? `No boards matching "${query}".` : "No boards found. Create your first board or join one above."}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        {page > 1 && (
                            <Link
                                href={`/dashboard?${query ? `q=${query}&` : ""}page=${page - 1}`}
                                className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent/50 transition"
                            >
                                Previous
                            </Link>
                        )}
                        <span className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        {page < totalPages && (
                            <Link
                                href={`/dashboard?${query ? `q=${query}&` : ""}page=${page + 1}`}
                                className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent/50 transition"
                            >
                                Next
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
