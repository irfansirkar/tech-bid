"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Zap, Clock, CheckCircle2, Lock, XCircle, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const GLOBAL_DOMAIN_ID = '99999999-9999-9999-9999-999999999999';
const QUESTION_TIMER_S = 20;

function parseQuestion(content: string) {
  let text = content || "";
  let options = { A: "A", B: "B", C: "C", D: "D" };

  try {
    const matchA = content.match(/A\)([\s\S]*?)(?=B\)|$)/i);
    const matchB = content.match(/B\)([\s\S]*?)(?=C\)|$)/i);
    const matchC = content.match(/C\)([\s\S]*?)(?=D\)|$)/i);
    const matchD = content.match(/D\)([\s\S]*?)$/i);

    if (matchA && matchB) {
      options.A = `A) ${matchA[1].trim()}`;
      options.B = `B) ${matchB[1].trim()}`;
      if (matchC) options.C = `C) ${matchC[1].trim()}`;
      if (matchD) options.D = `D) ${matchD[1].trim()}`;

      const indexA = content.indexOf('A)');
      text = content.substring(0, indexA).trim();
    }
  } catch (e) {
    // fallback if regex fails
    console.error("Parse error", e);
  }
  return { text, options };
}

export default function GlobalSmartStrikeArena() {
  const router = useRouter();
  const { user } = useAuth();

  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);

  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [summaryData, setSummaryData] = useState<any[]>([]);

  const activeQuestionIdRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Check if Global Event is active
    const checkGlobalStatus = async () => {
      const { data } = await supabase.from('domains').select('status').eq('id', GLOBAL_DOMAIN_ID).maybeSingle();
      if (data?.status === 'smart_strike') {
        setIsActive(true);
        fetchActiveQuestion();
      } else if (data?.status === 'completed') {
        setIsCompleted(true);
        fetchSummaryInfo();
      }
    };
    checkGlobalStatus();

    // 2. Subscribe to Global Status
    const domainChannel = supabase
      .channel('ss-global-domain')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'domains', filter: `id=eq.${GLOBAL_DOMAIN_ID}` }, (payload) => {
        if (payload.new.status === 'smart_strike') {
          setIsActive(true);
          fetchActiveQuestion();
        } else if (payload.new.status === 'completed') {
          setIsActive(false);
          setIsCompleted(true);
          setSecsLeft(null);
          setCurrentQuestion(null);
          // When completed, auto trigger summary fetch
          fetchSummaryInfo();
        }
      })
      .subscribe();

    // 3. Subscribe to Question Flow
    const questionChannel = supabase
      .channel('ss-questions')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'questions', filter: "round_type=eq.smart_strike" }, (payload) => {
        if (payload.new.is_active === true) {
          handleNewQuestionActive(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(domainChannel);
      supabase.removeChannel(questionChannel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  // Fallback Poller for bulletproof sync if WebSocket misses the exact tick
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if (isActive && !currentQuestion && !isCompleted) {
      pollInterval = setInterval(() => {
         fetchActiveQuestion();
      }, 2000);
    }
    return () => {
       if (pollInterval) clearInterval(pollInterval);
    }
  }, [isActive, currentQuestion, isCompleted]);

  const fetchSummaryInfo = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('answers')
        .select(`
          created_at,
          text,
          is_correct,
          credits_earned,
          questions!inner(content, correct_answer)
        `)
        .eq('user_id', user.id)
        .eq('questions.round_type', 'smart_strike')
        .order('created_at', { ascending: true });
        
      if (data) {
        setSummaryData(data);
      }
    } catch (e) {
      console.error("Fetch summary error", e);
    }
  };

  const fetchActiveQuestion = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('round_type', 'smart_strike')
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      handleNewQuestionActive(data);
    }
  };

  const handleNewQuestionActive = async (q: any) => {
    if (activeQuestionIdRef.current === q.id) return;

    activeQuestionIdRef.current = q.id;
    setCurrentQuestion(q);
    setHasAnswered(false);
    setIsSubmitting(false);

    // Safeguard
    if (user) {
      const { data: existing } = await supabase.from('answers').select('text').eq('user_id', user.id).eq('question_id', q.id).maybeSingle();
      if (existing) {
        setHasAnswered(true);
      }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setSecsLeft(QUESTION_TIMER_S);

    timerRef.current = setInterval(() => {
      setSecsLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0; // Trigger auto-submission in useEffect
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (secsLeft === 0 && currentQuestion && !hasAnswered && !isSubmitting) {
      submitAnswer('TIMEOUT', currentQuestion.id);
    }
  }, [secsLeft, currentQuestion, hasAnswered, isSubmitting]);

  const submitAnswer = async (option: string, questionId: string) => {
    if (!user || hasAnswered || !currentQuestion || activeQuestionIdRef.current !== questionId) return;

    setIsSubmitting(true);

    const isCorrect = option === currentQuestion.correct_answer;
    const isTimeout = option === 'TIMEOUT';
    const creditsToAward = isCorrect ? 1 : -1;

    try {
      const { error } = await supabase.from('answers').insert({
        user_id: user.id,
        question_id: questionId,
        text: option,
        is_correct: isCorrect,
        credits_earned: creditsToAward
      });
      if (!error) {
        if (activeQuestionIdRef.current === questionId) {
          setHasAnswered(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (activeQuestionIdRef.current === questionId) {
        setIsSubmitting(false);
      }
    }
  };

  if (isCompleted) {
    const totalCorrect = summaryData.filter(d => d.is_correct).length;
    const totalPenalties = summaryData.filter(d => !d.is_correct).length;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 md:p-8">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-10">
             <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
             <h1 className="text-4xl font-black text-white tracking-widest uppercase mb-2">Gauntlet Complete!</h1>
             <p className="text-emerald-300 font-bold text-xl drop-shadow-md">YOUR FINAL PERFORMANCE</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:gap-8 mb-10 text-center">
             <div className="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl p-6">
                <p className="text-emerald-400 font-bold text-lg mb-1">CORRECT HITS</p>
                <p className="text-5xl font-black text-white">{totalCorrect}</p>
                <p className="text-emerald-500/80 mt-1 font-bold">+{totalCorrect} Credits</p>
             </div>
             <div className="bg-rose-950/40 border-2 border-rose-500/50 rounded-2xl p-6">
                <p className="text-rose-400 font-bold text-lg mb-1">MISSES / TIMEOUTS</p>
                <p className="text-5xl font-black text-white">{totalPenalties}</p>
                <p className="text-rose-500/80 mt-1 font-bold">-{totalPenalties} Credits</p>
             </div>
          </div>

          <div className="bg-slate-900 border-2 border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
             <div className="bg-slate-800/80 p-4 border-b border-slate-700">
               <h3 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                 <Lock className="w-4 h-4 text-slate-400" />
                 Question Breakdown
               </h3>
             </div>
             <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
                {summaryData.length === 0 && (
                  <div className="p-8 text-center text-slate-400">Loading your answers...</div>
                )}
                {summaryData.map((ans, idx) => {
                   let qText = ans.questions?.content || "";
                   const parse = parseQuestion(qText);
                   return (
                     <div key={idx} className="p-6 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row gap-6">
                        <div className="flex-shrink-0 flex items-start justify-center">
                           {ans.is_correct ? (
                             <div className="bg-emerald-500/20 p-2 rounded flex items-center justify-center">
                               <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                             </div>
                           ) : (
                             <div className="bg-rose-500/20 p-2 rounded flex items-center justify-center">
                               <XCircle className="w-6 h-6 text-rose-400" />
                             </div>
                           )}
                        </div>
                        <div className="flex-grow">
                          <p className="text-slate-200 font-medium mb-3 text-lg leading-snug">
                             <span className="text-blue-400 font-bold mr-2">Q{idx + 1}.</span> 
                             {parse.text}
                          </p>
                          <div className="flex flex-col md:flex-row gap-x-8 gap-y-2 text-sm">
                             <div className="bg-slate-950/50 border border-slate-800 px-3 py-1.5 rounded text-white flex items-center gap-2 max-w-max">
                               <span className="text-slate-400">You struck:</span> 
                               <span className={`font-black ${ans.text === 'TIMEOUT' ? 'text-rose-400' : 'text-slate-100'}`}>
                                 {ans.text === 'TIMEOUT' ? 'TIMEOUT' : parse.options[ans.text as keyof typeof parse.options] || ans.text}
                               </span>
                             </div>
                             {!ans.is_correct && ans.questions?.correct_answer && (
                               <div className="bg-emerald-950/20 border border-emerald-900/50 px-3 py-1.5 rounded text-emerald-100 flex items-center gap-2 max-w-max">
                                 <span className="text-emerald-500/70">Correct Answer:</span>
                                 <span className="font-bold text-emerald-400">
                                   {parse.options[ans.questions.correct_answer as keyof typeof parse.options] || ans.questions.correct_answer}
                                 </span>
                               </div>
                             )}
                          </div>
                        </div>
                     </div>
                   );
                })}
             </div>
          </div>
          
          <div className="mt-8 text-center pb-12">
            <Button onClick={() => router.push('/participant')} className="bg-blue-600 hover:bg-blue-500 font-bold text-white text-lg py-6 px-10 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              Back to Main Lobby
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-blue-500/30 p-10 rounded-2xl">
          <Zap className="w-16 h-16 text-blue-500/50 mx-auto mb-6 animate-pulse" />
          <h1 className="text-2xl font-black text-white mb-2">AWAITING GAUNTLET</h1>
          <p className="text-slate-400">Waiting for the Admin to launch the Global Smart Strike...</p>
        </div>
      </div>
    );
  }

  const parsed = currentQuestion ? parseQuestion(currentQuestion.content) : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 md:p-8">
      {!currentQuestion || !parsed ? (
        <div className="text-center p-10 flex flex-col items-center">
          <Lock className="w-12 h-12 text-blue-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white">PREPARING NEXT QUESTION...</h2>
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <div className="text-center mb-8">
            <h2 className="text-sm md:text-base font-black text-blue-300 tracking-[0.2em] flex items-center justify-center gap-2 drop-shadow-lg mb-2">
              <Zap className="w-4 h-4 text-blue-400" />
              GLOBAL GAUNTLET
              <Zap className="w-4 h-4 text-blue-400" />
            </h2>
          </div>

          <div className="w-full relative bg-slate-900/90 border-t-4 border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5">
            {/* Smooth Top Progress Bar */}
            {secsLeft !== null && !hasAnswered && (
               <div className="absolute top-0 left-0 h-1.5 bg-blue-500 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ width: `${(secsLeft / QUESTION_TIMER_S) * 100}%` }} />
            )}

            <div className="p-8 md:p-14">
               {/* Professional Exam-like Question Text */}
               <h3 className="text-2xl md:text-3xl text-slate-100 font-medium leading-relaxed mb-10 drop-shadow-sm font-serif">
                 {parsed.text}
               </h3>

               {!hasAnswered ? (
                  <div className="flex flex-col gap-4 mt-6">
                    {['A', 'B', 'C', 'D'].map((optionKey) => {
                      const optText = parsed.options[optionKey as keyof typeof parsed.options];
                      // Don't render empty options if parsing failed or missing
                      if (!optText || optText === `${optionKey}) `) return null;
                      
                      return (
                        <Button
                          key={optionKey}
                          onClick={() => submitAnswer(optionKey, currentQuestion.id)}
                          disabled={isSubmitting || secsLeft === 0}
                          variant="outline"
                          className="w-full justify-start py-8 px-6 text-lg md:text-xl font-medium bg-slate-800/50 text-slate-200 border-slate-700 hover:bg-blue-600/20 hover:text-white hover:border-blue-400 transition-all text-left whitespace-normal h-auto rounded-xl"
                        >
                          <span className="font-bold text-blue-400 mr-4 text-2xl">{optionKey}</span> 
                          <span className="flex-1 opacity-90">{optText.replace(/^.\)\s*/, '')}</span>
                        </Button>
                      );
                    })}
                  </div>
               ) : (
                  <div className={`mt-10 p-10 rounded-2xl bg-slate-950/40 border border-slate-800 text-center shadow-inner`}>
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center mb-2">
                        <Check className="w-8 h-8 text-blue-400" />
                      </div>
                      <span className="text-2xl font-black text-slate-200 tracking-wider">STRIKE RECORDED</span>
                      <p className="text-base text-slate-400">Your answer is securely locked into the database.</p>
                    </div>

                    <div className="mt-10 flex justify-center pb-2">
                       <span className="flex items-center gap-3 text-blue-500/80 text-sm animate-pulse font-bold tracking-[0.1em] uppercase bg-slate-900/50 px-6 py-3 rounded-full border border-blue-500/10">
                         <Clock className="w-5 h-5" /> Pending next strike deployment...
                       </span>
                    </div>
                  </div>
               )}
            </div>

            {/* Bottom Floating Timer Indicator inside the box */}
            {!hasAnswered && secsLeft !== null && (
              <div className="bg-slate-950/80 border-t border-slate-800 p-4 flex justify-between items-center px-8">
                <span className="text-slate-500 text-sm tracking-widest font-bold uppercase flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500/50" /> Live Event Active
                </span>
                <span className={`font-black text-2xl tabular-nums ${secsLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-blue-400'}`}>
                  00:{secsLeft.toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
