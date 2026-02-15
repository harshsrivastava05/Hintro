"use client";

import { useState } from "react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm({ onToggle }: { onToggle: () => void }) {
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        const result = await login(formData);
        if (result.error) {
            setError(result.error);
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
                <p className="text-sm text-muted-foreground">
                    Enter your credentials to access your workspace.
                </p>
            </div>
            <form action={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                    <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-white/50" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                    <Input id="password" name="password" type="password" required className="bg-white/50" />
                </div>
                {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}

                <Button type="button" variant="link" className="px-0 font-normal self-start h-auto">
                    Forgot password?
                </Button>

                <Button type="submit" className="w-full h-11 text-base shadow-md">
                    Sign in
                </Button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>

            <Button type="button" variant="outline" className="w-full h-11" onClick={onToggle}>
                Create an account
            </Button>
        </div>
    );
}
