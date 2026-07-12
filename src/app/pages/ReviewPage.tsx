import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Minus, BookOpen, Filter, Flag, Sparkles, X, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { getAIExplanation } from "../../lib/gemini";
import Latex from "react-latex-next";

export function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const state = location.state as {
    answers: (string | null)[];
    questions: any[];
    correct: number;
    subjectName?: string;
  } | null;

  const [filter, setFilter] = useState<"all" | "wrong" | "correct" | "unanswered">("all");
  const [current, setCurrent] = useState(0);
  const [flagModal, setFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagging, setFlagging] = useState(false);

  // AI Assistant states
  const [aiModal, setAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ success: boolean; text?: string; comingSoon?: boolean; message?: string } | null>(null);

  const handleAIExplain = async () => {
    if (!profile?.is_premium) {
      toast.error("AI Study Assistant is a premium feature. Please upgrade to unlock!");
      navigate("/premium");
      return;
    }

    setAiModal(true);
    setAiLoading(true);
    setAiResult(null);

    const q = item.q;
    try {
      const res = await getAIExplanation({
        questionText: q.text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctAnswer: item.correctAns,
        userAnswer: item.userAns,
        registryExplanation: q.explanation
      });
      setAiResult(res);
    } catch (err: any) {
      setAiResult({
        success: false,
        message: "An unexpected error occurred. Please try again."
      });
    } finally {
      setAiLoading(false);
    }
  };

  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-white font-bold text-sm mt-3 mb-1.5">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-white font-black text-base mt-4 mb-2">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="text-[#94A3B8] text-xs ml-4 list-disc mb-1">{line.substring(2)}</li>;
      }
      
      const parts = [];
      let currentLine = line;
      let boldIndex = currentLine.indexOf('**');
      while (boldIndex !== -1) {
        const endBoldIndex = currentLine.indexOf('**', boldIndex + 2);
        if (endBoldIndex === -1) break;
        parts.push(currentLine.substring(0, boldIndex));
        parts.push(<strong key={boldIndex} className="text-white font-semibold">{currentLine.substring(boldIndex + 2, endBoldIndex)}</strong>);
        currentLine = currentLine.substring(endBoldIndex + 2);
        boldIndex = currentLine.indexOf('**');
      }
      parts.push(currentLine);
      return <p key={i} className="text-[#94A3B8] text-xs leading-relaxed mb-2.5">{parts}</p>;
    });
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-[#08142D] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-[#64748B] mb-4">No review data available.</div>
          <button onClick={() => navigate("/practice")} className="bg-[#2563EB] text-white px-6 py-3 rounded-xl font-semibold">
            Take a Practice Exam
          </button>
        </div>
      </div>
    );
  }

  const { answers, questions } = state;

  const submitFlag = async () => {
    const q = filtered[current]?.q;
    if (!flagReason.trim()) return toast.error("Please describe the error");
    if (!q || !profile) return;
    setFlagging(true);
    const { error } = await supabase.from("question_flags").upsert({
      question_id: q.id,
      user_id: profile.id,
      reason: flagReason,
      status: "pending",
    }, { onConflict: "question_id,user_id" });
    setFlagging(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Question reported! Our team will review it.");
    setFlagModal(false);
    setFlagReason("");
  };

  const filtered = questions.map((q, i) => {
    const userAns = answers[i];
    const correctAns = q.correct_option;
    const status = !userAns ? "unanswered" : userAns === correctAns ? "correct" : "wrong";
    return { q, userAns, correctAns, status, origIdx: i };
  }).filter(item => filter === "all" || item.status === filter);

  const item = filtered[current];
  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-extrabold text-white mb-1 font-['Manrope']">
            Review Answers
          </h1>
          <p className="text-[#64748B] text-sm">{state.subjectName || "Practice"} · {questions.length} questions</p>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {([
            { key: "all", label: "All", count: questions.length },
            { key: "wrong", label: "Wrong", count: questions.filter((q, i) => answers[i] && answers[i] !== q.correct_option).length },
            { key: "correct", label: "Correct", count: state.correct },
            { key: "unanswered", label: "Skipped", count: answers.filter(a => !a).length },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setCurrent(0); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                filter === tab.key
                  ? "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#60A5FA]"
                  : "border-white/6 text-[#64748B] hover:text-white hover:border-white/12"
              }`}
            >
              <Filter size={12} />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                filter === tab.key ? "bg-[#2563EB]/30 text-[#60A5FA]" : "bg-[#1E293B] text-[#475569]"
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-12 text-center">
            <CheckCircle size={40} className="text-[#22C55E] mx-auto mb-3" />
            <p className="text-white font-semibold">No questions in this category</p>
          </div>
        ) : (
          <>
            {/* Navigation */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0}
                title="Previous Question"
                className="p-2 rounded-xl bg-[#0F172A] border border-white/6 text-[#475569] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[#64748B] text-sm">
                {current + 1} / {filtered.length}
              </span>
              <button
                onClick={() => setCurrent(c => Math.min(filtered.length - 1, c + 1))}
                disabled={current === filtered.length - 1}
                title="Next Question"
                className="p-2 rounded-xl bg-[#0F172A] border border-white/6 text-[#475569] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <div className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                item.status === "correct"
                  ? "bg-[#22C55E]/15 text-[#22C55E]"
                  : item.status === "wrong"
                  ? "bg-[#EF4444]/15 text-[#EF4444]"
                  : "bg-[#F59E0B]/15 text-[#F59E0B]"
              }`}>
                {item.status === "correct" ? <CheckCircle size={12} /> : item.status === "wrong" ? <XCircle size={12} /> : <Minus size={12} />}
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </div>
            </div>

            <motion.div
              key={`${filter}-${current}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Question */}
              <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-4">
                <div className="text-[#64748B] text-xs mb-3">Q{item.origIdx + 1} · {item.q.subjects?.name || "Subject"} · {item.q.universities?.short_name || ""}</div>
                <div className="text-white text-base leading-relaxed font-medium whitespace-pre-wrap"><Latex>{item.q.text}</Latex></div>
                {item.q.image_url && (
                  <img src={item.q.image_url} alt="Question figure" className="mt-4 rounded-lg max-h-64 object-contain" />
                )}
              </div>

              {/* Options with correct/wrong highlight */}
              <div className="space-y-3 mb-4">
                {[item.q.option_a, item.q.option_b, item.q.option_c, item.q.option_d].map((opt, i) => {
                  if (!opt) return null;
                  const letter = optionLetters[i];
                  const isCorrect = letter === item.correctAns;
                  const isUserAnswer = letter === item.userAns;
                  const isWrongUserAnswer = isUserAnswer && !isCorrect;

                  let cls = "bg-[#0F172A] border-white/6 text-[#64748B]";
                  if (isCorrect) cls = "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]";
                  else if (isWrongUserAnswer) cls = "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]";

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-4 p-4 rounded-2xl border ${cls}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                        isCorrect ? "bg-[#22C55E] text-white"
                        : isWrongUserAnswer ? "bg-[#EF4444] text-white"
                        : "bg-[#1E293B] text-[#475569]"
                      }`}>
                        {letter}
                      </div>
                      <span className="text-sm flex-1"><Latex>{opt}</Latex></span>
                      {isCorrect && <CheckCircle size={16} className="text-[#22C55E] shrink-0" />}
                      {isWrongUserAnswer && <XCircle size={16} className="text-[#EF4444] shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              <div className="bg-[#0B3D91]/15 border border-[#2563EB]/20 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-[#60A5FA]" />
                    <span className="text-[#60A5FA] font-bold text-sm">Explanation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleAIExplain}
                      className="flex items-center gap-1 text-[#60A5FA] hover:text-white text-xs font-semibold bg-[#2563EB]/10 border border-[#2563EB]/20 hover:bg-[#2563EB]/25 px-2.5 py-1 rounded-lg transition-all"
                      title="Get step-by-step AI explanation"
                    >
                      <Sparkles size={11} /> Explain with AI
                    </button>
                    <button onClick={() => setFlagModal(true)}
                      className="flex items-center gap-1 text-[#475569] hover:text-[#EF4444] text-xs font-semibold transition-colors"
                      title="Report an error">
                      <Flag size={11} /> Report Error
                    </button>
                  </div>
                </div>
                {profile?.is_premium ? (
                  <div className="text-[#94A3B8] text-sm leading-relaxed">
                    <Latex>{item.q.explanation || "No explanation provided for this question."}</Latex>
                  </div>
                ) : (
                  <div className="bg-[#0F172A] border border-white/5 rounded-xl p-6 text-center relative overflow-hidden mt-2">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#8B5CF6] flex items-center justify-center mb-3">
                        <BookOpen className="text-white" size={24} />
                      </div>
                      <h4 className="text-white font-bold mb-1 text-base">Detailed Explanations Locked</h4>
                      <p className="text-[#94A3B8] text-xs max-w-xs mx-auto mb-4">
                        Upgrade to Premium to unlock step-by-step solutions and understand exactly why you missed this question.
                      </p>
                      <button onClick={() => navigate("/premium")} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 rounded-full text-xs font-bold transition-all shadow-lg">
                        Unlock Explanations
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {flagModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50" onClick={() => setFlagModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4">
              <div className="bg-[#0B1829] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Flag size={16} className="text-[#EF4444]" />
                  <h3 className="text-white font-bold">Report an Error</h3>
                </div>
                <p className="text-[#64748B] text-xs mb-4">Help us improve the quality of this question.</p>
                <textarea
                  placeholder="e.g. Wrong correct answer, typo in option B..."
                  value={flagReason}
                  onChange={e => setFlagReason(e.target.value)}
                  className="w-full h-24 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setFlagModal(false)} className="flex-1 bg-[#1E293B] text-[#94A3B8] font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
                  <button onClick={submitFlag} disabled={flagging}
                    className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {flagging ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Flag size={13} /> Submit</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* AI Explanation Modal */}
      <AnimatePresence>
        {aiModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm" onClick={() => setAiModal(false)} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4 pointer-events-none">
              <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative pointer-events-auto max-h-[80vh] flex flex-col">
                <button onClick={() => setAiModal(false)} className="absolute top-4 right-4 text-[#64748B] hover:text-white" title="Close">
                  <X size={20} />
                </button>
                <div className="flex items-center gap-2 mb-4 shrink-0">
                  <Sparkles size={20} className="text-[#60A5FA] animate-pulse" />
                  <h3 className="text-white font-extrabold text-lg font-['Manrope']">AI Study Assistant</h3>
                </div>
                
                <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[#94A3B8] text-sm font-semibold animate-pulse">AI is analyzing the question...</p>
                    </div>
                  ) : aiResult?.comingSoon ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles size={24} className="text-amber-500" />
                      </div>
                      <h4 className="text-white font-bold mb-2">Feature Coming Soon</h4>
                      <p className="text-[#64748B] text-xs leading-relaxed max-w-sm mx-auto">
                        AI Study Assistant is currently in preview. Once the administrator configures the AI key, you will get step-by-step tutoring instantly!
                      </p>
                    </div>
                  ) : aiResult?.success && aiResult.text ? (
                    <div className="prose prose-invert max-w-none text-[#94A3B8] text-sm leading-relaxed">
                      {formatMarkdown(aiResult.text)}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={24} className="text-red-500" />
                      </div>
                      <h4 className="text-white font-bold mb-1">Failed to Explain</h4>
                      <p className="text-[#64748B] text-sm">
                        {aiResult?.message || "Something went wrong. Please check your internet and try again."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex justify-end shrink-0">
                  <button onClick={() => setAiModal(false)} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all">
                    Got it, Thanks!
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
