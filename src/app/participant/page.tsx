"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Zap, Trophy, Users, TrendingUp, Clock, Lock, ChevronRight, Flame, Radio } from "lucide-react";
import Link from "next/link";

const BIDDING_DURATION_S = 30;

interface DomainBidInfo {
  bidderCount: number;
  userHasBid: boolean;
}

function calcSecondsLeft(updatedAt: string): number {
  const endTime = new Date(updatedAt).getTime() + BIDDING_DURATION_S * 1000;
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}

const DOMAIN_ICONS: Record<string, string> = {
  "AI/ML": "🤖", "Blockchain": "⛓️", "Cloud Computing": "☁️",
  "Cybersecurity": "🛡️", "Data Science": "📊", "IoT": "📡",
  "Quantum Computing": "⚛️", "DevOps": "⚙️", "Web3": "🌐", "Robotics": "🦾",
};

export default function ParticipantLobby() {
  const router = useRouter();
  const { user } = useAuth();
  const [domains, setDomains] = useState<any[]>([]);
  const [domainBidInfo, setDomainBidInfo] = useState<Record<string, DomainBidInfo>>({});
  const [placingBid, setPlacingBid] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<Record<string, number>>({});
  const [dbError, setDbError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setMounted(true); }, []);

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
    if (!user) return;
    syncUserToDb();
    fetchDomains();
    const channel = supabase.channel("participant-domains")
      .on("postgres_changes", { event: "*", schema: "public", table: "domains" }, () => fetchDomains())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "domain_bids" }, (payload) => {
        const domainId = payload.new.domain_id;
        if (domainId) fetchBidInfoForDomain(domainId);
      }).subscribe();
    return () => { supabase.removeChannel(channel); if (timerRef.current) clearInterval(timerRef.current); };
  }, [user]);

  const syncUserToDb = async () => {
    if (!user) return;
    try {
      const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();
      if (!existingUser) await supabase.from("users").insert({ id: user.id, email: `${user.username}@techbid.local`, role: "participant" });
    } catch (error) { console.error("Error syncing user:", error); }
  };

  const fetchDomains = async () => {
    const { data, error } = await supabase.from("domains").select("*").order("created_at", { ascending: true });
    if (error) { setDbError(error.message); return; }
    if (data) {
      setDomains(data);
      const initial: Record<string, number> = {};
      for (const d of data) { if (d.status === "bidding" && d.updated_at) initial[d.id] = calcSecondsLeft(d.updated_at); }
      setTimeLeft(initial);
      startTimer(data);
      for (const d of data) { if (d.status === "bidding") fetchBidInfoForDomain(d.id); }
    }
  };

  const fetchBidInfoForDomain = async (domainId: string) => {
    const { data: bids } = await supabase.from("domain_bids").select("user_id").eq("domain_id", domainId).eq("status", "active");
    const uniqueBidders = new Set((bids || []).map((b: any) => b.user_id));
    setDomainBidInfo(prev => ({ ...prev, [domainId]: { bidderCount: uniqueBidders.size, userHasBid: user ? uniqueBidders.has(user.id) : false } }));
  };

  const handlePlaceBid = async (domainId: string) => {
    if (!user) return;
    const domain = domains.find((d: any) => d.id === domainId);
    const multiplier = domain?.multiplier || 1;
    setPlacingBid(prev => ({ ...prev, [domainId]: true }));
    try {
      const { error } = await supabase.from("domain_bids").insert({ user_id: user.id, domain_id: domainId, bid_amount: multiplier, bid_multiplier: multiplier, status: "active" });
      if (error) setDbError(error.message);
      else await fetchBidInfoForDomain(domainId);
    } finally { setPlacingBid(prev => ({ ...prev, [domainId]: false })); }
  };

  const handleBuzzer = async (domainId: string) => {
    if (!user) return;
    try {
      await supabase.from("buzzer_entries").insert({ user_id: user.id, user_name: user.username || "Player", domain_id: domainId, timestamp: new Date().toISOString() });
      setTimeout(() => router.push(`/participant/arena/${domainId}`), 400);
    } catch (error) { console.error("Error recording buzzer:", error); }
  };

  const visibleDomains = domains.filter(d => d.id !== '99999999-9999-9999-9999-999999999999');
  const activeDomains = visibleDomains.filter(d => ['bidding','arena_open','rapid_fire'].includes(d.status));
  const waitingDomains = visibleDomains.filter(d => !['bidding','arena_open','rapid_fire'].includes(d.status));

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'transparent' }}>
      {/* Static background removed — layout handles global mouse-reactive aurora */}



      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.4); } 50% { box-shadow: 0 0 40px rgba(124,58,237,0.8), 0 0 80px rgba(124,58,237,0.2); } }
        @keyframes ripple { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        .slide-in { animation: slideIn 0.5s ease forwards; }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        .domain-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .domain-card:hover { transform: translateY(-2px); }
      `}</style>

      <div className={`relative z-10 max-w-4xl mx-auto px-6 py-10 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400/80 text-xs font-mono tracking-widest uppercase">Live Session</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #67e8f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Domain Arena
            </h1>
            <p className="text-slate-500 text-sm mt-1">Logged in as <span className="text-violet-400 font-semibold">{user?.username}</span></p>
          </div>

          <Link href="/participant/leaderboard" className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-sm font-bold transition-all duration-300" style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.25)', color: '#c4b5fd' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.2)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.5)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)'; }}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            Leaderboard
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Error */}
        {dbError && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{dbError}</div>}

        {/* Active Domains */}
        {activeDomains.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-violet-400/70 mb-4 flex items-center gap-2">
              <Radio className="w-3 h-3" /> Active Now
            </p>
            <div className="flex flex-col gap-3">
              {activeDomains.map((domain, i) => (
                <ActiveDomainRow
                  key={domain.id}
                  domain={domain}
                  bidInfo={domainBidInfo[domain.id]}
                  secsLeft={timeLeft[domain.id] ?? BIDDING_DURATION_S}
                  isSubmitting={placingBid[domain.id] ?? false}
                  onBid={() => handlePlaceBid(domain.id)}
                  onEnterArena={() => router.push(`/participant/arena/${domain.id}`)}
                  onBuzz={() => handleBuzzer(domain.id)}
                  delay={i * 80}
                />
              ))}
            </div>
          </div>
        )}

        {/* Waiting Domains */}
        {waitingDomains.length > 0 && (
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-slate-600 mb-4">Upcoming</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {waitingDomains.map((domain, i) => {
                const icon = DOMAIN_ICONS[domain.name] || "🔷";
                const isCompleted = domain.status === "completed";
                return (
                  <div
                    key={domain.id}
                    className="slide-in rounded-2xl p-6 border flex items-center gap-5 domain-card"
                    style={{ 
                      animationDelay: `${i * 60}ms`,
                      background: isCompleted ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                      borderColor: isCompleted ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)'
                    }}
                  >
                    <span className="text-4xl">{icon}</span>
                    <div className="min-w-0">
                      <p className={`font-bold text-lg truncate ${isCompleted ? 'text-slate-600' : 'text-slate-300'}`}>{domain.name}</p>
                      <p className={`text-sm mt-1 ${isCompleted ? 'text-slate-700' : 'text-slate-500'}`}>
                        {isCompleted ? '✓ Completed' : 'Standing by'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {visibleDomains.length === 0 && (
          <div className="text-center py-24">
            <Zap className="w-12 h-12 text-violet-500/20 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Waiting for the admin to start the session...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveDomainRow({ domain, bidInfo, secsLeft, isSubmitting, onBid, onEnterArena, onBuzz, delay }: any) {
  const isBidding   = domain.status === "bidding";
  const isArenaOpen = domain.status === "arena_open";
  const isRapidFire = domain.status === "rapid_fire";
  const biddingClosed = isBidding && secsLeft === 0;
  const userHasBid  = bidInfo?.userHasBid ?? false;
  const bidderCount = bidInfo?.bidderCount ?? 0;
  const multiplier  = domain.multiplier || 1;
  const icon        = DOMAIN_ICONS[domain.name] || "🔷";
  const pct         = isBidding ? (secsLeft / 30) * 100 : 0;

  const accentColor = isArenaOpen ? '#a855f7' : isRapidFire ? '#ef4444' : '#10b981';
  const glowColor   = isArenaOpen ? 'rgba(168,85,247,0.15)' : isRapidFire ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)';
  const borderColor = isArenaOpen ? 'rgba(168,85,247,0.35)' : isRapidFire ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)';

  return (
    <div
      className="slide-in domain-card relative overflow-hidden rounded-2xl border"
      style={{ animationDelay: `${delay}ms`, background: glowColor, borderColor, backdropFilter: 'blur(10px)' }}
    >
      {/* Top glow strip */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

      {/* Bidding progress bar */}
      {isBidding && !biddingClosed && (
        <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-1000" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />
      )}

        <div className="flex items-center gap-6 px-8 py-7">
        {/* Icon */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
            {icon}
          </div>
          {(isArenaOpen || isRapidFire) && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#060612] animate-pulse" style={{ background: accentColor }} />
          )}
        </div>

          <div className="flex-grow min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-white text-xl leading-none">{domain.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}>
              {isArenaOpen ? 'ARENA OPEN' : isRapidFire ? 'BUZZ ROUND' : biddingClosed ? 'CLOSED' : 'BIDDING'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            {isBidding && !biddingClosed && (
              <>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {bidderCount} bidder{bidderCount !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {multiplier}× multiplier
                </span>
                <span className={`text-xs font-bold flex items-center gap-1 ${secsLeft <= 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                  <Clock className="w-3 h-3" /> {secsLeft}s
                </span>
              </>
            )}
            {biddingClosed && <span className="text-xs text-amber-400 animate-pulse">Awaiting arena unlock...</span>}
            {isArenaOpen && <span className="text-xs text-purple-300">Arena is open — enter now!</span>}
            {isRapidFire && <span className="text-xs text-red-300 flex items-center gap-1"><Flame className="w-3 h-3" /> Buzzer round active</span>}
          </div>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0">
          {isBidding && !biddingClosed && !userHasBid && (
            <button
              onClick={onBid}
              disabled={isSubmitting}
              className="relative px-6 py-3 rounded-xl text-sm font-black text-white overflow-hidden group disabled:opacity-50 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 20px rgba(16,185,129,0.35)' }}
            >
              <span className="relative z-10">{isSubmitting ? 'Bidding…' : `BID  ·  ${multiplier}cr`}</span>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }} />
            </button>
          )}
          {isBidding && !biddingClosed && userHasBid && (
            <span className="px-4 py-2 rounded-xl text-xs font-black border" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }}>
              ✓ LOCKED IN
            </span>
          )}
          {biddingClosed && <span className="text-xs text-slate-600 font-bold">Pending...</span>}
          {isArenaOpen && userHasBid && (
            <button
              onClick={onEnterArena}
              className="px-6 py-3 rounded-xl text-sm font-black text-white transition-all active:scale-95 group"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 24px rgba(124,58,237,0.45)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(124,58,237,0.7)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(124,58,237,0.45)'}
            >
              <Zap className="w-4 h-4 inline mr-1.5" />ENTER
            </button>
          )}
          {isArenaOpen && !userHasBid && (
            <span className="text-xs text-slate-700 font-bold">Didn't bid</span>
          )}
          {isRapidFire && (
            <button
              onClick={onBuzz}
              className="relative px-6 py-3 rounded-xl text-sm font-black text-white overflow-hidden transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 24px rgba(239,68,68,0.45)', animation: 'pulseGlow 1.5s ease-in-out infinite' }}
            >
              <Flame className="w-4 h-4 inline mr-1.5" />BUZZ IN!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
