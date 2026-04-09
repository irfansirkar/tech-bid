"use client";

import { Leaderboard } from "@/components/leaderboard";
import Link from "next/link";
import { Trophy } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/participant" className="inline-flex items-center text-emerald-500 hover:text-emerald-400 mb-6 transition-colors font-medium">
          ← Back to Lobby
        </Link>
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            Tournament Leaderboard
          </h1>
          <p className="text-slate-400 mt-2">Real-time standings and performance rankings</p>
        </div>
      </div>

      {/* Reusable Leaderboard Component */}
      <Leaderboard showUserRank={true} />
    </div>
  );
}
