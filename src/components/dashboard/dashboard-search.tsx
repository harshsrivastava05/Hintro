"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface DashboardSearchProps {
    initialQuery: string;
}

export function DashboardSearch({ initialQuery }: DashboardSearchProps) {
    const [query, setQuery] = useState(initialQuery);
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/dashboard?q=${encodeURIComponent(query.trim())}`);
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search boards..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-9"
            />
        </form>
    );
}
