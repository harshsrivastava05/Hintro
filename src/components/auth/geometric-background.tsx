"use client";

import { motion } from "framer-motion";

export function GeometricBackground() {
    return (
        <div className="relative w-full h-full overflow-hidden bg-slate-900 flex items-center justify-center">
            {/* Soft gradient spot */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[120px] rounded-full" />

            {/* Abstract floating shapes */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="relative z-10 w-[400px] h-[400px]"
            >
                {/* Main Orb */}
                <motion.div
                    animate={{
                        y: [-20, 20, -20],
                        rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl"
                />

                {/* Satellite Shape 1 */}
                <motion.div
                    animate={{
                        x: [-30, 30, -30],
                        y: [20, -20, 20],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5,
                    }}
                    className="absolute top-10 right-[-40px] w-32 h-32 rounded-3xl bg-gradient-to-bl from-blue-400/20 to-purple-400/20 backdrop-blur-2xl border border-white/20"
                />

                {/* Satellite Shape 2 */}
                <motion.div
                    animate={{
                        x: [20, -20, 20],
                        y: [-10, 10, -10],
                        rotate: [0, 10, 0],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1,
                    }}
                    className="absolute bottom-20 left-[-60px] w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400/20 to-teal-400/20 backdrop-blur-xl border border-white/20"
                />
            </motion.div>

            {/* Grid overlay for technical feel */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

            <div className="absolute bottom-10 left-10 text-white/40 font-mono text-xs tracking-widest">
                SYSTEM: HINTRO v2.0 <br />
                STATUS: OPERATIONAL
            </div>
        </div>
    );
}
