import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Bookmark, BookOpen, Flag, ChevronLeft, ChevronRight, X, CheckCircle, XCircle, Trash2, Crown, Sparkles, AlertCircle } from "lucide-react";
import { useBookmarks, useToggleBookmark } from "../../lib/hooks/useBookmarks";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";
import { getAIExplanation } from "../../lib/gemini";
import Latex from "react-latex-next";

export function BookmarksPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  
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

    if (!item) return;
    setAiModal(true);
    setAiLoading(true);
    setAiResult(null);

    const q = item.questions as any;
    try {
      const res = await getAIExplanation({
        questionText: q.text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctAnswer: q.correct_option || q.correct_answer,
        userAnswer: null,
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
  
  const { data: bookmarks, isLoading } = useBookmarks();
  const { mutateAsync: toggleBookmark } = useToggleBookmark();

  if (!profile?.is_premium) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center mt-20 bg-[#0F172A] border border-white/5 rounded-2xl shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Crown size={30} className="text-[#F59E0B]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 font-['Manrope']">Premium Feature</h2>
        <p className="text-[#94A3B8] text-sm mb-6 max-w-md mx-auto leading-relaxed">
          Bookmarking difficult questions for later review is only available to premium subscribers. Upgrade now to save questions and study smarter.
        </p>
        <button 
          onClick={() => navigate("/premium")}
          className="bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] text-white px-8 py-3.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
        >
          Upgrade to Premium
        </button>
      </div>
    );
  }

  const handleRemove = async (questionId: string) => {
    try {
      await toggleBookmark({ questionId, isBookmarked: true });
      toast.success("Bookmark removed");
      if (selected !== null && bookmarks && selected >= bookmarks.length - 1) {
        setSelected(Math.max(0, selected - 1));
      }
    } catch {
      toast.error("Failed to remove bookmark");
    }
  };

  const item = selected !== null && bookmarks ? bookmarks[selected] : null;
  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-['Manrope']">
            Bookmarks
          </h1>
          <p className="text-[#64748B] text-sm">
            {isLoading ? "Loading…" : `${bookmarks?.length ?? 0} saved questions`}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-[#0F172A]" />)}
          </div>
        ) : !bookmarks || bookmarks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-12 text-center">
            <Bookmark size={40} className="text-[#2563EB]/40 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No bookmarks yet</p>
            <p className="text-[#475569] text-sm">Bookmark questions during practice to review them here.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* List panel */}
            <div className="space-y-2">
              {bookmarks.map((bm: any, i: number) => (
                <motion.button
                  key={bm.id}
                  onClick={() => setSelected(i)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`w-full text-left bg-[#0F172A] border rounded-2xl p-4 group transition-all ${
                    selected === i
                      ? "border-[#2563EB]/40 bg-[#2563EB]/10"
                      : "border-white/6 hover:border-white/12"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Bookmark size={14} className={`mt-0.5 shrink-0 ${selected === i ? "text-[#60A5FA]" : "text-[#475569]"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-[#60A5FA] bg-[#2563EB]/15 px-2 py-0.5 rounded">
                          {bm.questions?.subjects?.name || "Subject"}
                        </span>
                      </div>
                      <p className="text-[#94A3B8] text-xs line-clamp-2">{bm.questions?.text}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(bm.question_id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[#EF4444]/15 text-[#475569] hover:text-[#EF4444] transition-all shrink-0"
                      title="Remove Bookmark"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Detail panel */}
            <div className="hidden md:block">
              <AnimatePresence mode="wait">
                {item ? (
                  <motion.div
                    key={selected}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="sticky top-6"
                  >
                    <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-5 mb-3">
                      {(() => {
                        const q = item.questions as any;
                        return (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-semibold text-[#60A5FA] bg-[#2563EB]/15 px-2.5 py-1 rounded-full">
                                {q?.subjects?.name}
                              </span>
                              <button onClick={() => handleRemove(item.question_id)} className="text-[#475569] hover:text-[#EF4444] transition-colors" title="Remove Bookmark">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="text-white text-sm leading-relaxed font-medium mb-4"><Latex>{q?.text}</Latex></div>

                            <div className="space-y-2">
                              {[q?.option_a, q?.option_b, q?.option_c, q?.option_d].map((opt, i) => {
                                if (!opt) return null;
                                const letter = optionLetters[i];
                                const isCorrect = letter === q?.correct_option || letter === q?.correct_answer;
                                return (
                                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl text-xs border ${
                                    isCorrect ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]" : "bg-[#1E293B]/40 border-white/5 text-[#64748B]"
                                  }`}>
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${isCorrect ? "bg-[#22C55E] text-white" : "bg-[#1E293B] text-[#475569]"}`}>{letter}</span>
                                    <span className="flex-1"><Latex>{opt}</Latex></span>
                                    {isCorrect && <CheckCircle size={12} />}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-4 bg-[#0B3D91]/15 border border-[#2563EB]/20 rounded-xl p-3">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <BookOpen size={12} className="text-[#60A5FA]" />
                                  <span className="text-[#60A5FA] text-xs font-semibold">Explanation</span>
                                </div>
                                <button 
                                  onClick={handleAIExplain}
                                  className="flex items-center gap-1 text-[#60A5FA] hover:text-white text-[10px] font-bold bg-[#2563EB]/10 border border-[#2563EB]/20 hover:bg-[#2563EB]/25 px-2 py-0.5 rounded transition-all"
                                  title="Get step-by-step AI explanation"
                                >
                                  <Sparkles size={10} /> Explain with AI
                                </button>
                              </div>
                              <div className="text-[#94A3B8] text-xs leading-relaxed"><Latex>{q?.explanation || "No explanation provided for this question."}</Latex></div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-2">
                      <button onClick={() => setSelected(s => Math.max(0, (s ?? 0) - 1))} disabled={selected === 0}
                        className="flex-1 flex items-center justify-center gap-1 bg-[#0F172A] border border-white/6 text-[#64748B] hover:text-white py-2 rounded-xl text-xs disabled:opacity-30 transition-colors">
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <button onClick={() => setSelected(s => Math.min(bookmarks.length - 1, (s ?? 0) + 1))} disabled={selected === bookmarks.length - 1}
                        className="flex-1 flex items-center justify-center gap-1 bg-[#0F172A] border border-white/6 text-[#64748B] hover:text-white py-2 rounded-xl text-xs disabled:opacity-30 transition-colors">
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-[#0F172A] border border-white/6 rounded-2xl p-12 text-center">
                    <Flag size={28} className="text-[#2563EB]/30 mx-auto mb-3" />
                    <p className="text-[#475569] text-sm">Select a bookmark to review</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

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
    </div>
  );
}
