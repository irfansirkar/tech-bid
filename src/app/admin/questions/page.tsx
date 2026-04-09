"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Circle, Loader, Edit2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editDomainId, setEditDomainId] = useState<string>('');
  const [advancingDomain, setAdvancingDomain] = useState<string | null>(null);
  const [filterDomainId, setFilterDomainId] = useState<string>('all');

  useEffect(() => {
    fetchQuestions();
    fetchDomains();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('questions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        fetchQuestions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDomains = async () => {
    const { data } = await supabase.from('domains').select('*').order('name', { ascending: true });
    if (data) setDomains(data);
  };

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .order('domain_id', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (data) {
      setQuestions(data);
      // Pre-select active questions
      const active = new Set(data.filter(q => q.is_active).map(q => q.id));
      setSelectedIds(active);
    }
    setLoading(false);
  };

  const toggleQuestion = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const toggleDomain = (domainId: string) => {
    const domainQuestions = questions.filter(q => q.domain_id === domainId);
    const allSelected = domainQuestions.every(q => selectedIds.has(q.id));
    
    const updated = new Set(selectedIds);
    domainQuestions.forEach(q => {
      if (allSelected) {
        updated.delete(q.id);
      } else {
        updated.add(q.id);
      }
    });
    setSelectedIds(updated);
  };

  const saveSelection = async () => {
    setSaving(true);
    try {
      // Deselect all first
      await supabase.from('questions').update({ is_active: false }).neq('id', 'null');
      
      // Select chosen questions
      if (selectedIds.size > 0) {
        const selectedArray = Array.from(selectedIds);
        await supabase.from('questions').update({ is_active: true }).in('id', selectedArray);
      }
    } catch (err) {
      console.error('Error saving selection:', err);
    }
    setSaving(false);
  };

  const handleReassignQuestion = async (questionId: string, newDomainId: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ domain_id: newDomainId })
        .eq('id', questionId);
      
      if (error) {
        console.error('Error reassigning question:', error);
      } else {
        // Refresh questions
        await fetchQuestions();
        setEditingQuestion(null);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const activateOneBiddingQuestionPerDomain = async () => {
    setSaving(true);
    try {
      // First, deactivate all questions
      await supabase.from('questions').update({ is_active: false }).neq('id', 'null');
      
      // Set one question active for ALL domains
      for (const domain of domains) {
        const domainQuestions = questions.filter(q => q.domain_id === domain.id && q.round_type === 'bidding');
        if (domainQuestions.length > 0) {
          // Activate the first bidding question for this domain
          const questionToActivate = domainQuestions[0];
          await supabase
            .from('questions')
            .update({ is_active: true })
            .eq('id', questionToActivate.id);
        }
      }
      // Refresh
      await fetchQuestions();
    } catch (err) {
      console.error('Error:', err);
    }
    setSaving(false);
  };

  const populateDefaultQuestions = async () => {
    setSaving(true);
    let insertedCount = 0;
    try {
      const { data: currentQuestions } = await supabase.from('questions').select('domain_id');
      const domainQuestionCounts: Record<string, number> = {};
      currentQuestions?.forEach(q => {
        domainQuestionCounts[q.domain_id] = (domainQuestionCounts[q.domain_id] || 0) + 1;
      });

      const DEFAULT_BANK: Record<string, any[]> = {
        'AI/ML': [
          { content: 'What does "overfitting" mean in machine learning?', option_a: 'Model learning training data too well', option_b: 'Model performing well on new data', option_c: 'Too many features', option_d: 'Too many layers', correct_answer: 'A', difficulty: 'easy', round_type: 'rapid_fire' },
          { content: 'Which algorithm is commonly used for image classification?', option_a: 'K-Means', option_b: 'CNN', option_c: 'Linear Regression', option_d: 'Decision Trees', correct_answer: 'B', difficulty: 'medium', round_type: 'bidding' }
        ],
        'Cybersecurity': [
          { content: 'What is a "zero-day vulnerability"?', option_a: 'A patched flaw', option_b: 'An unknown flaw exploited before disclosure', option_c: 'A security feature', option_d: 'Antivirus type', correct_answer: 'B', difficulty: 'hard', round_type: 'bidding' },
          { content: 'What does "phishing" refer to?', option_a: 'Fishing technique', option_b: 'Deceptive emails to steal info', option_c: 'Water security', option_d: 'DB optimization', correct_answer: 'B', difficulty: 'easy', round_type: 'rapid_fire' }
        ],
        'Cloud Computing': [
          { content: 'What are the three primary cloud service models?', option_a: 'IaaS, PaaS, SaaS', option_b: 'HTTP, HTTPS, FTP', option_c: 'SQL, NoSQL, NewSQL', option_d: 'Frontend, Backend, DB', correct_answer: 'A', difficulty: 'easy', round_type: 'rapid_fire' }
        ],
        'Blockchain': [
          { content: 'What is the consensus mechanism for Bitcoin?', option_a: 'PoW', option_b: 'PoS', option_c: 'PoA', option_d: 'PoH', correct_answer: 'A', difficulty: 'medium', round_type: 'bidding' }
        ]
      };

      for (const domain of domains) {
        if (!domainQuestionCounts[domain.id] || domainQuestionCounts[domain.id] < 1) {
          const samples = DEFAULT_BANK[domain.name] || [
            { content: `Default Question for ${domain.name}: What is the primary focus of this domain?`, option_a: 'Innovation', option_b: 'Stability', option_c: 'Performance', option_d: 'Security', correct_answer: 'A', difficulty: 'easy', round_type: 'rapid_fire' },
            { content: `Advanced Question for ${domain.name}: How is scalability handled here?`, option_a: 'Horizontal', option_b: 'Vertical', option_c: 'Manual', option_d: 'None', correct_answer: 'A', difficulty: 'medium', round_type: 'bidding' }
          ];

          for (const s of samples) {
            await supabase.from('questions').insert({
              domain_id: domain.id,
              ...s,
              is_active: false
            });
            insertedCount++;
          }
        }
      }
      await fetchQuestions();
      alert(`Successfully added ${insertedCount} default questions!`);
    } catch (err) {
      console.error('Error populating questions:', err);
    }
    setSaving(false);
  };

  const advanceToNextQuestion = async (domainId: string) => {
    setAdvancingDomain(domainId);
    try {
      // Find the current active question for this domain
      const currentActive = questions.find(q => q.domain_id === domainId && q.is_active);
      
      // Deactivate current question
      if (currentActive) {
        await supabase.from('questions').update({ is_active: false }).eq('id', currentActive.id);
      }
      
      // Find next bidding question that isn't the current one
      const domainQuestions = questions.filter(q => q.domain_id === domainId && q.round_type === 'bidding' && q.id !== currentActive?.id);
      
      if (domainQuestions.length > 0) {
        // Activate the first available question
        await supabase.from('questions').update({ is_active: true }).eq('id', domainQuestions[0].id);
      }
      
      // Refresh questions
      await fetchQuestions();
    } catch (err) {
      console.error('Error advancing question:', err);
    }
    setAdvancingDomain(null);
  };

  // Group questions by domain
  const groupedByDomain = questions.reduce((acc, q) => {
    if (!acc[q.domain_id]) {
      acc[q.domain_id] = [];
    }
    acc[q.domain_id].push(q);
    return acc;
  }, {} as Record<string, any[]>);

  const getDomainName = (domainId: string) => {
    const domain = domains.find(d => d.id === domainId);
    return domain?.name || 'Unknown Domain';
  };

  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Question Bank</h1>
          <p className="text-slate-400">Live questions for active domains. Use the domain management page to start bidding rounds.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={populateDefaultQuestions}
            disabled={saving}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
          >
            <Loader className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Load Sample Bank
          </Button>
          <Button 
            onClick={activateOneBiddingQuestionPerDomain}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Auto-Live All Domains
          </Button>
        </div>
      </header>

      {/* Active Questions — only show domains that are currently running */}
      {!loading && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Live Domain Questions</h2>
          {domains.filter(d => ['bidding', 'arena_open', 'rapid_fire'].includes(d.status)).length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center">
              <p className="text-slate-400">No domains are currently active. Start a bidding round from the Manage Domains page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {domains
                .filter(d => ['bidding', 'arena_open', 'rapid_fire'].includes(d.status))
                .map((domain) => {
                const activeQuestion = questions.find(q => q.domain_id === domain.id && q.is_active);
                const isAdvancing = advancingDomain === domain.id;
                const statusLabel = domain.status === 'bidding' ? '🎯 Bidding' : domain.status === 'arena_open' ? '⚡ Arena Open' : '🔥 Buzz Round';
                return (
                  <Card key={`active-${domain.id}`} className={`${activeQuestion ? 'bg-slate-900/50 border-emerald-500/50' : 'bg-slate-900/30 border-slate-800/50'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium text-slate-300">{domain.name}</CardTitle>
                        <span className="text-xs text-slate-500">{statusLabel}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {activeQuestion ? (
                        <div className="space-y-3">
                          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{activeQuestion.content}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-xs ${
                              activeQuestion.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : 
                              activeQuestion.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {activeQuestion.difficulty?.toUpperCase()}
                            </Badge>
                            <Badge className="text-xs bg-emerald-500/20 text-emerald-400">LIVE</Badge>
                            {activeQuestion.correct_answer && (
                              <Badge className="text-xs bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                                ✓ ANS: {activeQuestion.correct_answer}
                              </Badge>
                            )}
                          </div>
                          <Button
                            onClick={() => advanceToNextQuestion(domain.id)}
                            disabled={isAdvancing}
                            size="sm"
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs py-1"
                          >
                            {isAdvancing ? (<><Loader className="w-3 h-3 mr-1 animate-spin" />Advancing...</>) : 'Start Next Question →'}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-slate-400 text-sm">No active question</p>
                          <p className="text-slate-500 text-xs mt-1">The domain is live but no question is set active yet.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading questions...</div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Question Bank</h2>
            <select
              value={filterDomainId}
              onChange={(e) => setFilterDomainId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 w-64 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="all">All Domains</option>
              {domains.map(d => (
                <option key={`filter-${d.id}`} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {domains.filter(d => filterDomainId === 'all' || d.id === filterDomainId).map((domain) => {
            const domainQuestions = groupedByDomain[domain.id] || [];
            const allDomainSelected = domainQuestions.length > 0 && domainQuestions.every((q: any) => selectedIds.has(q.id));
            const someDomainSelected = domainQuestions.some((q: any) => selectedIds.has(q.id));
            
            return (
              <Card key={domain.id} className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-white mb-1">{domain.name}</CardTitle>
                      <CardDescription className="text-slate-400">{domainQuestions.length} questions assigned</CardDescription>
                    </div>
                    {domainQuestions.length > 0 && (
                      <button
                        onClick={() => toggleDomain(domain.id)}
                        className="hover:opacity-70 transition-opacity"
                      >
                        {allDomainSelected ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        ) : someDomainSelected ? (
                          <div className="w-6 h-6 border-2 border-emerald-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          </div>
                        ) : (
                          <Circle className="w-6 h-6 text-slate-600" />
                        )}
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {domainQuestions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No questions assigned to this domain yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {domainQuestions.map((question: any) => (
                        <div 
                          key={question.id}
                          className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-emerald-500/50 transition-colors group"
                        >
                          <button
                            onClick={() => toggleQuestion(question.id)}
                            className="hover:opacity-70 transition-opacity mt-0.5"
                          >
                            {selectedIds.has(question.id) ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-500" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{question.content}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge className={`text-xs ${
                                question.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : 
                                question.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {question.difficulty?.toUpperCase()}
                              </Badge>
                              <Badge className="text-xs bg-slate-800 text-slate-400">
                                {question.round_type === 'bidding' ? 'AUCTION' : 'BUZZER'}
                              </Badge>
                              {question.is_active && (
                                <Badge className="text-xs bg-emerald-500/20 text-emerald-400">ACTIVE</Badge>
                              )}
                              {question.correct_answer && (
                                <Badge className="text-xs bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                                  ✓ ANS: {question.correct_answer}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingQuestion(question);
                              setEditDomainId(question.domain_id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <Edit2 className="w-4 h-4 text-slate-400 hover:text-emerald-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Domain Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-900 border-slate-800 max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-white">Reassign Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">Question:</p>
                <p className="text-slate-200 text-sm">{editingQuestion.content}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">Assign to Domain:</label>
                <select
                  value={editDomainId}
                  onChange={(e) => setEditDomainId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select a domain...</option>
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleReassignQuestion(editingQuestion.id, editDomainId)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setEditingQuestion(null);
                    setEditDomainId('');
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
