"use client";

import { Leaderboard } from "@/components/leaderboard";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminLeaderboardPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8">
        <Link 
          href="/admin" 
          className="inline-flex items-center text-rose-500 hover:text-rose-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Systems Overview
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              Tournament Leaderboard
            </h1>
            <p className="text-slate-400 mt-2">Real-time participant rankings and engagement metrics.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <Leaderboard showUserRank={false} />
      </div>
    </div>
  );
}
