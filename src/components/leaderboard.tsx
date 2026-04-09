"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Trophy, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ParticipantScore {
  user_id: string;
  email: string;
  total_credits: number;
  correct_answers: number;
  total_answers: number;
  accuracy: number;
  rank: number;
}

interface LeaderboardProps {
  showUserRank?: boolean;
}

export function Leaderboard({ showUserRank = false }: LeaderboardProps) {
  const { user } = useAuth();
  const [scores, setScores] = useState<ParticipantScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<ParticipantScore | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      // Get all users with their answer stats
      const { data: answers } = await supabase
        .from("answers")
        .select("user_id, is_correct, credits_earned, questions(round_type)");

      const { data: users } = await supabase.from("users").select("id, email");

      if (users && answers) {
        // Calculate scores per user
        const scoreMap = new Map<string, ParticipantScore>();

        users.forEach((u) => {
          scoreMap.set(u.id, {
            user_id: u.id,
            email: u.email || "Unknown",
            total_credits: 50, // Starting credits
            correct_answers: 0,
            total_answers: 0,
            accuracy: 0,
            rank: 0,
          });
        });

        // Count answers
        answers.forEach((ans: any) => {
          if (scoreMap.has(ans.user_id)) {
            const score = scoreMap.get(ans.user_id)!;
            score.total_answers++;
            if (ans.is_correct) {
              score.correct_answers++;
            }
            score.total_credits += (ans.credits_earned || 0);
          }
        });

        // Calculate accuracy and rank
        const sortedScores = Array.from(scoreMap.values())
          .filter((s) => s.total_answers > 0)
          .map((s) => ({
            ...s,
            accuracy: Math.round((s.correct_answers / s.total_answers) * 100),
          }))
          .sort((a, b) => b.total_credits - a.total_credits)
          .map((s, i) => ({
            ...s,
            rank: i + 1,
          }));

        setScores(sortedScores);

        // Find current user's rank if requested
        if (showUserRank && user) {
          const myRank = sortedScores.find((s) => s.user_id === user.id);
          if (myRank) {
            setUserRank(myRank);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to real-time answer updates
    const channel = supabase
      .channel("leaderboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, showUserRank]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <Trophy className="w-6 h-6 text-amber-400" />
          Live Standings
        </h2>
        <Button onClick={fetchLeaderboard} size="sm" variant="outline" className="text-slate-400 border-slate-800">
          <Zap className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Your Rank Card (Participant side only) */}
      {showUserRank && userRank && (
        <Card className="bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border-amber-500/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Your Rank</p>
                <p className="text-3xl font-black text-amber-400">#{userRank.rank}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Credits</p>
                <p className="text-3xl font-black text-emerald-400">{userRank.total_credits}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Correct</p>
                <p className="text-3xl font-black text-cyan-400">{userRank.correct_answers}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Accuracy</p>
                <p className="text-3xl font-black text-violet-400">{userRank.accuracy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-slate-400 animate-pulse">
          Syncing leaderboard metadata...
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && scores.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-cyan-400" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scores.slice(0, 50).map((score) => (
                <div
                  key={score.user_id}
                  className={`p-4 rounded-lg border flex justify-between items-center transition-all ${score.user_id === user?.id
                    ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50"
                    : "bg-slate-950/50 border-slate-700 hover:border-slate-600"
                    }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-center w-8">
                      {score.rank <= 3 ? (
                        <div className="text-xl font-black">
                          {score.rank === 1 ? "🥇" : score.rank === 2 ? "🥈" : "🥉"}
                        </div>
                      ) : (
                        <p className="font-bold text-slate-500 text-sm">#{score.rank}</p>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white truncate max-w-[200px]">
                        {score.email}
                        {score.user_id === user?.id && (
                          <Badge className="ml-2 bg-emerald-500 text-slate-950 text-[10px] py-0">You</Badge>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                        {score.correct_answers} correct · {score.accuracy}% accuracy
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 md:gap-8 items-center text-right">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest hidden md:block">Credits</p>
                      <p className={`text-xl font-bold ${score.total_credits >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {score.total_credits}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Correct</p>
                      <p className="text-xl font-bold text-cyan-400">{score.correct_answers}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && scores.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-slate-500">Telemetry clear. No engagement data recorded yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
