"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Shield, GlobeLock, Cpu, Server, Database, CloudRain, Binary, Cog, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, isLoaded, logout } = useAuth();

  return (
    <div className="flex flex-col min-h-screen text-slate-200 overflow-hidden relative">
      {/* Background Cyber Grids & Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Navigation */}
      <nav className="w-full z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-cyan-400" />
          <span className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            TECH BID
          </span>
        </div>
        <div className="flex gap-4 items-center">
          {(!isLoaded || !user) ? (
            <Link href="/login">
              <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300">
                Initiate Login Protocol
              </Button>
            </Link>
          ) : (
            <>
              <Link href={user.role === "admin" ? "/admin" : "/participant"}>
                <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  {user.role === "admin" ? "Admin Panel" : "Enter Dashboard"}
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full border-2 border-cyan-500 bg-slate-800 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <button onClick={logout} className="text-slate-400 hover:text-slate-200 transition-colors" title="Sign out">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            System Online • Registration Open
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight uppercase leading-none">
            Prove Your Worth in <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 animate-pulse">
              10 Tech Domains
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            A real-time auction and buzzer-beating competition. Bid on questions, outsmart your rivals, and assert dominance across Blockchain, AI, Cyber, and more.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {(!isLoaded || !user) ? (
              <Link href="/login">
                <Button className="h-12 px-8 text-base bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all">
                  Join the Grid
                </Button>
              </Link>
            ) : (
              <Link href={user.role === "admin" ? "/admin" : "/participant"}>
                <Button className="h-12 px-8 text-base bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
                  Access Terminal
                </Button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Floating Domain Icons */}
        <div className="mt-24 grid grid-cols-5 md:flex md:flex-wrap justify-center gap-6 opacity-60">
          {[GlobeLock, Shield, Cpu, Server, Database, CloudRain, Binary, Cog].map((Icon, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
            >
              <Icon className="w-8 h-8" />
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
