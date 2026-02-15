"use client";

import { useState } from "react";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { GeometricBackground } from "./geometric-background";
import { motion, AnimatePresence } from "framer-motion";

export function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className="flex w-full h-screen overflow-hidden bg-background">
            {/* Left Column: Abstract Visual */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <GeometricBackground />
            </div>

            {/* Right Column: Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">
                            Hintro
                        </h1>
                        <p className="text-muted-foreground">
                            Future-ready task management for the modern era.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isLogin ? "login" : "register"}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {isLogin ? (
                                <LoginForm onToggle={() => setIsLogin(false)} />
                            ) : (
                                <RegisterForm onToggle={() => setIsLogin(true)} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
