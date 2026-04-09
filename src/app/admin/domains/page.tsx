"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyIcon, Shield, GlobeLock, Cpu, Server, Database, CloudRain, Binary, Cog, Play, Square, FastForward, Activity, RotateCcw, RefreshCw, Zap, BellElectric, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const BIDDING_DURATION_S = 30;
function calcSecondsLeft(updatedAt: string): number {
  const endTime = new Date(updatedAt).getTime() + BIDDING_DURATION_S * 1000;
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}

const getIcon = (name: string) => {
  switch (name) {
    case "Blockchain": return GlobeLock;
    case "Cybersecurity": return Shield;
    case "AI/ML": return Cpu;
    case "MLOps": return Server;
    case "Cloud Computing": return CloudRain;
    case "Quantum Computing": return Binary;
    case "DevOps": return Cog;
    case "Agentic AI": return Cpu;
    case "Data Science": return Database;
    case "IoT": return CopyIcon;
    default: return Activity;
  }
};

const domainNames = ["Blockchain", "Cybersecurity", "AI/ML", "MLOps", "Cloud Computing", "Quantum Computing", "DevOps", "Agentic AI", "Data Science", "IoT"];

export default function AdminDomains() {
  const [domains, setDomains] = useState<any[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [buzzerWinners, setBuzzerWinners] = useState<Record<string, any[]>>({});
  const [triggeringQuestion, setTriggeringQuestion] = useState<string | null>(null);
  const [domainBidCounts, setDomainBidCounts] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<Record<string, number>>({});
  const [domainMultipliers, setDomainMultipliers] = useState<Record<string, number>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = (domainList: any[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(() => {
        const next: Record<string, number> = {};
        for (const d of domainList) {
          if (d.status === "bidding" && d.updated_at) {
            next[d.id] = calcSecondsLeft(d.updated_at);
          }
        }
        return next;
      });
    }, 1000);
  };

  useEffect(() => {
    fetchDomains();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'domains' }, (payload) => {
        setDomains(current => {
          if (payload.eventType === 'UPDATE') {
            return current.map(d => d.id === payload.new.id ? payload.new : d);
          }
          if (payload.eventType === 'INSERT') {
            return [...current, payload.new];
          }
          return current;
        });
      })
      .subscribe();

    // Subscribe to buzzer changes
    const buzzerChannel = supabase
      .channel('schema-db-buzzes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'buzzer_entries' }, (payload) => {
        setBuzzerWinners(prev => {
          const currentList = prev[payload.new.domain_id] || [];
          if (!currentList.find(e => e.id === payload.new.id)) {
            return { ...prev, [payload.new.domain_id]: [...currentList, payload.new] };
          }
          return prev;
        });
      })
      .subscribe();

    const bidsChannel = supabase
      .channel('schema-db-bids-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'domain_bids' }, () => {
        fetchBidCounts();
      })
      .subscribe();

    fetchBuzzerWinners();
    fetchBidCounts();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(buzzerChannel);
      supabase.removeChannel(bidsChannel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchBidCounts = async () => {
    const { data } = await supabase.from('domain_bids').select('domain_id, user_id').eq('status', 'active');
    if (data) {
      const counts: Record<string, Set<string>> = {};
      data.forEach(b => {
        if (!counts[b.domain_id]) counts[b.domain_id] = new Set();
        counts[b.domain_id].add(b.user_id);
      });
      const finalCounts: Record<string, number> = {};
      Object.keys(counts).forEach(k => {
        finalCounts[k] = counts[k].size;
      });
      setDomainBidCounts(finalCounts);
    }
  };

  const fetchBuzzerWinners = async () => {
    const { data } = await supabase.from('buzzer_entries').select('*').order('timestamp', { ascending: true });
    if (data) {
      const winnersMap: Record<string, any[]> = {};
      data.forEach(entry => {
        if (!winnersMap[entry.domain_id]) winnersMap[entry.domain_id] = [];
        // Optional: keep max 5 logic here if we wanted to enforce strictly on UI side 
        // but the query has history so we just show all if we want.
        winnersMap[entry.domain_id].push(entry);
      });
      setBuzzerWinners(winnersMap);
    }
  };

  const fetchDomains = async () => {
    const { data, error } = await supabase.from('domains').select('*').order('created_at', { ascending: true });
    if (error) {
      setDbError(error.message); return;
    }
    if (data && data.length > 0) {
      setDomains(data);
      startTimer(data);
      // Load multipliers from domain records
      const mults: Record<string, number> = {};
      data.forEach((d: any) => { mults[d.id] = d.multiplier || 1; });
      setDomainMultipliers(mults);
    } else {
      // Seed domains if empty
      const initialInserts = domainNames.map(name => ({ name, status: 'pending' }));
      const { data: newDomains, error: insertError } = await supabase.from('domains').insert(initialInserts).select('*');
      if (insertError) setDbError(insertError.message);
      if (newDomains) {
        setDomains(newDomains);
        startTimer(newDomains);
      }
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    // When moving away from a phase, clear any active questions
    if (newStatus === 'rapid_fire' || newStatus === 'smart_strike' || newStatus === 'pending') {
      await supabase.from('questions').update({ is_active: false }).eq('domain_id', id).eq('is_active', true);
    }

    // Update status and timestamp
    const { error: statusError } = await supabase.from('domains').update({
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    if (statusError) {
      setDbError(statusError.message);
      return; // Stop if status update fails
    }

    // If opening arena, try to save the multiplier
    if (newStatus === 'arena_open') {
      const mult = domainMultipliers[id] || 1;
      const { error: multError } = await supabase.from('domains').update({
        multiplier: mult
      }).eq('id', id);

      // If updating multiplier fails, alert the admin (likely missing column)
      if (multError) {
        alert(`Warning: Could not save the ${mult}× multiplier.\n\nPlease open your Supabase Database and add a 'multiplier' column (type: integer, default: 1) to the 'domains' table.`);
        console.error("Multiplier update error:", multError);
      }
    }
  };

  const setMultiplier = async (domainId: string, value: number) => {
    const clamped = Math.min(10, Math.max(1, value));

    // Optimistic UI update
    setDomainMultipliers(prev => ({ ...prev, [domainId]: clamped }));

    // Save immediately to DB so participants see the change in real-time
    const { error: multError } = await supabase.from('domains').update({
      multiplier: clamped
    }).eq('id', domainId);

    if (multError) {
      alert(`Warning: Could not save the ${clamped}× multiplier.\n\nPlease open your Supabase Database and add a 'multiplier' column (type: integer, default: 1) to the 'domains' table.`);
      console.error("Multiplier update error:", multError);
    }
  };

  // Restart a single domain back to pending and clear its bids
  const restartDomain = async (id: string) => {
    setRestartingId(id);
    try {
      await supabase.from('domain_bids').update({ status: 'cancelled' }).eq('domain_id', id);
      await supabase.from('buzzer_entries').delete().eq('domain_id', id);
      await supabase.from('domains').update({ status: 'pending' }).eq('id', id);
    } finally {
      setRestartingId(null);
    }
  };

  // Restart ALL domains to pending and clear all active bids
  const restartAllDomains = async () => {
    setIsRestarting(true);
    setConfirmRestart(false);
    try {
      await supabase.from('domain_bids').update({ status: 'cancelled' }).eq('status', 'active');
      await supabase.from('buzzer_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('domains').update({ status: 'pending' }).neq('id', '00000000-0000-0000-0000-000000000000');
    } finally {
      setIsRestarting(false);
    }
  };

  const triggerRapidFireQuestion = async (domainId: string) => {
    setTriggeringQuestion(domainId);
    try {
      // 1. Deactivate current active question for domain
      await supabase.from('questions').update({ is_active: false }).eq('domain_id', domainId).eq('is_active', true);

      // 2. Find first inactive rapid_fire question
      const { data: nextQs } = await supabase
        .from('questions')
        .select('id')
        .eq('domain_id', domainId)
        .eq('round_type', 'rapid_fire')
        .eq('is_active', false)
        .order('created_at', { ascending: true })
        .limit(1);

      if (nextQs && nextQs.length > 0) {
        await supabase.from('questions').update({ is_active: true }).eq('id', nextQs[0].id);
        alert("Rapid fire question activated!");
      } else {
        alert("No inactive rapid fire questions available for this domain.");
      }
    } catch (err) {
      console.error(err);
    }
    setTriggeringQuestion(null);
  };



  return (
    <div className="p-8">
      {dbError && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 text-red-100 rounded">
          <strong>Database Connection Error:</strong> {dbError}
        </div>
      )}

      <header className="mb-8 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Domain Management</h1>
            <p className="text-slate-400">Control the flow of the tournament. Start Bidding phases or trigger Quiz Time rounds.</p>
          </div>

          {/* â”€â”€ Restart All Domains â”€â”€ */}
          {!confirmRestart ? (
            <Button
              onClick={() => setConfirmRestart(true)}
              variant="outline"
              className="bg-slate-950 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400 hover:text-orange-300 gap-2 px-5 py-5"
            >
              <RotateCcw className="w-4 h-4" />
              Restart All Domains
            </Button>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-orange-950/40 border border-orange-500/50 rounded-lg">
              <p className="text-orange-300 text-sm font-semibold">Reset ALL domains to Pending?</p>
              <Button
                onClick={restartAllDomains}
                disabled={isRestarting}
                className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm px-4"
              >
                {isRestarting ? (
                  <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Resetting...</>
                ) : (
                  'Yes, Reset All'
                )}
              </Button>
              <Button
                onClick={() => setConfirmRestart(false)}
                variant="outline"
                className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 text-sm px-4"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {domains.map((domain) => {
          const Icon = getIcon(domain.name);
          const isPending = domain.status === "pending";
          const isBidding = domain.status === "bidding";
          const isArenaOpen = domain.status === "arena_open";
          const isRapidFire = domain.status === "rapid_fire";
          const isSmartStrike = domain.status === "smart_strike";
          const isCompleted = domain.status === "completed";
          const currentBuzzerWinner = buzzerWinners[domain.id];

          const secsLeft = timeLeft[domain.id] ?? 0;
          const biddingClosed = isBidding && secsLeft === 0;
          const bidCount = domainBidCounts[domain.id] || 0;
          const canOpenArena = biddingClosed && bidCount <= 5;

          return (
            <Card key={domain.id} className="bg-slate-900/50 border-slate-800 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${isBidding ? 'bg-emerald-500/20 text-emerald-400' : isArenaOpen ? 'bg-purple-500/20 text-purple-400' : isRapidFire ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white">{domain.name}</CardTitle>
                    <CardDescription className="text-slate-400">
                      Status:
                      {isPending && <Badge variant="outline" className="ml-2 bg-slate-800 text-slate-300">Pending</Badge>}
                      {isBidding && <Badge variant="default" className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500">Active: Bidding</Badge>}
                      {isArenaOpen && <Badge variant="default" className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500">Arena Open</Badge>}
                      {isRapidFire && <Badge variant="default" className="ml-2 bg-rose-500/20 text-rose-400 border-rose-500">Active: Buzzer Fire</Badge>}
                      {isSmartStrike && <Badge variant="default" className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500">Active: Smart Strike</Badge>}
                      {isCompleted && <Badge variant="outline" className="ml-2 bg-slate-800 text-slate-500">Completed</Badge>}

                      <Badge 
                        variant="outline" 
                        className={`ml-2 flex items-center gap-1 ${
                          bidCount > 0 
                            ? (bidCount > 5 ? "bg-rose-500/10 text-rose-400 border-rose-500/50" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/50") 
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        {bidCount} {bidCount === 1 ? 'Bidder' : 'Bidders'}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => updateStatus(domain.id, "bidding")}
                    disabled={!isPending}
                    variant="outline"
                    className="flex-1 min-w-[120px] bg-slate-950 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 mr-2" /> Start Bidding
                  </Button>
                  <Button
                    onClick={() => updateStatus(domain.id, "arena_open")}
                    disabled={!canOpenArena}
                    variant="outline"
                    className="flex-1 min-w-[120px] bg-slate-950 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 disabled:opacity-50"
                    title={isBidding ? (biddingClosed ? (bidCount <= 5 ? "" : "Too many bidders (>5). Arena cannot open.") : "Wait for bidding to end") : ""}
                  >
                    <Zap className="w-4 h-4 mr-2" /> Open Arena ({domainMultipliers[domain.id] || 1}×)
                  </Button>
                  <Button
                    onClick={() => updateStatus(domain.id, "rapid_fire")}
                    disabled={!isArenaOpen}
                    variant="outline"
                    className="flex-1 min-w-[120px] bg-slate-950 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  >
                    <FastForward className="w-4 h-4 mr-2" /> Buzzer Fire Round
                  </Button>
                  <Button
                    onClick={() => updateStatus(domain.id, "completed")}
                    disabled={isCompleted || isPending}
                    variant="outline"
                    className="flex-1 min-w-[120px] bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300 disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 mr-2" /> End
                  </Button>
                </div>

                {/* Multiplier Selector — visible when bidding is active or arena not yet open */}
                {(isBidding || (isPending)) && (
                  <div className="mt-3 p-3 border border-amber-500/30 bg-amber-950/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-amber-400">Multiplier</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMultiplier(domain.id, (domainMultipliers[domain.id] || 1) - 1)}
                          disabled={(domainMultipliers[domain.id] || 1) <= 1}
                          className="w-8 h-8 rounded bg-slate-800 text-amber-400 font-bold text-lg hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        >−</button>
                        <span className="text-2xl font-black text-amber-400 w-12 text-center tabular-nums">
                          {domainMultipliers[domain.id] || 1}×
                        </span>
                        <button
                          onClick={() => setMultiplier(domain.id, (domainMultipliers[domain.id] || 1) + 1)}
                          disabled={(domainMultipliers[domain.id] || 1) >= 10}
                          className="w-8 h-8 rounded bg-slate-800 text-amber-400 font-bold text-lg hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        >+</button>
                      </div>
                    </div>
                    <p className="text-xs text-amber-200/60 mt-1">Set before opening arena. Range: 1× – 10×</p>
                  </div>
                )}

                {/* Quiz Time Buzzer / Trigger UI */}
                {isRapidFire && (
                  <div className="mt-4 p-4 border border-rose-500/40 bg-rose-950/20 rounded-lg flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BellElectric className="w-5 h-5 text-rose-400 animate-pulse" />
                        <span className="text-sm font-bold text-rose-400">Top Buzzers ({Math.min(currentBuzzerWinner?.length || 0, 5)}/5)</span>
                      </div>
                    </div>
                    {currentBuzzerWinner && currentBuzzerWinner.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentBuzzerWinner.slice(0, 5).map((w: any, i: number) => (
                           <Badge key={i} className="bg-rose-500 text-white font-bold px-3 py-1 text-sm bg-rose-600">#{i+1} {w.user_name}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Waiting for buzzes...</span>
                    )}
                    
                    <Button
                      onClick={() => triggerRapidFireQuestion(domain.id)}
                      disabled={triggeringQuestion === domain.id}
                      className="w-full mt-2 bg-rose-600 hover:bg-rose-500 text-white font-bold"
                    >
                      {triggeringQuestion === domain.id ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Triggering...</>
                      ) : (
                        'Show Buzzer Fire Question'
                      )}
                    </Button>
                  </div>
                )}

                {/* Per-domain restart */}
                <Button
                  onClick={() => restartDomain(domain.id)}
                  disabled={isPending || restartingId === domain.id}
                  variant="outline"
                  className="w-full bg-slate-950 border-orange-500/20 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400 hover:text-orange-300 disabled:opacity-30 text-xs"
                >
                  {restartingId === domain.id ? (
                    <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Restarting...</>
                  ) : (
                    <><RotateCcw className="w-3 h-3 mr-1" /> Restart This Domain</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


