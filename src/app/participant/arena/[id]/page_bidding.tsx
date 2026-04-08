"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ChevronLeft, Zap, Clock, CheckCircle2, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function ArenaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const domainId = params.id as string;

  // Domain & Question State
  const [domain, setDomain] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbError, setDbError] = useState('');

  // Bidding State
  const [hasBid, setHasBid] = useState(false);
  const [bidAmount, setBidAmount] = useState<number>(1);
  const [userBid, setUserBid] = useState<any>(null);
  const [bidCount, setBidCount] = useState(0);
  const [isPlacingBid, setIsPlacingBid] = useState(false);

  // Sync user to database on mount
  useEffect(() => {
    if (!user) return;

    const syncUserToDb = async () => {
      try {
        // Check if user exists and create if not
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingUser && !checkError) {
          // Create user only if query succeeded but user doesn't exist
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

  // Fetch domain
  const fetchDomain = async () => {
    const { data } = await supabase.from('domains').select('*').eq('id', domainId).single();
    if (data) setDomain(data);
  };

  // Fetch current active question for domain
  const fetchCurrentQuestion = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('domain_id', domainId)
      .eq('is_active', true)
      .eq('round_type', 'bidding')
      .order('created_at')
      .limit(1);

    if (data && data.length > 0) {
      setCurrentQuestion(data[0]);
      // Check if user has already bid on this question
      checkUserBid(data[0].id);
      // Fetch bid count and multiplier
      fetchBidStats(data[0].id);
    } else {
      setCurrentQuestion(null);
    }
  };

  // Check if current user has bid
  const checkUserBid = async (questionId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('domain_bids')
      .select('*')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .eq('status', 'active')
      .maybeSingle();

    if (data) {
      setUserBid(data);
      setHasBid(true);
      setBidAmount(data.bid_amount);
    } else {
      setHasBid(false);
      setUserBid(null);
    }
  };

  // Fetch bid statistics
  const fetchBidStats = async (questionId: string) => {
    const { data: bidsData } = await supabase
      .from('domain_bids')
      .select('user_id')
      .eq('domain_id', domainId)
      .eq('status', 'active');

    const uniqueBidders = new Set((bidsData || []).map((b: any) => b.user_id));
    setBidCount(uniqueBidders.size);
  };

  // Place bid
  const placeBid = async () => {
    if (!user || !currentQuestion || bidAmount < 1) return;
    setIsPlacingBid(true);

    try {
      if (!user) return;
      const { error } = await supabase.from('domain_bids').insert({
        user_id: user.id,
        domain_id: domainId,
        question_id: currentQuestion.id,
        bid_amount: bidAmount,
        bid_multiplier: currentMultiplier,
        status: 'active'
      });

      if (error) {
        setDbError(error.message);
      } else {
        setHasBid(true);
        // Refresh bid stats
        await fetchBidStats(currentQuestion.id);
      }
    } finally {
      setIsPlacingBid(false);
    }
  };

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!user || !currentQuestion || !submittedAnswer.trim() || !hasBid) return;
    setIsSubmitting(true);

    try {
      const isCorrect = submittedAnswer === currentQuestion.correct_answer;

      // Calculate credit deduction
      const creditsDeducted = userBid ? userBid.bid_amount * currentMultiplier : bidAmount * currentMultiplier;

      // Insert answer
      if (!user) return;
      const { error: answerError } = await supabase.from('answers').insert({
        user_id: user.id,
        question_id: currentQuestion.id,
        text: submittedAnswer,
        is_correct: isCorrect,
        credits_earned: isCorrect ? currentMultiplier : -currentMultiplier
      });

      if (answerError) {
        setDbError(answerError.message);
      } else {
        // Update bid status
        await supabase
          .from('domain_bids')
          .update({ status: 'answered' })
          .eq('id', userBid.id);

        setHasAnswered(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!domainId) return;
    fetchDomain();
    fetchCurrentQuestion();

    const channel = supabase
      .channel(`arena-${domainId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'domains' }, () => {
        fetchDomain();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'domain_bids' }, () => {
        if (currentQuestion) {
          fetchBidStats(currentQuestion.id);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        fetchCurrentQuestion();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [domainId, currentQuestion?.id]);

  if (!domain) return (
    <div className="p-12 text-center text-slate-400 tracking-widest animate-pulse">
      CONNECTING TO ARENA...
    </div>
  );

  const currentMultiplier = domain.multiplier || 1;
  const potentialWin = userBid ? userBid.bid_amount * currentMultiplier : 0;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <Link href="/participant" className="inline-flex items-center text-emerald-500 hover:text-emerald-400 mb-6 group">
        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to Lobby
      </Link>

      {dbError && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 text-red-100 rounded">
          <strong>Error:</strong> {dbError}
        </div>
      )}

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardDescription className="uppercase tracking-widest text-emerald-500 font-bold text-xs mb-1">
                    Domain Arena
                  </CardDescription>
                  <CardTitle className="text-3xl font-black text-white">{domain.name}</CardTitle>
                </div>
                <Badge className={`${domain.status === 'rapid_fire' ? 'bg-rose-500' : 'bg-emerald-500'} text-slate-950 px-4 py-1.5`}>
                  {domain.status === 'bidding' ? 'AUCTION PHASE' : 'BUZZER PHASE'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-8 pb-12">

              {/* Bidding Phase */}
              {!hasBid && currentQuestion && (
                <div className="space-y-6">
                  <div className="mb-6 p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-slate-300 font-semibold mb-2">Place Your Bid</h3>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-slate-500 uppercase">Current Bidders</p>
                            <p className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                              <Users className="w-5 h-5" />
                              {bidCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase">Multiplier</p>
                            <p className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                              <TrendingUp className="w-5 h-5" />
                              {currentMultiplier}x
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase">Your Bid Return</p>
                        <p className="text-3xl font-black text-emerald-400">{bidAmount * currentMultiplier}</p>
                        <p className="text-xs text-slate-400 mt-1">({bidAmount} × {currentMultiplier}x)</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-slate-300 min-w-fit">Bid Amount:</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 bg-slate-950 border border-slate-700 text-white rounded px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <Button
                        onClick={placeBid}
                        disabled={isPlacingBid}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3"
                      >
                        {isPlacingBid ? 'Placing Bid...' : 'Place Bid'}
                      </Button>
                    </div>

                    <p className="text-xs text-slate-400 mt-3 italic">
                      💡 More bidders = Higher multiplier! Bid now to increase your potential returns.
                    </p>
                  </div>
                </div>
              )}

              {/* Question Display (after bid placed) */}
              {hasBid && currentQuestion && !hasAnswered && (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-950 border border-emerald-500/50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-emerald-500/20 text-emerald-400">Bid Locked In</Badge>
                      <p className="text-sm text-emerald-400">
                        💰 {userBid.bid_amount} × {currentMultiplier}x = {userBid.bid_amount * currentMultiplier} credits at stake
                      </p>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-6">{currentQuestion.content}</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {['A', 'B', 'C', 'D'].map((option) => (
                        <Button
                          key={option}
                          onClick={() => {
                            setSubmittedAnswer(option);
                            handleSubmitAnswer();
                          }}
                          disabled={isSubmitting}
                          className="py-8 px-6 text-2xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 transform transition-all hover:scale-105 active:scale-95"
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Answer Result */}
              {hasAnswered && (
                <div className={`p-8 rounded-lg text-center ${submittedAnswer === currentQuestion.correct_answer ? 'bg-emerald-500/20 border border-emerald-500' : 'bg-rose-500/20 border border-rose-500'}`}>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {submittedAnswer === currentQuestion.correct_answer ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8 text-rose-400" />
                    )}
                    <span className={`text-2xl font-bold ${submittedAnswer === currentQuestion.correct_answer ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {submittedAnswer === currentQuestion.correct_answer ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                  <p className="text-slate-200 mb-2">Your Answer: <span className="text-lg font-bold">{submittedAnswer}</span></p>
                  <p className="text-slate-200">Correct Answer: <span className="text-lg font-bold text-emerald-400">{currentQuestion.correct_answer}</span></p>
                  {submittedAnswer === currentQuestion.correct_answer && (
                    <p className="text-emerald-300 font-bold mt-4">+{userBid.bid_amount * currentMultiplier} Credits Won! 🎉</p>
                  )}
                </div>
              )}

              {!currentQuestion && (
                <div className="text-center py-12">
                  <p className="text-slate-400">Waiting for admin to set a question...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bid Activity Tracker */}
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-500" />
                Bid Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bidCount === 0 ? (
                <p className="text-slate-400 text-sm">No bids yet...</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <p className="text-sm text-slate-300 font-semibold mb-3">
                    {bidCount} Participant{bidCount !== 1 ? 's' : ''} Bidding
                  </p>
                  <div className="p-3 bg-slate-950 rounded border border-emerald-500/30 text-center">
                    <p className="text-emerald-400 font-bold text-lg">{currentMultiplier}x Multiplier</p>
                    <p className="text-xs text-slate-400 mt-1">Current bid boost</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
