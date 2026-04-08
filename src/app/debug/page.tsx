"use client";

import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DebugPage() {
  const { user, role, isLoaded, logout } = useAuth();

  if (!isLoaded) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <h1 className="text-3xl font-bold text-white mb-8">Auth Debug</h1>

      {user ? (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded">
            <h2 className="text-lg font-bold text-emerald-400 mb-2">Current User ID:</h2>
            <p className="font-mono text-sm break-all">{user.id}</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded">
            <h2 className="text-lg font-bold text-emerald-400 mb-2">Username:</h2>
            <p className="font-mono text-sm text-lg font-bold">{user.username}</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded">
            <h2 className="text-lg font-bold text-emerald-400 mb-2">Role:</h2>
            <p className="font-mono text-sm">
              {role === "admin" ? (
                <span className="text-rose-400 font-bold text-base">Admin</span>
              ) : (
                <span className="text-emerald-400 font-bold text-base">Participant</span>
              )}
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded">
            <h2 className="text-lg font-bold text-emerald-400 mb-2">Actions:</h2>
            <div className="flex flex-col gap-2">
              <Link href={role === "admin" ? "/admin" : "/participant"}>
                <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
                  {role === "admin" ? "Go to Admin Panel" : "Go to Participant Dashboard"}
                </Button>
              </Link>
              <Button
                onClick={() => { logout(); }}
                className="w-full bg-rose-500 hover:bg-rose-400 text-white font-bold"
              >
                Sign Out
              </Button>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded max-h-96 overflow-auto">
            <h2 className="text-lg font-bold text-emerald-400 mb-2">Raw Auth Object:</h2>
            <pre className="font-mono text-xs text-slate-300">
              {JSON.stringify({ user, role, isLoaded }, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-red-400">Not logged in</p>
          <Link href="/login">
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
              Go to Login
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
