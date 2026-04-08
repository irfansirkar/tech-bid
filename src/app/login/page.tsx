"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Shield, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const { loginAsParticipant, loginAsAdmin, user, isLoaded } = useAuth();
    const [mode, setMode] = useState<"participant" | "admin">("participant");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    // Redirect if already logged in
    useEffect(() => {
        if (isLoaded && user) {
            if (user.role === "admin") {
                router.push("/admin");
            } else {
                router.push("/participant");
            }
        }
    }, [isLoaded, user, router]);

    // Don't render form if user is logged in (redirect is in progress)
    if (isLoaded && user) {
        return null;
    }

    const handleParticipantLogin = () => {
        if (!username.trim()) {
            setError("Please enter a username");
            return;
        }
        loginAsParticipant(username.trim());
        router.push("/participant");
    };

    const handleAdminLogin = () => {
        if (!password) {
            setError("Please enter the admin password");
            return;
        }
        const success = loginAsAdmin(password);
        if (success) {
            router.push("/admin");
        } else {
            setError("Invalid admin password");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (mode === "participant") {
                handleParticipantLogin();
            } else {
                handleAdminLogin();
            }
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">
                Loading...
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen text-slate-200 overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />

            {/* Nav */}
            <nav className="w-full z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
                <Link href="/" className="flex items-center gap-2">
                    <Zap className="w-6 h-6 text-cyan-400" />
                    <span className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                        TECH BID
                    </span>
                </Link>
            </nav>

            {/* Login Form */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full max-w-md"
                >
                    {/* Mode Toggle */}
                    <div className="flex mb-8 rounded-xl overflow-hidden border border-white/10">
                        <button
                            onClick={() => { setMode("participant"); setError(""); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold transition-all ${mode === "participant"
                                ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500"
                                : "bg-slate-900/50 text-slate-400 hover:text-slate-300"
                                }`}
                        >
                            <User className="w-4 h-4" />
                            Participant
                        </button>
                        <button
                            onClick={() => { setMode("admin"); setError(""); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold transition-all ${mode === "admin"
                                ? "bg-rose-500/20 text-rose-400 border-b-2 border-rose-500"
                                : "bg-slate-900/50 text-slate-400 hover:text-slate-300"
                                }`}
                        >
                            <Shield className="w-4 h-4" />
                            Admin
                        </button>
                    </div>

                    {/* Card */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${mode === "participant"
                                ? "bg-emerald-500/20 border border-emerald-500/30"
                                : "bg-rose-500/20 border border-rose-500/30"
                                }`}>
                                {mode === "participant"
                                    ? <User className="w-8 h-8 text-emerald-400" />
                                    : <Shield className="w-8 h-8 text-rose-400" />
                                }
                            </div>
                            <h1 className="text-2xl font-black text-white tracking-wide">
                                {mode === "participant" ? "Join the Arena" : "Admin Access"}
                            </h1>
                            <p className="text-sm text-slate-400 mt-2">
                                {mode === "participant"
                                    ? "Enter your username to start competing"
                                    : "Enter the admin password to access controls"
                                }
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {mode === "participant" ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2 block">
                                        Username
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="Enter your username..."
                                        value={username}
                                        onChange={(e) => { setUsername(e.target.value); setError(""); }}
                                        onKeyDown={handleKeyDown}
                                        className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 h-12 text-base focus:border-emerald-500 focus:ring-emerald-500/20"
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    onClick={handleParticipantLogin}
                                    className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all"
                                >
                                    Sign in as Participant
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2 block">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter admin password..."
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                            onKeyDown={handleKeyDown}
                                            className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 h-12 text-base focus:border-rose-500 focus:ring-rose-500/20 pr-12"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleAdminLogin}
                                    className="w-full h-12 text-base bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] transition-all"
                                >
                                    Sign in as Admin
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <p className="text-center text-slate-500 text-xs mt-6">
                        TECH BID • Secure Access Protocol
                    </p>
                </motion.div>
            </main>
        </div>
    );
}
