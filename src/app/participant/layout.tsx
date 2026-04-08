"use client";

import { useAuth } from "@/lib/auth-context";
import { Zap, Coins, Trophy, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const GLOBAL_DOMAIN_ID = '99999999-9999-9999-9999-999999999999';

export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, isLoaded, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [liveCredits, setLiveCredits] = useState<number>(50);
  const [liveScore, setLiveScore] = useState<number>(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user || role !== "participant") {
      router.push("/login");
      return;
    }
  }, [isLoaded, user, role, router]);

  useEffect(() => {
    if (user) {
      supabase.from('users').upsert(
        [{ id: user.id, email: `${user.username}@techbid.local`, role: 'participant' }],
        { onConflict: 'id' }
      ).then(({ error }) => {
        if (error) console.error("Error auto-syncing user:", error);
      });
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('answers')
      .select('is_correct, credits_earned')
      .eq('user_id', user.id);

    if (data) {
      const correct = data.filter((a: any) => a.is_correct).length;
      const totalEarned = data.reduce((acc: number, curr: any) => acc + (curr.credits_earned || 0), 0);
      setLiveScore(correct);
      setLiveCredits(50 + totalEarned);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Realtime: update whenever this user submits a new answer
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`layout-answers-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'answers' },
        () => { fetchStats(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchStats]);

  // Global Event Listener
  useEffect(() => {
    if (!user) return;
    
    // Check initial state
    const checkGlobalState = async () => {
      const { data } = await supabase.from('domains').select('status').eq('id', GLOBAL_DOMAIN_ID).maybeSingle();
      if (data?.status === 'smart_strike') {
        router.push('/participant/smart-strike');
      }
    };
    checkGlobalState();

    // Listen for changes
    const sysChannel = supabase
      .channel('global-system')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'domains', filter: `id=eq.${GLOBAL_DOMAIN_ID}` }, (payload) => {
        if ((payload.new as any).status === 'smart_strike') {
          router.push('/participant/smart-strike');
        }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(sysChannel); };
  }, [user, router]);

  if (!isLoaded || !user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen text-slate-200 relative">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]" style={{ background: 'rgba(0,4,15,0.75)', backdropFilter: 'blur(16px)' }}>
        <Link href="/" className="flex items-center gap-2 group">
          <Zap className="w-6 h-6 text-violet-400 group-hover:text-cyan-400 transition-colors" />
          <span className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
            TECH BID
          </span>
        </Link>

        {/* Player Stats & Profile */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-4 items-center">
            {(pathname === '/participant' || pathname === '/participant/leaderboard') && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
                <Coins className="w-4 h-4 text-violet-400" />
                <span className="font-semibold text-slate-200">
                  Credits: <span className="text-violet-300 tabular-nums font-bold">{liveCredits}</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm" style={{ borderColor: 'rgba(139,92,246,0.6)', background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }} title={user.username}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden relative z-10">
        {children}
      </main>
    </div>
  );
}
