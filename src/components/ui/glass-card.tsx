"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export function GlassCard({ children, className, hoverEffect = false, ...props }: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            whileHover={hoverEffect ? { y: -5, transition: { duration: 0.2 } } : undefined}
            className={cn(
                "glass rounded-xl p-6",
                hoverEffect && "hover:shadow-md hover:border-white/40 transition-shadow duration-300",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
}
