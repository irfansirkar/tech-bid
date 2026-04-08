"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";

export default function AdminAnswers() {
  const [answers, setAnswers] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  useEffect(() => {
    fetchData();

    // Subscribe to answer updates
    const channel = supabase
      .channel('answers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => {
        fetchAnswers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchAnswers(),
      fetchDomains(),
      fetchQuestions()
    ]);
    setLoading(false);
  };

  const fetchAnswers = async () => {
    const { data } = await supabase
      .from('answers')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAnswers(data);
  };

  const fetchDomains = async () => {
    const { data } = await supabase.from('domains').select('*').order('name', { ascending: true });
    if (data) setDomains(data);
  };

  const fetchQuestions = async () => {
    const { data } = await supabase.from('questions').select('*');
    if (data) setQuestions(data);
  };

  const markCorrect = async (answerId: string) => {
    setVerifying(answerId);
    try {
      await supabase
        .from('answers')
        .update({ is_correct: true })
        .eq('id', answerId);
      await fetchAnswers();
    } catch (err) {
      console.error('Error:', err);
    }
    setVerifying(null);
  };

  const markIncorrect = async (answerId: string) => {
    setVerifying(answerId);
    try {
      await supabase
        .from('answers')
        .update({ is_correct: false })
        .eq('id', answerId);
      await fetchAnswers();
    } catch (err) {
      console.error('Error:', err);
    }
    setVerifying(null);
  };

  const getQuestionContent = (questionId: string) => {
    const q = questions.find(qu => qu.id === questionId);
    return q?.content || 'Question not found';
  };

  const getDomainName = (domainId: string) => {
    const d = domains.find(dom => dom.id === domainId);
    return d?.name || 'Unknown';
  };

  // Filter answers by domain
  const filteredAnswers = selectedDomain === 'all'
    ? answers
    : answers.filter(a => {
        const question = questions.find(q => q.id === a.question_id);
        return question?.domain_id === selectedDomain;
      });

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Answer Verification</h1>
        <p className="text-slate-400">Review and verify answers submitted by participants during the auction phase.</p>
      </header>

      <div className="mb-6 flex gap-4 flex-wrap">
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        >
          <option value="all">All Domains</option>
          {domains.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading answers...</div>
      ) : filteredAnswers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No answers submitted yet.</div>
      ) : (
        <div className="space-y-4">
          {filteredAnswers.map((answer) => {
            const question = questions.find(q => q.id === answer.question_id);
            const domain = domains.find(d => d.id === question?.domain_id);
            const isVerified = answer.is_correct !== null;

            return (
              <Card key={answer.id} className={`bg-slate-900/50 border-slate-800 transition-all ${
                answer.is_correct ? 'border-emerald-500/50' : answer.is_correct === false ? 'border-rose-500/50' : ''
              }`}>
                <CardHeader className="pb-3 border-b border-slate-800">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-slate-800 text-slate-300">{domain?.name || 'Unknown'}</Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(answer.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 font-medium">
                        User: <span className="text-slate-400">{answer.user_id.substring(0, 12)}...</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {answer.is_correct === true && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Correct
                        </Badge>
                      )}
                      {answer.is_correct === false && (
                        <Badge className="bg-rose-500/20 text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Incorrect
                        </Badge>
                      )}
                      {answer.is_correct === null && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Question Section */}
                  <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Question</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      {question?.content || 'Question not found'}
                    </p>
                    {question?.difficulty && (
                      <div className="mt-2">
                        <Badge className={`text-xs ${
                          question.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                          question.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {question.difficulty.toUpperCase()}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Answer Section */}
                  <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Participant's Answer</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-emerald-400 bg-emerald-500/10 px-6 py-4 rounded-lg">
                        {answer.text}
                      </div>
                      {question?.correct_answer && (
                        <div className="flex-1">
                          <p className="text-xs text-slate-400 mb-1">Correct Answer:</p>
                          <div className="text-2xl font-bold text-emerald-400">
                            {question.correct_answer}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Section */}
                  <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Auto-Verification Result:</p>
                        <p className={`text-sm font-bold ${
                          answer.is_correct
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}>
                          {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
