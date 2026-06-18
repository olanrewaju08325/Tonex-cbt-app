import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { Trophy, Clock, CheckCircle, XCircle, RotateCcw, Eye, Share2, TrendingUp, ThumbsUp, BookOpen } from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";

export function ResultsPage() {
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
