import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  BarChart2, CheckCircle, TrendingUp, XCircle, Target, Trophy, Clock,
  BookOpen, AlertTriangle, Flame, Zap, Lock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, BarChart, Bar, Cell
} from "recharts";
import { useUserStats } from "../../lib/hooks/useUserStats";
import { useExamSessions } from "../../lib/hooks/useExamSessions";
import { useTopicWeakness } from "../../lib/hooks/useTopicWeakness";
import { useAuth } from "../../contexts/AuthContext";
import { Skeleton } from "../components/ui/skeleton";

const SUBJECT_COLORS: Record<string, string> = {
  English: "#2563EB",
  Mathematics: "#7C3AED",
  Physics: "#F59E0B",
  Chemistry: "#22C55E",
  Biology: "#EC4899",
};

function TopicAccuracyBar({ topic, subject, accuracy, incorrect, total }: {
  topic: string; subject: string; accuracy: number; incorrect: number; total: number;
}) {
  const isRed = accuracy < 50;
  const isYellow = accuracy >= 50 && accuracy < 70;
  const barColor = isRed ? "#EF4444" : isYellow ? "#F59E0B" : "#22C55E";
  const bgColor = isRed ? "#EF444415" : isYellow ? "#F59E0B15" : "#22C55E15";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isRed && <AlertTriangle size={13} className="text-red-400 shrink-0" />}
          {isYellow && <Flame size={13} className="text-amber-400 shrink-0" />}
          {!isRed && !isYellow && <Zap size={13} className="text-emerald-400 shrink-0" />}
          <span className="text-white text-sm font-medium truncate">{topic}</span>
          <span className="text-[#475569] text-xs shrink-0">• {subject}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[#475569] text-xs">{incorrect} wrong / {total}</span>
          <span className="text-sm font-bold" style={{ color: barColor }}>{accuracy}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full w-full" style={{ background: bgColor }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${accuracy}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-2 rounded-full"
          style={{ background: barColor }}
        />
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: sessions, isLoading: sessionsLoading } = useExamSessions(20);
  const { data: topicWeakness, isLoading: topicsLoading } = useTopicWeakness();

  // Build score timeline from sessions
  const timeline = (sessions || []).slice(0, 20).reverse().map((s: any, i: number) => ({
    index: i + 1,
    score: Math.round(s.score_percentage),
    subject: s.subjects?.name || "Mixed",
  }));

  // Group by subject for scores
  const subjectMap: Record<string, { total: number; count: number }> = {};
  (sessions || []).forEach((s: any) => {
    const name = s.subjects?.name || "Mixed";
    if (!subjectMap[name]) subjectMap[name] = { total: 0, count: 0 };
    subjectMap[name].total += s.score_percentage;
    subjectMap[name].count += 1;
  });
  const subjectBreakdown = Object.entries(subjectMap).map(([subject, { total, count }]) => ({
    subject: subject.length > 7 ? subject.slice(0, 7) : subject,
    score: Math.round(total / count),
    fill: SUBJECT_COLORS[subject] || "#60A5FA",
  }));

  // Group by subject for time management
  const subjectTimeMap: Record<string, { totalTime: number; totalQuestions: number }> = {};
  (sessions || []).forEach((s: any) => {
    const name = s.subjects?.name || "Mixed";
    if (!subjectTimeMap[name]) subjectTimeMap[name] = { totalTime: 0, totalQuestions: 0 };
    subjectTimeMap[name].totalTime += s.time_taken_seconds || 0;
    subjectTimeMap[name].totalQuestions += s.total_questions || 1;
  });
  const subjectTimeData = Object.entries(subjectTimeMap)
    .filter(([_, data]) => data.totalQuestions > 0)
    .map(([subject, data]) => ({
      subject: subject.length > 7 ? subject.slice(0, 7) : subject,
      secondsPerQuestion: Math.round(data.totalTime / data.totalQuestions),
      fill: SUBJECT_COLORS[subject] || "#60A5FA",
    }));

  const avgScore = stats?.avg_score ? Math.round(Number(stats.avg_score)) : 0;
  const gradeColor = avgScore >= 80 ? "#22C55E" : avgScore >= 60 ? "#60A5FA" : avgScore >= 50 ? "#F59E0B" : "#EF4444";

  const isLoading = statsLoading || sessionsLoading;

  // Classify weak topics
  const criticalTopics = (topicWeakness || []).filter(t => t.accuracy < 50);
  const improvingTopics = (topicWeakness || []).filter(t => t.accuracy >= 50 && t.accuracy < 70);

  const handleShareWithCoach = () => {
    if (!stats) return;
    const dateStr = new Date().toLocaleDateString();
    const message = `*My Tonex CBT Weekly Study Report (${dateStr})* 📈\n\n` +
      `• *Exams Taken:* ${stats.tests_taken}\n` +
      `• *Average Score:* ${avgScore}%\n` +
      `• *Streak:* ${stats.streak_count} days\n\n` +
      (criticalTopics.length > 0 
        ? `*Focus Areas needed:* ${criticalTopics.map(t => t.topic).slice(0, 3).join(", ")}\n\n` 
        : `*Status:* Performing well on all target topics! 🚀\n\n`) +
      `Sent from Tonex CBT app. Help me monitor my Post-UTME preparation!`;
      
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-['Manrope']">
            Analytics
          </h1>
          <p className="text-[#64748B] text-sm">Track your performance over time</p>
        </motion.div>

        {/* Key stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          {[
            { icon: BookOpen, label: "Exams Taken", value: stats?.tests_taken ?? "—", color: "#2563EB" },
            { icon: Target, label: "Avg Score", value: stats ? `${avgScore}%` : "—", color: gradeColor },
            { icon: CheckCircle, label: "Total Correct", value: stats ? Number(stats.correct_answers).toLocaleString() : "—", color: "#22C55E" },
            { icon: TrendingUp, label: "Streak", value: stats ? `${stats.streak_count} days` : "—", color: "#F59E0B" },
          ].map((item, i) => (
            <div key={i} className="bg-[#0F172A] border border-white/6 rounded-2xl p-4">
              {isLoading ? <Skeleton className="h-14 bg-[#1E293B] rounded-xl" /> : (
                <>
                  <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style={{ background: `${item.color}18` }}>
                    <item.icon size={16} style={{ color: item.color }} />
                  </div>
                  <div className="text-white text-xl font-extrabold font-['Manrope']">{item.value}</div>
                  <div className="text-[#475569] text-xs mt-0.5">{item.label}</div>
                </>
              )}
            </div>
          ))}
        </motion.div>

        {/* Detailed charts container */}
        <div className="relative">
          <div className={!profile?.is_premium ? "blur-[5px] opacity-20 select-none pointer-events-none" : ""}>
            {/* Score gauge + Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Gauge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 flex flex-col items-center"
          >
            <div className="text-white font-semibold text-sm mb-4">Overall Score</div>
            {isLoading ? <Skeleton className="w-40 h-40 rounded-full bg-[#1E293B]" /> : (
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius={52} outerRadius={68}
                    startAngle={90} endAngle={90 - (avgScore / 100) * 360}
                    data={[{ value: avgScore, fill: gradeColor }]}>
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#1E293B" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{avgScore}%</span>
                  <span className="text-xs text-[#64748B]">average</span>
                </div>
              </div>
            )}
            <div className="mt-4 text-center">
              <p className="text-sm font-semibold" style={{ color: gradeColor }}>
                {avgScore >= 80 ? "Excellent" : avgScore >= 60 ? "Good" : avgScore >= 50 ? "Average" : avgScore > 0 ? "Needs Work" : "No data yet"}
              </p>
              <p className="text-[#475569] text-xs mt-0.5">
                {avgScore >= 60 ? (
                  <span className="flex items-center gap-1 justify-center"><CheckCircle size={11} /> Above cut-off</span>
                ) : 'Below cut-off — keep going'}
              </p>
            </div>
          </motion.div>

          {/* Score timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-6"
          >
            <div className="text-white font-semibold text-sm mb-4">Score Trend</div>
            {isLoading ? <Skeleton className="h-36 bg-[#1E293B] rounded-xl" /> : timeline.length > 1 ? (
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="index" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#E2E8F0" }}
                      formatter={(v: number) => [`${v}%`, "Score"]}
                    />
                    <Area type="monotone" dataKey="score" stroke="#2563EB" fill="url(#scoreGrad)" strokeWidth={2} dot={{ fill: "#2563EB", r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-36 flex items-center justify-center text-[#475569] text-sm">
                Take more exams to see your trend
              </div>
            )}
          </motion.div>
        </div>

        {/* ============================================================
            TOPIC-LEVEL WEAKNESS DETECTION (NEW)
            ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-white font-semibold text-sm">Topics Needing Improvement</div>
              <div className="text-[#475569] text-xs mt-0.5">Based on your incorrect answers across all practice sessions</div>
            </div>
            {criticalTopics.length > 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
                <AlertTriangle size={13} className="text-red-400" />
                <span className="text-red-400 text-xs font-semibold">{criticalTopics.length} Critical</span>
              </div>
            )}
          </div>

          {topicsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 bg-[#1E293B] rounded-xl" />)}
            </div>
          ) : topicWeakness && topicWeakness.length > 0 ? (
            <>
              {/* Legend */}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-red-400" />
                  <span className="text-[#64748B] text-xs">Critical (&lt;50%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame size={12} className="text-amber-400" />
                  <span className="text-[#64748B] text-xs">Needs work (50–70%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-emerald-400" />
                  <span className="text-[#64748B] text-xs">Strong (≥70%)</span>
                </div>
              </div>

              <div className="space-y-4">
                {topicWeakness.map((t, i) => (
                  <TopicAccuracyBar
                    key={i}
                    topic={t.topic}
                    subject={t.subject}
                    accuracy={t.accuracy}
                    incorrect={t.incorrect}
                    total={t.total}
                  />
                ))}
              </div>

              {/* Study suggestion banner */}
              {criticalTopics.length > 0 && (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-red-300 text-sm font-semibold mb-1">Focus Areas</p>
                      <p className="text-red-400/70 text-xs leading-relaxed">
                        You're struggling most with{" "}
                        <span className="text-red-300 font-medium">{criticalTopics.map(t => t.topic).join(", ")}</span>.
                        Try using the Flashcards feature to review key formulas and concepts in these topics before your next session.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <Trophy size={32} className="text-[#2563EB]/30 mx-auto mb-3" />
              <p className="text-white text-sm font-semibold mb-1">No weakness data yet</p>
              <p className="text-[#475569] text-xs">
                Complete practice sessions to see your topic-level performance breakdown here.
              </p>
            </div>
          )}
        </motion.div>

        {/* WhatsApp Coach Card */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }}
            className="bg-gradient-to-r from-[#22C55E]/15 to-[#15803D]/10 border border-[#22C55E]/20 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <h4 className="text-white font-bold text-sm">Share Report with Tutor or Parent</h4>
              <p className="text-[#94A3B8] text-xs">Send a formatted WhatsApp progress report cards updates to parent or tutor.</p>
            </div>
            <button
              onClick={handleShareWithCoach}
              className="bg-[#22C55E] hover:bg-[#15803D] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-green-500/10 shrink-0"
            >
              <Zap size={13} />
              Send via WhatsApp
            </button>
          </motion.div>
        )}

        {/* Subject breakdown */}
        {subjectBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-6"
          >
            <div className="text-white font-semibold text-sm mb-4">By Subject</div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectBreakdown} barSize={24}>
                  <XAxis dataKey="subject" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#E2E8F0" }}
                    formatter={(v: number) => [`${v}%`, "Avg Score"]}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {subjectBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Subject Time-Management Analytics */}
        {subjectTimeData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-6"
          >
            <div className="text-white font-semibold text-sm mb-1">Subject Time-Management</div>
            <div className="text-[#475569] text-xs mb-4">Average seconds spent answering a single question by subject</div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectTimeData} layout="vertical" margin={{ left: 15, right: 15, top: 0, bottom: 0 }}>
                  <XAxis type="number" stroke="#64748B" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis dataKey="subject" type="category" stroke="#64748B" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#E2E8F0" }}
                    formatter={(v: number) => [`${v}s`, "Avg time per question"]}
                  />
                  <Bar dataKey="secondsPerQuestion" radius={[0, 4, 4, 0]}>
                    {subjectTimeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Recent sessions */}
        {!isLoading && sessions && sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-6"
          >
            <div className="text-white font-semibold text-sm mb-4">Recent Sessions</div>
            <div className="space-y-3">
              {sessions.slice(0, 8).map((s: any, i: number) => {
                const pct = Math.round(s.score_percentage);
                const color = pct >= 70 ? "#22C55E" : pct >= 50 ? "#F59E0B" : "#EF4444";
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black" style={{ background: `${color}18`, color }}>
                      {pct}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{s.subjects?.name || "Mixed"}</div>
                      <div className="text-[#475569] text-xs">{s.correct_answers}/{s.total_questions} correct</div>
                    </div>
                    <div className="flex items-center gap-1 text-[#475569] text-xs">
                      <Clock size={10} />
                      {Math.floor((s.time_taken_seconds || 0) / 60)}m
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {!isLoading && (!sessions || sessions.length === 0) && (
          <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-12 text-center">
            <BarChart2 size={40} className="text-[#2563EB]/30 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No analytics yet</p>
            <p className="text-[#475569] text-sm">Complete practice sessions to see your performance analytics here.</p>
          </div>
        )}
          </div>

          {!profile?.is_premium && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gradient-to-b from-transparent via-[#08142D]/90 to-[#08142D] pt-12">
              <div className="bg-[#0F172A] border border-[#2563EB]/25 rounded-2xl p-6 max-w-sm text-center shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Lock size={24} className="text-[#F59E0B]" />
                </div>
                <h3 className="text-white font-extrabold text-sm mb-2 font-['Manrope']">Detailed Analytics</h3>
                <p className="text-[#64748B] text-xs mb-5 leading-relaxed">
                  Get topic-level insights, score trends over time, subject weakness detection, and full session history with Tonex Premium.
                </p>
                <button
                  onClick={() => navigate("/premium")}
                  className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
                >
                  Upgrade to Premium
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
