"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ChevronLeft, Zap, Clock, CheckCircle2, TrendingUp, Users, Hourglass, Lock, BellElectric } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const BIDDING_DURATION_S = 15;


function calcSecondsLeft(updatedAt: string): number {
  const endTime = new Date(updatedAt).getTime() + BIDDING_DURATION_S * 1000;
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}



function timerColour(s: number) {
  if (s > 15) return "bg-emerald-500";
  if (s > 8) return "bg-amber-400";
  return "bg-rose-500";
}
function timerText(s: number) {
  if (s > 15) return "text-emerald-400";
  if (s > 8) return "text-amber-400";
  return "text-rose-400";
}



export default function ArenaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const domainId = params.id as string;

  const [domain, setDomain] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbError, setDbError] = useState('');

  // Bid state
  const [userBid, setUserBid] = useState<any>(null);
  const [bidCount, setBidCount] = useState(0);

  // Timer state (Bidding)
  const [secsLeft, setSecsLeft] = useState(BIDDING_DURATION_S);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Buzzer Entries
  const [buzzerEntries, setBuzzerEntries] = useState<any[]>([]);

  // Timer state (Buzzer Phase - 15s)
  const [buzzerSecsLeft, setBuzzerSecsLeft] = useState<number>(15);
  const buzzerTimerRef = useRef<NodeJS.Timeout | null>(null);



  // Buzzer state (rapid_fire only)
  const [buzzed, setBuzzed] = useState(false);

  // Answering countdown (20s)
  const [mcqSecsLeft, setMcqSecsLeft] = useState<number | null>(null);
  const mcqTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Rapid-fire buzzer questions (single question)
  const [rapidFireQuestion, setRapidFireQuestion] = useState<any>(null);
  const [rapidFireAnswer, setRapidFireAnswer] = useState<string | null>(null);



  // Sync user to DB on mount
  useEffect(() => {
    if (!user) return;
    const syncUserToDb = async () => {
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        if (!existingUser && !checkError) {
          await supabase.from('users').insert({
            id: user.id,
            email: `${user.username}@techbid.local`,
            role: 'participant'
          });
        }
      } catch (error) {
        console.error('Error syncing user:', error);
      }
    };
    syncUserToDb();
  }, [user]);

  useEffect(() => {
    if (!domainId) return;
    fetchDomain();
    fetchCurrentQuestion();

    const channel = supabase
      .channel(`arena-${domainId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'domains', filter: `id=eq.${domainId}` }, (payload) => {
        setDomain(payload.new);
        if (payload.new.status === 'bidding' && payload.new.updated_at) {
          startBiddingTimer(payload.new.updated_at);
        }
        if (payload.new.status === 'rapid_fire' || payload.new.status === 'quick_add') {
          stopTimer();
          setCurrentQuestion(null);
          setHasAnswered(false);
          setSubmittedAnswer('');
          fetchCurrentQuestion();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'domain_bids' }, () => {
        fetchBidStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        fetchCurrentQuestion();
      })
      .subscribe();

    const buzzerChannel = supabase
      .channel(`buzzer-${domainId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buzzer_entries', filter: `domain_id=eq.${domainId}` }, () => {
        fetchBuzzerEntries();
      })
      .subscribe();

    fetchBuzzerEntries();

    // Load rapid fire question on mount if already in rapid_fire
    fetchDomain().then(() => { });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(buzzerChannel);
      stopTimer();
      if (mcqTimerRef.current) clearInterval(mcqTimerRef.current);
      if (buzzerTimerRef.current) clearInterval(buzzerTimerRef.current);
    };
  }, [domainId]);

  useEffect(() => {
    if (domain?.status === 'completed') {
      router.push('/participant');
    }
    if (domain?.status === 'bidding' && domain?.updated_at) {
      startBiddingTimer(domain.updated_at);
    }
    // When rapid_fire starts, start 15s buzzer phase
    if (domain?.status === 'rapid_fire') {
      fetchRapidFireQuestion();
      if (domain?.updated_at) {
        startBuzzerTimer(domain.updated_at);
      }
    }

  }, [domain?.status, domain?.updated_at, router]);

  // Trigger 20s MCQ timer when Buzzer Question is revealed
  useEffect(() => {
    if (domain?.status === 'rapid_fire' && rapidFireQuestion && !hasAnswered && mcqSecsLeft === null) {
      const isPhaseOver = buzzerSecsLeft === 0 || buzzerEntries.length >= 5;
      const userInTop5 = user && buzzerEntries.slice(0, 5).some(e => e.user_id === user.id);
      if (isPhaseOver && userInTop5) {
        startMcqTimer();
      }
    }
  }, [buzzerSecsLeft, buzzerEntries.length, domain?.status, rapidFireQuestion, hasAnswered, user, mcqSecsLeft]);

  const startBiddingTimer = (updatedAt: string) => {
    stopTimer();
    setSecsLeft(calcSecondsLeft(updatedAt));
    timerRef.current = setInterval(() => {
      const left = calcSecondsLeft(updatedAt);
      setSecsLeft(left);
      if (left === 0) stopTimer();
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startBuzzerTimer = (updatedAt: string) => {
    if (buzzerTimerRef.current) clearInterval(buzzerTimerRef.current);
    timerRef.current = null; // Kill bidding timer just in case
    setBuzzerSecsLeft(Math.max(0, Math.ceil((new Date(updatedAt).getTime() + 15 * 1000 - Date.now()) / 1000)));
    buzzerTimerRef.current = setInterval(() => {
      setBuzzerSecsLeft(prev => {
        if (prev <= 1) {
          clearInterval(buzzerTimerRef.current!);
          buzzerTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startMcqTimer = () => {
    if (mcqTimerRef.current) clearInterval(mcqTimerRef.current);
    setMcqSecsLeft(20);
    mcqTimerRef.current = setInterval(() => {
      setMcqSecsLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(mcqTimerRef.current!);
          mcqTimerRef.current = null;
          handleMcqTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleMcqTimeout = async () => {
    setHasAnswered(prev => {
      if (prev) return prev;
      if (domain?.status === 'rapid_fire') {
        handleRapidFireSubmit('TIMEOUT');
      } else {
        handleSubmitAnswer('TIMEOUT');
      }
      return true;
    });
  };



  const biddingClosed = (domain?.status === 'bidding' && secsLeft === 0) || domain?.status === 'arena_open';
  const progressPct = (secsLeft / BIDDING_DURATION_S) * 100;

  useEffect(() => {
    if (user && domainId) fetchBidStats();
  }, [user, domainId]);

  useEffect(() => {
    if (currentQuestion && user && (domain?.status === 'rapid_fire' || domain?.status === 'quick_add' || biddingClosed)) {
      checkUserAnswer();
    }
    
    if (biddingClosed && !hasAnswered && currentQuestion && domain?.status !== 'rapid_fire') {
      if (mcqSecsLeft === null) {
        startMcqTimer();
      }
    }
  }, [currentQuestion, user, domain?.status, biddingClosed, hasAnswered, mcqSecsLeft]);

  const fetchDomain = async () => {
    const { data } = await supabase.from('domains').select('*').eq('id', domainId).single();
    if (data) setDomain(data);
  };

  const fetchCurrentQuestion = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('domain_id', domainId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (data && data.length > 0) {
      setCurrentQuestion(data[0]);
    } else {
      setCurrentQuestion(null);
    }
  };

  const fetchRapidFireQuestion = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('domain_id', domainId)
      .eq('round_type', 'rapid_fire')
      .order('created_at', { ascending: true })
      .limit(1);

    if (data && data.length > 0) {
      setRapidFireQuestion(data[0]);
      if (user) {
        // Check if answered
        const { data: existing } = await supabase
          .from('answers')
          .select('*')
          .eq('user_id', user.id)
          .eq('question_id', data[0].id)
          .maybeSingle();
        if (existing) {
          setHasAnswered(true);
          setRapidFireAnswer(existing.text);
        }
      }
    }
  };

  const fetchBuzzerEntries = async () => {
    const { data } = await supabase.from('buzzer_entries').select('*').eq('domain_id', domainId).order('timestamp', { ascending: true });
    if (data) {
      setBuzzerEntries(data);
      if (user && data.find(d => d.user_id === user.id)) setBuzzed(true);
    }
  };

  const handleRapidFireSubmit = async (option: string) => {
    if (!user || rapidFireAnswer || !domain || !rapidFireQuestion) return;
    setIsSubmitting(true);
    setRapidFireAnswer(option);
    setHasAnswered(true);
    const isCorrect = option === rapidFireQuestion.correct_answer;
    
    // Fixed +2 / -2 credits for buzzer round
    await supabase.from('answers').insert({
      user_id: user.id,
      question_id: rapidFireQuestion.id,
      text: option,
      is_correct: isCorrect,
      credits_earned: isCorrect ? 2 : -2
    });
    
    if (mcqTimerRef.current) {
      clearInterval(mcqTimerRef.current);
      mcqTimerRef.current = null;
    }
    setIsSubmitting(false);
  };

  const fetchBidStats = async () => {
    const { data: bidsData } = await supabase
      .from('domain_bids')
      .select('user_id')
      .eq('domain_id', domainId)
      .eq('status', 'active');

    const uniqueBidders = new Set((bidsData || []).map((b: any) => b.user_id));
    setBidCount(uniqueBidders.size);

    // Check if current user has a bid
    if (user) {
      const { data: myBid } = await supabase
        .from('domain_bids')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain_id', domainId)
        .eq('status', 'active')
        .maybeSingle();
      if (myBid) setUserBid(myBid);
    }
  };

  const checkUserAnswer = async () => {
    if (!user || !currentQuestion) return;
    const { data: userAnswer } = await supabase
      .from('answers')
      .select('*')
      .eq('user_id', user.id)
      .eq('question_id', currentQuestion.id)
      .maybeSingle();
    if (userAnswer) {
      setHasAnswered(true);
      setSubmittedAnswer(userAnswer.text);
    }
  };



  const handleSubmitAnswer = async (option: string) => {
    if (!user || !currentQuestion || hasAnswered || !domain) return;
    const currentMultiplier = domain.multiplier || 1;
    setIsSubmitting(true);
    setSubmittedAnswer(option);
    try {
      if (!user) return;
      const isCorrect = option === currentQuestion.correct_answer;
      const { error: answerError } = await supabase.from('answers').insert({
        user_id: user.id,
        question_id: currentQuestion.id,
        text: option,
        is_correct: isCorrect,
        credits_earned: isCorrect ? currentMultiplier : -currentMultiplier
      });
      if (answerError) {
        setDbError(answerError.message);
        setSubmittedAnswer('');
      } else {
        setHasAnswered(true);
        if (mcqTimerRef.current) {
          clearInterval(mcqTimerRef.current);
          mcqTimerRef.current = null;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuzzIn = async () => {
    if (!user || buzzed) return;
    setBuzzed(true);
    const { error } = await supabase.from('buzzer_entries').insert({
      user_id: user.id,
      user_name: user.username || 'Player',
      domain_id: domainId,
      timestamp: new Date().toISOString(),
    });
    if (error) {
      setDbError(error.message);
      setBuzzed(false);
    }
  };

  if (!domain) return (
    <div className="p-12 text-center text-slate-400 tracking-widest animate-pulse">
      CONNECTING TO ARENA...
    </div>
  );

  const currentMultiplier = domain.multiplier || 1;
  const potentialWin = userBid ? userBid.bid_amount * currentMultiplier : 0;

  return (
    <div className="min-h-screen p-6">
      <Link href="/participant" className="inline-flex items-center text-emerald-500 hover:text-emerald-400 mb-6 group">
        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to Lobby
      </Link>

      {dbError && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 text-red-100 rounded">
          <strong>System Error:</strong> {dbError}
        </div>
      )}

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main Area ── */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="relative overflow-hidden bg-slate-900/50 border-slate-800">
            {/* Timer progress bar */}
            {domain.status === 'bidding' && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 z-10">
                <div
                  className={`h-full transition-all duration-1000 ${timerColour(secsLeft)}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
            <CardHeader className="border-b border-white/5 pb-4 mt-1">
              <div className="flex justify-between items-center">
                <div>
                  <CardDescription className="uppercase tracking-widest text-emerald-500 font-bold text-xs mb-1">
                    Domain Arena
                  </CardDescription>
                  <CardTitle className="text-3xl font-black text-white">{domain.name}</CardTitle>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`${biddingClosed && domain.status === 'bidding' ? 'bg-slate-600' :
                    domain.status === 'arena_open' ? 'bg-purple-500' :
                      domain.status === 'quick_add' ? 'bg-indigo-500' :
                        domain.status === 'rapid_fire' ? 'bg-rose-500' : 'bg-emerald-500'
                    } text-white px-4 py-1.5 text-sm font-bold shadow-md`}>
                    {biddingClosed && domain.status === 'bidding' ? '🔒 BIDDING CLOSED' :
                      domain.status === 'bidding' ? '🎯 BIDDING PHASE' :
                        domain.status === 'arena_open' ? '⚡ ARENA OPEN' :
                          domain.status === 'quick_add' ? '⚡ QUICK ADD PHASE' : '⚡ BUZZER PHASE'}
                  </Badge>
                  {domain.status === 'bidding' && (
                    <span className={`text-xl font-black tabular-nums ${timerText(secsLeft)} flex items-center gap-1`}>
                      <Clock className="w-4 h-4" />{secsLeft}s
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-8 pb-12 flex flex-col items-center justify-center min-h-[320px]">

              {/* ══════════════════════════════════════
                  BIDDING PHASE / ARENA OPEN
              ══════════════════════════════════════ */}
              {(domain.status === 'bidding' || domain.status === 'arena_open') && (
                <div className="w-full flex flex-col items-center gap-6">
                  {/* Live bid counter */}
                  <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
                    <div className="bg-slate-950 rounded-xl p-5 border border-cyan-500/30 text-center">
                      <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" /> Bidders
                      </p>
                      <p className="text-5xl font-black text-cyan-400">{bidCount}</p>
                    </div>
                    <div className="bg-slate-950 rounded-xl p-5 border border-amber-500/30 text-center">
                      <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Multiplier
                      </p>
                      <p className="text-5xl font-black text-amber-400">{currentMultiplier}×</p>
                    </div>
                  </div>

                  {/* BIDDING CLOSED -> Show MCQ if available */}
                  {biddingClosed ? (
                    currentQuestion && !hasAnswered ? (
                      <div className="w-full space-y-6">
                        <div className="p-6 bg-slate-950 border-2 border-emerald-500/50 rounded-lg">
                          <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-2 text-center">Bidding Phase MCQ</p>
                          <h2 className="text-slate-100 text-lg leading-relaxed text-left whitespace-pre-wrap font-medium">{currentQuestion.content}</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {['A', 'B', 'C', 'D'].map((option) => (
                            <Button
                              key={option}
                              onClick={() => handleSubmitAnswer(option)}
                              disabled={isSubmitting}
                              className="py-8 px-6 text-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 transform transition-all hover:scale-105 active:scale-95"
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                        {mcqSecsLeft !== null && (
                          <div className={`mt-6 p-3 rounded-lg border-2 ${timerColour(mcqSecsLeft)} text-white font-black text-center text-xl`}>
                            <div className="flex items-center justify-center gap-2">
                              <Clock className="w-5 h-5 animate-pulse" />
                              <span className="tabular-nums">{mcqSecsLeft}s</span>
                            </div>
                          </div>
                        )}
                        <div className="text-center text-slate-500 text-sm font-bold animate-pulse mt-4">
                          Correct: +{currentMultiplier} credits | Incorrect: -{currentMultiplier} credits
                        </div>
                      </div>
                    ) : hasAnswered && currentQuestion ? (
                      /* Show Result for MCQ */
                      <div className={`w-full p-8 rounded-xl text-center border-2 ${
                        submittedAnswer === 'TIMEOUT'
                          ? 'bg-rose-950/30 border-rose-500'
                          : submittedAnswer === currentQuestion.correct_answer
                            ? 'bg-emerald-950/30 border-emerald-500'
                            : 'bg-rose-950/30 border-rose-500'
                        }`}>
                        <div className="flex flex-col items-center justify-center gap-3 mb-4">
                          {submittedAnswer === 'TIMEOUT' ? (
                            <>
                              <Clock className="w-12 h-12 text-rose-400" />
                              <span className="text-3xl font-bold text-rose-400 mt-2">Time's Up! ❌</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className={`w-12 h-12 ${
                                submittedAnswer === currentQuestion.correct_answer ? 'text-emerald-400' : 'text-rose-400'
                                }`} />
                              <span className={`text-3xl font-bold mt-2 ${
                                submittedAnswer === currentQuestion.correct_answer ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                {submittedAnswer === currentQuestion.correct_answer ? 'Correct! ✅' : 'Incorrect ❌'}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <p className="text-slate-500 text-sm mt-6 animate-pulse">Waiting for the next phase...</p>
                      </div>
                    ) : (
                      /* Default Waiting Message if no question yet */
                      <div className="w-full max-w-sm p-5 bg-slate-800/60 border-2 border-slate-600 rounded-xl text-center space-y-2">
                        <Lock className="w-7 h-7 text-slate-400 mx-auto" />
                        <p className="text-slate-300 font-black text-lg">BIDDING CLOSED</p>
                        <p className="text-slate-400 text-sm">Final multiplier: <span className="text-amber-400 font-black text-xl">{currentMultiplier}×</span></p>
                        <p className="text-slate-500 text-xs">{bidCount} bidder{bidCount !== 1 ? 's' : ''} locked in</p>
                        <div className="pt-2 flex items-center justify-center gap-2 text-slate-400 text-xs animate-pulse">
                          <Hourglass className="w-3 h-3" />
                          Waiting for questions to appear...
                        </div>
                      </div>
                    )
                  ) : (
                    /* BIDDING OPEN */
                    userBid ? (
                      <div className="w-full max-w-sm p-5 bg-emerald-950/40 border-2 border-emerald-500/50 rounded-xl text-center space-y-2">
                        <p className="text-emerald-400 font-black text-lg tracking-wide">✅ YOUR BID IS LOCKED IN</p>
                        <p className="text-slate-300 text-sm">
                          Bid: <span className="font-bold text-white">{userBid.bid_amount} credit{userBid.bid_amount !== 1 ? 's' : ''}</span>
                        </p>
                        <p className="text-slate-300 text-sm">
                          Current return: <span className="font-bold text-emerald-400">{potentialWin} credits</span>
                          <span className="text-slate-500 text-xs ml-1">({userBid.bid_amount} × {currentMultiplier}×)</span>
                        </p>
                        <p className={`font-bold text-sm ${timerText(secsLeft)}`}>{secsLeft}s remaining to bid</p>
                        <div className="pt-1 flex items-center justify-center gap-2 text-slate-400 text-xs animate-pulse">
                          <Hourglass className="w-3 h-3" />
                          Waiting for the Quiz Time MCQ…
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-sm p-5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-center">
                        <p className="text-amber-300 font-bold text-sm mb-2">⚠️ No bid placed yet</p>
                        <p className="text-slate-400 text-xs mb-1">{secsLeft}s left to bid.</p>
                        <p className="text-slate-400 text-xs mb-4">Go back to the lobby to place your bid.</p>
                        <Button
                          onClick={() => router.push('/participant')}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
                        >
                          ← Go to Lobby
                        </Button>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════
                  QUICK ADD PHASE
              ══════════════════════════════════════════ */}
              {domain.status === 'quick_add' && (
                <div className="w-full flex flex-col items-center justify-center gap-6 py-8">
                  <div className="w-24 h-24 rounded-full bg-indigo-900/50 flex items-center justify-center border-4 border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                    <Zap className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
                  </div>
                  <h2 className="text-4xl text-white font-black tracking-widest text-center mt-4">QUICK ADD ACTIVE</h2>
                  <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 text-center max-w-md">
                    <p className="text-slate-300 text-base leading-relaxed">
                      Prepare your reflexes. Next segment is about to begin. Wait for the commander's green light!
                    </p>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════
                  BUZZER FIRE ROUND (Previously Rapid Fire)
              ══════════════════════════════════════════ */}
              {domain.status === 'rapid_fire' && (
                <div className="w-full flex flex-col gap-6">
                  {buzzerSecsLeft > 0 && buzzerEntries.length < 5 ? (
                    // 1. BUZZER ENTRY PHASE
                    <div className="flex flex-col items-center text-center space-y-6">
                      <Zap className="w-16 h-16 text-rose-500 animate-pulse" />
                      <div>
                        <h2 className="text-4xl font-black text-rose-400 tracking-widest uppercase mb-2">Buzzer Fire!</h2>
                        <p className="text-slate-300">Fastest 5 to buzz get to answer the question.</p>
                      </div>

                      <div className="text-xl font-bold bg-slate-900 border border-slate-700 px-6 py-3 rounded-full flex items-center gap-3">
                        <Users className="text-rose-400 w-5 h-5" />
                        <span className="text-white">{buzzerEntries.length} / 5</span> Confirmed Buzzers
                      </div>

                      <Button
                        onClick={handleBuzzIn}
                        disabled={buzzed || isSubmitting}
                        className={`w-full max-w-sm aspect-square rounded-full flex flex-col items-center justify-center gap-4 border-8 shadow-[0_0_50px_rgba(244,63,94,0.4)] transition-all transform hover:scale-105 active:scale-95 ${
                          buzzed 
                          ? 'bg-rose-950 border-rose-900 cursor-not-allowed opacity-80'
                          : 'bg-rose-600 hover:bg-rose-500 border-rose-400 cursor-pointer'
                        }`}
                      >
                        {buzzed ? (
                          <>
                            <CheckCircle2 className="w-16 h-16 text-rose-300 mx-auto" />
                            <span className="text-2xl font-black text-rose-200">BUZZED IN!</span>
                            <span className="text-sm font-bold text-rose-300/80">Waiting for {5 - buzzerEntries.length} more...</span>
                          </>
                        ) : (
                          <>
                            <BellElectric className="w-20 h-20 text-white mx-auto drop-shadow-lg" />
                            <span className="text-4xl font-black text-white tracking-wider drop-shadow-md">BUZZ!</span>
                          </>
                        )}
                      </Button>

                      <div className="mt-4 p-4 rounded-xl border-2 border-rose-500/30 bg-rose-950/20 text-rose-300 font-black text-3xl flex items-center gap-3">
                        <Clock className="w-8 h-8 animate-pulse" />
                        <span>{buzzerSecsLeft}s</span>
                      </div>
                    </div>
                  ) : (
                    // 2. QUESTION REVEAL PHASE
                    <div className="w-full flex justify-center">
                      {!rapidFireQuestion ? (
                        <div className="text-center py-16 text-slate-400 animate-pulse">
                          <Zap className="w-8 h-8 mx-auto mb-3 text-rose-500" />
                          Loading Buzzer Question...
                        </div>
                      ) : !(user && buzzerEntries.slice(0, 5).some(e => e.user_id === user.id)) ? (
                        <div className="py-16 text-center text-slate-400 border-4 border-slate-800 rounded-xl w-full max-w-lg bg-slate-900/50">
                          <Lock className="w-12 h-12 mx-auto mb-4 text-rose-500/50" />
                          <h2 className="text-2xl font-black text-white mb-2">Round Full ❌</h2>
                          <p className="text-slate-400 text-sm">You did not make the top 5 buzzers.</p>
                          <p className="text-slate-500 text-xs mt-4">Wait for the next phase to begin.</p>
                        </div>
                      ) : (
                        <div className="w-full max-w-2xl space-y-6">
                          <div className="flex justify-between items-center bg-rose-950/40 p-3 rounded-lg border border-rose-500/30">
                            <span className="text-rose-400 font-bold uppercase tracking-widest text-sm">Top 5 Buzzers Only</span>
                            <span className="text-emerald-400 font-bold text-sm">+2 Correct / -2 Incorrect</span>
                          </div>
                          
                          {!hasAnswered ? (
                            <>
                              <div className="p-8 bg-slate-950 border-4 border-rose-500/50 rounded-xl shadow-[0_0_30px_rgba(244,63,94,0.15)] relative overflow-hidden">
                                {mcqSecsLeft !== null && (
                                  <div className="absolute top-0 left-0 h-1.5 bg-rose-500 transition-all duration-1000" style={{ width: `${(mcqSecsLeft / 20) * 100}%` }} />
                                )}
                                <p className="text-rose-500 text-xs font-bold uppercase tracking-widest mb-4 text-center pb-2 border-b border-rose-900/50">Buzzer Question</p>
                                <h2 className="text-slate-100 text-xl leading-relaxed text-center whitespace-pre-wrap font-bold pt-2">
                                  {rapidFireQuestion.content}
                                </h2>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {['A', 'B', 'C', 'D'].map((option) => (
                                  <Button
                                    key={option}
                                    onClick={() => handleRapidFireSubmit(option)}
                                    disabled={isSubmitting || mcqSecsLeft === 0}
                                    className="py-10 px-6 text-3xl font-black bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border-2 border-slate-700 hover:border-rose-400 shadow-lg disabled:opacity-50 transform transition-all hover:scale-[1.02] active:scale-95"
                                  >
                                    {option}
                                  </Button>
                                ))}
                              </div>

                              {mcqSecsLeft !== null && (
                                <div className="mt-6 flex justify-center">
                                  <div className={`p-4 rounded-full border-4 ${mcqSecsLeft <= 5 ? 'border-rose-500 bg-rose-950/50' : 'border-slate-700 bg-slate-900'} text-white font-black text-2xl flex items-center justify-center min-w-[5rem]`}>
                                    <span className="tabular-nums">{mcqSecsLeft}s</span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className={`w-full max-w-lg mx-auto p-8 rounded-xl text-center border-2 ${
                              rapidFireAnswer === 'TIMEOUT'
                                ? 'bg-rose-950/30 border-rose-500'
                                : rapidFireAnswer === rapidFireQuestion.correct_answer
                                  ? 'bg-emerald-950/30 border-emerald-500'
                                  : 'bg-rose-950/30 border-rose-500'
                              }`}>
                              <div className="flex flex-col items-center justify-center gap-3 mb-4">
                                {rapidFireAnswer === 'TIMEOUT' ? (
                                  <>
                                    <Clock className="w-12 h-12 text-rose-400" />
                                    <span className="text-3xl font-black text-rose-400 mt-2">TIME OUT! ❌</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className={`w-12 h-12 ${
                                      rapidFireAnswer === rapidFireQuestion.correct_answer ? 'text-emerald-400' : 'text-rose-400'
                                      }`} />
                                    <span className={`text-3xl font-black mt-2 ${
                                      rapidFireAnswer === rapidFireQuestion.correct_answer ? 'text-emerald-400' : 'text-rose-400'
                                      }`}>
                                      {rapidFireAnswer === rapidFireQuestion.correct_answer ? 'Correct! ✅' : 'Incorrect ❌'}
                                    </span>
                                  </>
                                )}
                              </div>
                              <p className="text-slate-500 text-sm mt-6 animate-pulse">Waiting for the next phase...</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}



            </CardContent>
          </Card>
        </div>

        {/* ── Right Column: Live Stats ── */}
        <div className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                Live Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-cyan-500/30 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total Bidders</p>
                <p className="text-3xl font-black text-cyan-400">{bidCount}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-amber-500/30 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Current Multiplier</p>
                <p className="text-3xl font-black text-amber-400">{currentMultiplier}×</p>
              </div>


              {domain.status === 'rapid_fire' && (
                <div className="pt-2 text-center">
                  <Zap className="w-8 h-8 text-rose-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-rose-400">Buzzer Fire Round</p>
                  <p className="text-[10px] text-slate-600 mt-1 font-bold">1st Five Buzzers ONLY | +2 / -2</p>
                </div>
              )}

              {domain.status === 'quick_add' && (
                <div className="pt-2 text-center">
                  <Zap className="w-8 h-8 text-indigo-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-slate-400">Quick Add Phase!</p>
                  <p className="text-xs text-slate-500 mt-1">Stand by for Rapid Fire</p>
                </div>
              )}

              {domain.status === 'smart_strike' && (
                <div className="pt-2 text-center">
                  <Zap className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-blue-400">Smart Strike!</p>
                  <p className="text-xs text-slate-500 mt-1">3s limit per question.</p>
                  <p className="text-[10px] text-slate-600 mt-1 font-bold">+2 Correct / -1 Miss or Wrong</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
