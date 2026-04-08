"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Zap, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ participants: 0, liveDomains: 0, totalBids: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Subscribe to multiple channels for the Event Stream
    const channel = supabase.channel('admin-overview');

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, (payload) => {
         setStats(s => ({ ...s, totalBids: s.totalBids + 1 }));
         logEvent({ type: 'bid', text: `User ${payload.new.user_id.substring(0, 8)} placed bid of ${payload.new.amount} credits`, time: new Date() });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'domains' }, (payload) => {
         const isLive = payload.new.status === 'bidding' || payload.new.status === 'rapid_fire';
         const wasLive = payload.old.status === 'bidding' || payload.old.status === 'rapid_fire';
         if (isLive && !wasLive) setStats(s => ({ ...s, liveDomains: s.liveDomains + 1 }));
         if (!isLive && wasLive) setStats(s => ({ ...s, liveDomains: Math.max(0, s.liveDomains - 1) }));
         logEvent({ type: 'domain', text: `Domain ${payload.new.name} transitioned to ${payload.new.status.toUpperCase()}`, time: new Date() });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'buzzes' }, (payload) => {
         logEvent({ type: 'buzz', text: `User ${payload.new.user_id.substring(0, 8)} BUZZED IN!`, time: new Date() });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchStats = async () => {
    // Note: If you don't have a web hook syncing Clerk to Users, this count may be 0.
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    
    // Count Live Domains
    const { data: domains } = await supabase.from('domains').select('status');
    const liveCount = domains?.filter(d => d.status === 'bidding' || d.status === 'rapid_fire').length || 0;

    // Count Total Bids
    const { count: bidCount } = await supabase.from('bids').select('*', { count: 'exact', head: true });

    setStats({
      participants: userCount || 0,
      liveDomains: liveCount,
      totalBids: bidCount || 0
    });
    setLoading(false);
  };

  const logEvent = (event: any) => {
    setEvents(current => [event, ...current].slice(0, 10)); // keep last 10
  };

  const emergencyStop = async () => {
    // Set all domains to pending
    await supabase.from('domains').update({ status: 'pending' }).neq('status', 'completed');
  };

  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Systems Overview</h1>
          <p className="text-slate-400">Welcome back, Commander. Monitoring live telemetry.</p>
        </div>
        <Link href="/admin/live-dashboard">
          <Button className="bg-cyan-600 hover:bg-cyan-500 text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Live Dashboard
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Registered Users</CardTitle>
            <Users className="w-4 h-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16 bg-slate-800" /> : <div className="text-2xl font-bold text-white">{stats.participants}</div>}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Live Domains</CardTitle>
            <Activity className="w-4 h-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16 bg-slate-800" /> : <div className="text-2xl font-bold text-white">{stats.liveDomains}</div>}
            <p className="text-xs text-rose-400 mt-1 animate-pulse">Bidding & Rapid Fire Active</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Bids Placed</CardTitle>
            <Zap className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16 bg-slate-800" /> : <div className="text-2xl font-bold text-white">{stats.totalBids}</div>}
            <p className="text-xs text-slate-500 mt-1">Across all domains</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Server Status Panel */}
         <Card className="bg-slate-900/50 border-slate-800 h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-white">Real-Time Event Stream</CardTitle>
            <CardDescription className="text-slate-400">Live monitor of bidding and buzzer activities.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
             <div className="space-y-4 font-mono text-sm">
                {events.length === 0 && (
                   <div className="text-slate-500 text-center py-8">Waiting for live events...</div>
                )}
                {events.map((ev, i) => (
                  <div key={i} className={`flex gap-4 items-center p-3 rounded bg-slate-950 border ${ev.type === 'domain' ? 'border-emerald-500/30' : 'border-slate-800'}`}>
                    <span className="text-emerald-500 min-w-[80px]">[{ev.time.toLocaleTimeString()}]</span>
                    {ev.type === 'domain' ? (
                       <span className="text-white">{ev.text}</span>
                    ) : ev.type === 'buzz' ? (
                       <span className="text-rose-400 font-bold animate-pulse">{ev.text}</span>
                    ) : (
                       <span className="text-slate-300">{ev.text}</span>
                    )}
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

         {/* Quick Actions Panel */}
         <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">Shortcut commands for tournament management.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Link href="/admin/domains" className="block w-full text-left px-4 py-3 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-colors">
                <div className="font-medium text-white mb-1">Manage Domains & Rounds</div>
                <div className="text-sm text-slate-400">Open the bidding floor for pending domains.</div>
             </Link>
             <Link href="/admin/questions" className="block w-full text-left px-4 py-3 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-colors">
                <div className="font-medium text-white mb-1">Question Bank</div>
                <div className="text-sm text-slate-400">View the 399 automatically seeded questions.</div>
             </Link>
             <Link href="/admin/answers" className="block w-full text-left px-4 py-3 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-colors">
                <div className="font-medium text-white mb-1">Answer Verification</div>
                <div className="text-sm text-slate-400">Review and verify participant answers.</div>
             </Link>
             <button onClick={emergencyStop} className="w-full text-left px-4 py-3 rounded border border-rose-900/50 bg-rose-950/20 hover:bg-rose-900/40 hover:border-rose-700/50 transition-colors text-rose-200">
                <div className="font-medium mb-1 flex items-center"><Zap className="w-4 h-4 mr-2" /> Emergency Stop</div>
                <div className="text-sm text-rose-400/70">Pause all active domains and drop them to pending immediately.</div>
             </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
