"use client";

import { Shield, LayoutDashboard, Users, FileQuestion, Settings, AlertCircle, LogOut, Zap, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoaded, logout } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user || role !== "admin") {
      router.push("/login");
    }
  }, [isLoaded, user, role, router]);

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">Loading...</div>;
  }

  if (!user || role !== "admin") {
    return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">Admin access required.</div>;
  }

  const navItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Manage Domains", href: "/admin/domains", icon: Settings },
    { name: "Smart Strike", href: "/admin/smart-strike", icon: Zap },
    { name: "Leaderboard", href: "/admin/leaderboard", icon: Trophy },
    { name: "Questions Bank", href: "/admin/questions", icon: FileQuestion },
    { name: "Participants", href: "/admin/users", icon: Users },
    { name: "Manage Admins", href: "/admin/manage-admins", icon: Shield },
  ];

  return (
    <div className="flex h-screen text-slate-200 overflow-hidden">
      {/* Sidebar Command Center */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <Shield className="w-8 h-8 text-rose-500" />
          <div>
            <h2 className="font-bold text-lg leading-tight text-white tracking-wide">COMMAND</h2>
            <p className="text-xs text-rose-400 font-mono">ADMIN_ACCESS</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-400 font-mono">SYSTEM ONLINE</span>
            </div>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 flex flex-col h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
