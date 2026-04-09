"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, Users, BarChart3, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DomainLiveStats {
  domain_id: string;
  domain_name: string;
  total_bidders: number;
  current_multiplier: number;
  total_credits_bid: number;
  avg_bid: number;
  active_question: string | null;
  answers_submitted: number;
  correct_answers: number;
  accuracy: number;
  status: string;
}

interface BidActivity {
  id: string;
  user_email: string;
  bid_amount: number;
  multiplier: number;
  domain_name: string;
  timestamp: string;
}

export default function AdminLiveDashboard() {
  const [domainStats, setDomainStats] = useState<DomainLiveStats[]>([]);
  const [recentBids, setRecentBids] = useState<BidActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all domain stats
  const fetchDomainStats = async () => {
    try {
      // Get all domains
      const { data: domains } = await supabase.from("domains").select("*");
      if (!domains) return;

      // Get all active bids in one go to avoid N+1 queries
      const { data: allBids } = await supabase
        .from("domain_bids")
        .select("domain_id, user_id, bid_amount")
        .eq("status", "active");

      // Get all answers
      const { data: allAnswers } = await supabase
        .from("answers")
        .select("is_correct, questions!inner(domain_id)");

      const stats: DomainLiveStats[] = [];

      for (const domain of domains) {
        const domainBids = allBids?.filter(b => b.domain_id === domain.id) || [];
        const domainAnswers = (allAnswers as any[])?.filter((a: any) => a.questions.domain_id === domain.id) || [];
        
        const bidCount = new Set(domainBids.map(b => b.user_id)).size;
        const totalAnswers = domainAnswers.length;
        const correctAnswers = domainAnswers.filter(a => a.is_correct).length;

        stats.push({
          domain_id: domain.id,
          domain_name: domain.name,
          total_bidders: bidCount,
          current_multiplier: domain.multiplier || 1, // Trust the manually set multiplier
          total_credits_bid: domainBids.reduce((sum, b) => sum + b.bid_amount, 0),
          avg_bid: bidCount > 0 ? Math.round((domainBids.reduce((sum, b) => sum + b.bid_amount, 0) / bidCount) * 100) / 100 : 0,
          active_question: null,
          answers_submitted: totalAnswers,
          correct_answers: correctAnswers,
          accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
          status: domain.status || 'pending'
        });
      }

      setDomainStats(stats.sort((a, b) => b.total_bidders - a.total_bidders));
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent bid activity
  const fetchRecentBids = async () => {
    const { data: bids } = await supabase
      .from("domain_bids")
      .select("*, user_id, domain_id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20);

    if (bids) {
      const bidActivities: BidActivity[] = [];

      for (const bid of bids) {
        const { data: user } = await supabase
          .from("users")
          .select("email")
          .eq("id", bid.user_id)
          .single();

        const { data: domain } = await supabase
          .from("domains")
          .select("name")
          .eq("id", bid.domain_id)
          .single();

        bidActivities.push({
          id: bid.id,
          user_email: user?.email || "Unknown",
          bid_amount: bid.bid_amount,
          multiplier: bid.bid_multiplier,
          domain_name: domain?.name || "Unknown",
          timestamp: new Date(bid.created_at).toLocaleTimeString(),
        });
      }

      setRecentBids(bidActivities);
    }
  };

  useEffect(() => {
    fetchDomainStats();
    fetchRecentBids();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "domain_bids" }, () => {
        fetchDomainStats();
        fetchRecentBids();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () => {
        fetchDomainStats();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchDomainStats();
      fetchRecentBids();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center text-emerald-500 hover:text-emerald-400 mb-6">
            ← Back to Admin
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black text-white flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-cyan-400" />
                Live Tournament Dashboard
              </h1>
              <p className="text-slate-400 mt-2">Real-time bidding, answers, and domain statistics</p>
            </div>
            <Button onClick={() => { fetchDomainStats(); fetchRecentBids(); }} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950">
              <Zap className="w-4 h-4 mr-2" />
              Refresh Now
            </Button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">Total Domains Active</p>
              <p className="text-4xl font-black text-cyan-400">{domainStats.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">Total Bidders</p>
              <p className="text-4xl font-black text-emerald-400">{domainStats.reduce((sum, d) => sum + d.total_bidders, 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">Total Credits Bid</p>
              <p className="text-4xl font-black text-amber-400">{domainStats.reduce((sum, d) => sum + d.total_credits_bid, 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">Answers Submitted</p>
              <p className="text-4xl font-black text-violet-400">{domainStats.reduce((sum, d) => sum + d.answers_submitted, 0)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Domain Stats */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Domain Activity
            </h2>

            {loading ? (
              <div className="text-center py-8 text-slate-400 animate-pulse">
                Loading domain stats...
              </div>
            ) : (
              <div className="space-y-3">
                {domainStats.map((domain) => (
                  <Card key={domain.domain_id} className="bg-slate-900/50 border-slate-800">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">{domain.domain_name}</h3>
                          </div>
                          <Badge className={`
                            ${domain.status === 'bidding' ? 'bg-emerald-500 text-slate-950' : 
                              domain.status === 'arena_open' ? 'bg-purple-500 text-white' :
                              domain.status === 'rapid_fire' ? 'bg-rose-500 text-white' :
                              domain.status === 'completed' ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-400'}
                          `}>
                            {domain.status?.replace('_', ' ').toUpperCase() || 'OFFLINE'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-5 gap-4 text-center">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Bidders</p>
                            <p className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                              domain.total_bidders > 5 ? 'text-rose-400' : domain.total_bidders > 0 ? 'text-emerald-400' : 'text-slate-600'
                            }`}>
                              <Users className="w-4 h-4" />
                              {domain.total_bidders}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Multiplier</p>
                            <p className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              {domain.current_multiplier}x
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Avg Bid</p>
                            <p className="text-2xl font-bold text-emerald-400">{domain.avg_bid}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Answers</p>
                            <p className="text-2xl font-bold text-violet-400">
                              {domain.correct_answers}/{domain.answers_submitted}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Accuracy</p>
                            <p className="text-2xl font-bold text-blue-400">{domain.accuracy}%</p>
                          </div>
                        </div>

                        {/* Total Credits */}
                        <div className="p-3 bg-slate-950 rounded border border-emerald-500/30">
                          <p className="text-sm text-slate-400">Total Credits at Stake: <span className="font-bold text-emerald-400">{domain.total_credits_bid}</span></p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recent Bid Activity */}
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-cyan-400" />
              Recent Bids
            </h2>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="pt-6">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentBids.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No recent bids</p>
                  ) : (
                    recentBids.map((bid) => (
                      <div key={bid.id} className="p-3 bg-slate-950 rounded border border-slate-700 hover:border-emerald-500/50 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{bid.user_email}</p>
                            <p className="text-xs text-slate-400">{bid.domain_name}</p>
                          </div>
                          <p className="text-xs text-slate-500">{bid.timestamp}</p>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">
                            {bid.bid_amount} credits
                          </Badge>
                          <Badge className="bg-amber-500/20 text-amber-300 text-xs">
                            ×{bid.multiplier}
                          </Badge>
                          <p className="text-xs font-bold text-emerald-400 ml-auto">
                            {bid.bid_amount * bid.multiplier} at stake
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
