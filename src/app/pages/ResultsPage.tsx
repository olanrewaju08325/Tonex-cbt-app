import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { Trophy, Clock, CheckCircle, XCircle, RotateCcw, Eye, Share2, TrendingUp, ThumbsUp, BookOpen, AlertTriangle, ChevronRight, Sparkles } from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { getAIExamSummary } from "../../lib/ai";

export function ResultsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    answers: (string | null)[];
    questions: any[];
    correct: number;
    timeTaken: number;
    subjectName: string;
    universityName: string;
  } | null;

  if (!state) {
    return (
      <div className="min-h-screen bg-[#08142D] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-[#64748B] mb-4">No exam data found.</div>
          <button
            onClick={() => navigate("/practice")}
            className="bg-[#2563EB] text-white px-6 py-3 rounded-xl font-semibold"
          >
            Take a Practice Exam
          </button>
        </div>
      </div>
    );
  }

  const { answers, questions, correct, timeTaken, subjectName, universityName } = state;
  const total = questions.length;
  const wrong = total - correct - answers.filter(a => !a).length;
  const unanswered = answers.filter(a => !a).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;

  const getGrade = () => {
    if (percentage >= 80) return { label: "Excellent", color: "#22C55E", Icon: Trophy };
    if (percentage >= 65) return { label: "Good", color: "#60A5FA", Icon: ThumbsUp };
    if (percentage >= 50) return { label: "Average", color: "#F59E0B", Icon: BookOpen };
    return { label: "Needs Improvement", color: "#EF4444", Icon: TrendingUp };
  };

  const grade = getGrade();

  // Group results by subtopic
  const topicsMap: Record<string, { subjectId: string; subjectName: string; correct: number; total: number }> = {};
  questions.forEach((q, index) => {
    const topicName = q.topic || "General Concepts";
    const subId = q.subject_id;
    const subName = q.subjects?.name || "Subject";
    const isCorrect = answers[index] === (q.correct_option || q.correct_answer);
    
    if (!topicsMap[topicName]) {
      topicsMap[topicName] = { subjectId: subId, subjectName: subName, correct: 0, total: 0 };
    }
    topicsMap[topicName].total += 1;
    if (isCorrect) {
      topicsMap[topicName].correct += 1;
    }
  });

  const topicWiseBreakdown = Object.entries(topicsMap).map(([topic, data]) => ({
    topic,
    subjectId: data.subjectId,
    subjectName: data.subjectName,
    correct: data.correct,
    total: data.total,
    accuracy: Math.round((data.correct / data.total) * 100),
  })).sort((a, b) => a.accuracy - b.accuracy);

  const subjectsSet = Array.from(new Set(questions.map(q => q.subjects?.name || "Subject")));
  const subjectBreakdown = subjectsSet.map(sub => {
    const subQs = questions.filter(q => (q.subjects?.name || "Subject") === sub);
    const subCorrect = subQs.filter((q, i) => {
      const origIdx = questions.findIndex(orig => orig.id === q.id);
      return answers[origIdx] === (q.correct_option || q.correct_answer);
    }).length;
    return {
      subject: sub.charAt(0).toUpperCase() + sub.slice(1, 4),
      score: subQs.length > 0 ? Math.round((subCorrect / subQs.length) * 100) : 0,
      fill: subQs.length > 0 && subCorrect / subQs.length >= 0.7 ? "#22C55E" : subQs.length > 0 && subCorrect / subQs.length >= 0.5 ? "#F59E0B" : "#EF4444",
    };
  });

  const radialData = [{ value: percentage, fill: grade.color }];

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Trigger low-score intervention email if score < 40%
  useEffect(() => {
    if (percentage < 40 && profile?.email) {
      fetch('/api/email/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'low_score',
          payload: { email: profile.email, name: profile.full_name?.split(' ')[0] || 'Student' }
        })
      }).catch(() => {});
    }
  }, [percentage, profile]);

  const generateSummary = async () => {
    if (!profile?.is_premium) return;
    setGeneratingSummary(true);
    try {
      const weakTopics = topicWiseBreakdown.filter(t => t.accuracy < 60).map(t => t.topic);
      const strongTopics = topicWiseBreakdown.filter(t => t.accuracy >= 75).map(t => t.topic);
      const summary = await getAIExamSummary({
        subjectName,
        scorePercentage: percentage,
        correctCount: correct,
        totalCount: total,
        weakTopics,
        strongTopics
      });
      setAiSummary(summary);
    } catch (e) {
      console.error("Failed to generate summary", e);
    } finally {
      setGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (profile?.is_premium && topicWiseBreakdown.length > 0) {
      generateSummary();
    }
  }, [profile?.is_premium]);

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <grade.Icon size={36} style={{ color: grade.color }} className="mx-auto mb-3" />
          <h1 className="text-3xl font-extrabold text-white mb-1 font-['Manrope']">
            Exam Complete!
          </h1>
          <p className="text-[#64748B] text-sm">{subjectName} · {universityName}</p>
        </motion.div>

        {/* Score circle + key stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-8 flex flex-col items-center"
          >
            <div className="relative w-40 h-40 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={70}
                  startAngle={90}
                  endAngle={90 - (percentage / 100) * 360}
                  data={radialData}
                >
                  <RadialBar dataKey="value" cornerRadius={10} fill={grade.color} background={{ fill: "#1E293B" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white">{percentage}%</span>
                <span className="text-xs text-[#64748B]">{correct}/{total}</span>
              </div>
            </div>
            <div
              className="text-lg font-extrabold mb-1"
              style={{ color: grade.color, fontFamily: 'Manrope, sans-serif' }}
            >
              {grade.label}
            </div>
            <div className="text-[#64748B] text-xs">
              {percentage >= 60 ? (
                <span className="flex items-center gap-1 justify-center"><CheckCircle size={12} /> Above cut-off score</span>
              ) : 'Below cut-off — keep practicing'}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { icon: CheckCircle, label: "Correct", value: correct, color: "#22C55E" },
              { icon: XCircle, label: "Wrong", value: wrong, color: "#EF4444" },
              { icon: Clock, label: "Time Used", value: `${minutes}m ${seconds}s`, color: "#60A5FA" },
              { icon: TrendingUp, label: "Unanswered", value: unanswered, color: "#F59E0B" },
            ].map((stat, i) => (
              <div key={i} className="bg-[#0F172A] border border-white/6 rounded-2xl p-4 flex flex-col gap-2">
                <stat.icon size={20} style={{ color: stat.color }} />
                <div className="text-white text-xl font-extrabold font-['Manrope']">
                  {stat.value}
                </div>
                <div className="text-[#64748B] text-xs">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* AI Performance Summary */}
        {profile?.is_premium && (aiSummary || generatingSummary) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 border border-[#2563EB]/30 rounded-2xl p-6 mb-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles size={48} className="text-[#60A5FA]" />
            </div>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-[#60A5FA]" />
              AI Performance Summary
            </h3>
            {generatingSummary ? (
              <div className="flex items-center gap-3 text-[#64748B] text-sm py-2">
                <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                Analyzing your exam performance...
              </div>
            ) : (
              <div className="text-[#94A3B8] text-sm leading-relaxed space-y-3 relative z-10">
                {aiSummary?.split('\n').map((paragraph, i) => (
                  paragraph.trim() ? <p key={i}>{paragraph}</p> : null
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Subject breakdown chart */}
        {subjectBreakdown.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-6"
          >
            <h3 className="text-white font-bold mb-4">Subject Breakdown</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectBreakdown} barSize={24}>
                  <XAxis dataKey="subject" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#E2E8F0" }}
                    formatter={(v: number) => [`${v}%`, "Score"]}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {subjectBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Topic-Wise Target Weakness breakdown card */}
        {topicWiseBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-6"
          >
            <h3 className="text-white font-bold mb-1 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#60A5FA]" />
              Topic-Wise Performance Analysis
            </h3>
            <p className="text-[#64748B] text-xs mb-4">Identify sub-topics that require additional revision and practice.</p>
            
            <div className="space-y-4">
              {topicWiseBreakdown.map((t, idx) => {
                const isWeak = t.accuracy < 60;
                const isIntermediate = t.accuracy >= 60 && t.accuracy < 75;
                const isStrong = t.accuracy >= 75;
                
                const accuracyColor = isStrong ? "#22C55E" : isIntermediate ? "#F59E0B" : "#EF4444";
                const badgeBg = isStrong ? "bg-[#22C55E]/10 text-[#22C55E]" : isIntermediate ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-[#EF4444]/10 text-[#EF4444]";
                const badgeLabel = isStrong ? "Strong Topic" : isIntermediate ? "Needs Practice" : "Critical Weakness";
                
                return (
                  <div key={idx} className="bg-[#1E293B]/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-semibold text-[#60A5FA] bg-[#2563EB]/15 px-2 py-0.5 rounded">
                          {t.subjectName}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badgeBg}`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <h4 className="text-white font-semibold text-sm truncate">{t.topic}</h4>
                      
                      {/* Bar indicator */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="bg-[#1E293B] rounded-full h-2 flex-1 max-w-[150px]">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${t.accuracy}%`, backgroundColor: accuracyColor }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-300">{t.accuracy}% ({t.correct}/{t.total})</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <button
                        onClick={() => {
                          navigate("/exam", {
                            state: {
                              mode: "practice",
                              subject: t.subjectId,
                              subjectName: t.subjectName,
                              topic: t.topic,
                              university: state.university || null,
                              count: 10,
                              timer: 15
                            }
                          });
                        }}
                        className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isWeak 
                            ? "bg-[#EF4444]/10 border border-[#EF4444]/20 hover:bg-[#EF4444]/20 text-[#EF4444]" 
                            : "bg-[#1E293B] border border-white/6 hover:border-white/12 text-[#94A3B8] hover:text-white"
                        }`}
                      >
                        <BookOpen size={12} />
                        Practice Topic
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <button
            onClick={() => navigate("/review", { state })}
            className="flex items-center justify-center gap-2 bg-[#2563EB]/15 border border-[#2563EB]/25 hover:bg-[#2563EB]/25 text-[#60A5FA] font-bold py-3.5 rounded-xl transition-all text-sm"
          >
            <Eye size={16} />
            Review Answers
          </button>
          <button
            onClick={() => navigate("/practice")}
            className="flex items-center justify-center gap-2 bg-[#0F172A] border border-white/6 hover:border-white/12 text-[#94A3B8] hover:text-white font-bold py-3.5 rounded-xl transition-all text-sm"
          >
            <RotateCcw size={16} />
            Retake Exam
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "My Tonex CBT Score",
                  text: `I scored ${percentage}% (${correct}/${total}) in ${subjectName} Post-UTME practice on Tonex CBT!`,
                });
              }
            }}
            className="flex items-center justify-center gap-2 bg-[#0F172A] border border-white/6 hover:border-white/12 text-[#94A3B8] hover:text-white font-bold py-3.5 rounded-xl transition-all text-sm"
          >
            <Share2 size={16} />
            Share Result
          </button>
        </motion.div>
      </div>
    </div>
  );
}
