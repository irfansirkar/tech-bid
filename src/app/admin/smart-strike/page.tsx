"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Play, Square, Clock, AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const GLOBAL_DOMAIN_ID = '99999999-9999-9999-9999-999999999999';
const QUESTION_TIMER_S = 20;
const NUM_QUESTIONS = 15;

export default function AdminSmartStrike() {
  const [isGauntletActive, setIsGauntletActive] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop timer safely
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const initializeGauntlet = async () => {
    setIsInitializing(true);
    try {
      // 1. Fetch all smart strike questions
      const { data: allQs } = await supabase
        .from('questions')
        .select('*')
        .eq('round_type', 'smart_strike');

      if (!allQs || allQs.length < NUM_QUESTIONS) {
        alert(`Not enough questions. Found ${allQs?.length}, need at least ${NUM_QUESTIONS}.`);
        setIsInitializing(false);
        return;
      }

      // 2. Shuffle and pick 15
      const shuffled = [...allQs].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, NUM_QUESTIONS);
      setQuestions(selected);

      // 3. Deactivate ALL smart strike questions first to be safe
      await supabase.from('questions')
        .update({ is_active: false })
        .eq('round_type', 'smart_strike');

      // 4. Create/Update the Global Domain to trigger client redirects
      const { data: existingDomain } = await supabase
        .from('domains')
        .select('id')
        .eq('id', GLOBAL_DOMAIN_ID)
        .maybeSingle();

      if (!existingDomain) {
        await supabase.from('domains').insert({
          id: GLOBAL_DOMAIN_ID,
          name: 'GLOBAL_SMART_STRIKE',
          status: 'smart_strike',
          multiplier: 1
        });
      } else {
        await supabase.from('domains').update({
          status: 'smart_strike',
          updated_at: new Date().toISOString()
        }).eq('id', GLOBAL_DOMAIN_ID);
      }

      // Ready to start
      setIsGauntletActive(true);
      setCurrentIndex(-1);
      
      // Start flow by pushing the first question
      await pushNextQuestion(selected, 0);

    } catch (e) {
      console.error("Initialization Failed", e);
      alert("Failed to initialize gauntlet.");
    } finally {
      setIsInitializing(false);
    }
  };

  const pushNextQuestion = async (qs: any[], idx: number) => {
    stopTimer();
    
    if (idx >= qs.length) {
      endGauntlet();
      return;
    }

    // Instantly update UI
    setCurrentIndex(idx);
    const activeQ = qs[idx];

    setSecsLeft(QUESTION_TIMER_S);
    timerRef.current = setInterval(() => {
      setSecsLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          // Auto advance!
          setTimeout(() => pushNextQuestion(qs, idx + 1), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Completely detach database updates from UI thread so it NEVER lags
    (async () => {
      try {
        if (idx > 0 && qs[idx - 1]) {
          await supabase.from('questions').update({ is_active: false }).eq('id', qs[idx - 1].id);
        }
        await supabase.from('questions').update({ is_active: true }).eq('id', activeQ.id);
      } catch (err) {
        console.error("Async DB update failed", err);
      }
    })();
  };

  const endGauntlet = async () => {
    stopTimer();
    setIsGauntletActive(false);
    setSecsLeft(null);
    setCurrentIndex(-1);
    
    // Deactivate all
    await supabase.from('questions')
      .update({ is_active: false })
      .eq('round_type', 'smart_strike');
      
    // Close global domain
    await supabase.from('domains').update({ status: 'completed' }).eq('id', GLOBAL_DOMAIN_ID);
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Zap className="w-8 h-8 text-blue-500" />
          Global Smart Strike Integrator
        </h1>
        <p className="text-slate-400">Orchestrate the synchronized 15-question gauntlet for all active participants simultaneously.</p>
      </header>

      <Card className="bg-slate-900 border-slate-800 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-blue-400 font-black tracking-widest uppercase">Global Event Control</CardTitle>
          <CardDescription>
            This action will forcefully redirect all participants into the Global Arena and sequence 15 random questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {!isGauntletActive ? (
            <Button
              onClick={initializeGauntlet}
              disabled={isInitializing}
              className="w-full py-8 text-xl font-black bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.01]"
            >
              {isInitializing ? "Initializing Sync..." : "GENERATE GAUNTLET & FIRE"}
            </Button>
          ) : (
            <div className="bg-slate-950 p-6 rounded-xl border-2 border-blue-500/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                 <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(secsLeft || 0) / QUESTION_TIMER_S * 100}%`}} />
              </div>
              
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-1">
                    Question {currentIndex + 1} of {questions.length}
                  </h3>
                  <p className="text-white text-lg font-medium leading-relaxed max-w-lg">
                    {questions[currentIndex]?.content}
                  </p>
                  <p className="text-emerald-400 mt-2 font-bold text-sm">
                    Answer: {questions[currentIndex]?.correct_answer}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black tabular-nums text-white bg-slate-800 px-4 py-2 rounded-lg border-2 border-slate-700 inline-block">
                    {secsLeft}s
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <Button 
                  onClick={() => pushNextQuestion(questions, currentIndex + 1)}
                  className="bg-slate-800 hover:bg-slate-700 text-white flex-1"
                >
                  Force Next Slide
                </Button>
                <Button 
                  onClick={endGauntlet}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" /> Abort Event
                </Button>
              </div>

              <div className="mt-6 p-3 bg-amber-950/40 border border-amber-500/50 rounded flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-amber-200 text-xs">
                  <strong>CRITICAL:</strong> Do not refresh or close this tab while the gauntlet is active. This client is orchestrating the database ticks that keep all participants in sync.
                </p>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
