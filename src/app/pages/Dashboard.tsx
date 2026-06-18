import { useNavigate, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  BookOpen, BarChart2, RotateCcw, Trophy, Crown, Clock,
  CheckCircle, XCircle, TrendingUp, ChevronRight, Zap, Users, Calendar, Layers, MessageCircle,
  Calculator, Award, Bookmark
} from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { useUserStats } from "../../lib/hooks/useUserStats";
import { useExamSessions } from "../../lib/hooks/useExamSessions";
import { useLeaderboard } from "../../lib/hooks/useLeaderboard";
import { Skeleton } from "../components/ui/skeleton";

const QUICK_ACTIONS = [
  { label: "Practice Questions", icon: BookOpen, path: "/practice", color: "#2563EB", bg: "#2563EB15", description: "Subject-wise practice" },
  { label: "Full Exam", icon: BarChart2, path: "/full-exam", color: "#7C3AED", bg: "#7C3AED15", description: "All uni subjects" },
  { label: "Detailed Analytics", icon: TrendingUp, path: "/analytics", color: "#06B6D4", bg: "#06B6D415", description: "Track your progress" },
  { label: "Saved Questions", icon: Bookmark, path: "/bookmarks", color: "#EC4899", bg: "#EC489915", description: "Review saved items" },
  { label: "Aggregate Calculator", icon: Calculator, path: "/aggregate-calculator", color: "#F59E0B", bg: "#F59E0B15", description: "Screening score calc" },
  { label: "Cut-Off Marks", icon: Award, path: "/cut-offs", color: "#10B981", bg: "#10B98115", description: "Merit marks check" },
  { label: "Review Mistakes", icon: RotateCcw, path: "/review", color: "#EF4444", bg: "#EF444415", description: "Learn from errors" },
  { label: "Study Flashcards", icon: Layers, path: "/flashcards", color: "#3B82F6", bg: "#3B82F615", description: "Memorize key terms" },
  { label: "Peer Challenges", icon: Users, path: "/challenges", color: "#A78BFA", bg: "#A78BFA15", description: "Challenge friends" },
  { label: "Exam Timetable", icon: Calendar, path: "/scheduler", color: "#22C55E", bg: "#22C55E15", description: "Plan your exams" },
];

import { useAnnouncements } from "../../lib/hooks/useAnnouncements";
import { useSubscription } from "../../lib/hooks/useSubscription";
import { AggregateCalculatorPage } from "./AggregateCalculatorPage";
import { CutOffMarksPage } from "./CutOffMarksPage";
import { AnalyticsPage } from "./AnalyticsPage";
import { BookmarksPage } from "./BookmarksPage";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "calculator", label: "Calculator" },
  { id: "cutoffs", label: "Cut-Off Marks" },
  { id: "analytics", label: "Analytics" },
  { id: "bookmarks", label: "Saved Questions" }
];

export function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const setActiveTab = (tab: string) => {
    if (tab === "overview") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const { profile, loading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: sessions, isLoading: sessionsLoading } = useExamSessions(5);
  const { data: announcements } = useAnnouncements(1);
  const { data: topStudents, isLoading: leaderboardLoading } = useLeaderboard(profile?.target_university_id);
  const { data: subscription } = useSubscription();

  // LocalStorage Cache fallbacks
  const [cachedStats, setCachedStats] = useState<any>(() => {
    try {
      const stored = localStorage.getItem("tonex_cache_stats");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [cachedSessions, setCachedSessions] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("tonex_cache_sessions");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [cachedAnnouncements, setCachedAnnouncements] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("tonex_cache_announcements");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [cachedTopStudents, setCachedTopStudents] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("tonex_cache_top_students");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [cachedSubscription, setCachedSubscription] = useState<any>(() => {
    try {
      const stored = localStorage.getItem("tonex_cache_subscription");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    if (stats) {
      localStorage.setItem("tonex_cache_stats", JSON.stringify(stats));
      setCachedStats(stats);
    }
  }, [stats]);

  useEffect(() => {
    if (sessions) {
      localStorage.setItem("tonex_cache_sessions", JSON.stringify(sessions));
      setCachedSessions(sessions);
    }
  }, [sessions]);

  useEffect(() => {
    if (announcements) {
      localStorage.setItem("tonex_cache_announcements", JSON.stringify(announcements));
      setCachedAnnouncements(announcements);
    }
  }, [announcements]);

  useEffect(() => {
    if (topStudents) {
      localStorage.setItem("tonex_cache_top_students", JSON.stringify(topStudents));
      setCachedTopStudents(topStudents);
    }
  }, [topStudents]);

  useEffect(() => {
    if (subscription) {
      localStorage.setItem("tonex_cache_subscription", JSON.stringify(subscription));
      setCachedSubscription(subscription);
    }
  }, [subscription]);

  if (authLoading || !profile) {
    return <div className="min-h-screen bg-[#08142D] px-4 py-6 flex justify-center items-center"><div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const displayStats = stats || cachedStats;
  const displaySessions = sessions || cachedSessions;
  const displayAnnouncements = announcements || cachedAnnouncements;
  const displayTopStudents = topStudents || cachedTopStudents;
  const displaySubscription = subscription || cachedSubscription;

  const showStatsLoading = statsLoading && !cachedStats;
  const showSessionsLoading = sessionsLoading && !cachedSessions.length;
  const showLeaderboardLoading = leaderboardLoading && !cachedTopStudents.length;

  const STAT_CARDS = [
    { label: "Tests Taken", value: displayStats?.tests_taken || 0, icon: BookOpen, color: "#2563EB" },
    { label: "Average Score", value: `${Math.round(displayStats?.avg_score || 0)}%`, icon: TrendingUp, color: "#22C55E" },
    { label: "Correct Answers", value: displayStats?.correct_answers || 0, icon: CheckCircle, color: "#7C3AED" },
    { label: "Streak", value: `${displayStats?.streak_count || 0} days`, icon: Zap, color: "#F59E0B" },
  ];

  const pieData = [
    { name: "Correct", value: displayStats?.correct_answers || 0, fill: "#22C55E" },
    { name: "Wrong", value: (displayStats?.total_questions || 0) - (displayStats?.correct_answers || 0), fill: "#EF4444" },
  ];

  const pctCorrect = displayStats?.total_questions ? Math.round((displayStats.correct_answers / displayStats.total_questions) * 100) : 0;
  const pctWrong = displayStats?.total_questions ? 100 - pctCorrect : 0;

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Horizontal Navigation Tabs */}
        <div className="border-b border-white/6 mb-8 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sticky top-0 bg-[#08142D]/90 backdrop-blur-md z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-2.5">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                    active
                      ? "text-white bg-[#2563EB]/20 border border-[#2563EB]/40 shadow-lg shadow-blue-500/10"
                      : "text-[#64748B] hover:text-[#94A3B8] hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Welcome Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#60A5FA] text-sm font-semibold mb-1">Good morning,</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Manrope']">
                {profile.full_name?.split(" ")[0] || "Student"}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0B3D91] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                {profile.full_name?.charAt(0) || "U"}
              </div>
              <div className="bg-[#1E293B] border border-white/6 text-[#F59E0B] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                <Zap size={10} className="fill-[#F59E0B]" />
                {profile.is_premium ? "Premium" : "Free Plan"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Announcement Banner */}
        {displayAnnouncements && displayAnnouncements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-[#2563EB]/20 to-[#7C3AED]/20 border border-[#2563EB]/30 rounded-2xl p-4 flex items-start gap-4 shadow-lg shadow-blue-900/20"
          >
            <div className="bg-[#2563EB]/20 p-2 rounded-xl mt-1 text-[#60A5FA]">
              <Zap size={20} className="fill-current" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm mb-1">{displayAnnouncements[0].title}</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{displayAnnouncements[0].message}</p>
            </div>
          </motion.div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {showStatsLoading ? Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-[#0F172A]" />
          )) : STAT_CARDS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-[#0F172A] border border-white/6 rounded-2xl p-4"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${stat.color}15` }}
              >
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <div className="text-white text-xl font-extrabold font-['Manrope']">
                {stat.value}
              </div>
              <div className="text-[#64748B] text-xs mt-0.5">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-white font-bold text-lg mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  if (action.path === "/aggregate-calculator") {
                    setActiveTab("calculator");
                  } else if (action.path === "/cut-offs") {
                    setActiveTab("cutoffs");
                  } else if (action.path === "/analytics") {
                    setActiveTab("analytics");
                  } else if (action.path === "/bookmarks") {
                    setActiveTab("bookmarks");
                  } else {
                    navigate(action.path);
                  }
                }}
                className="group bg-[#0F172A] border border-white/6 rounded-2xl p-4 text-left hover:border-white/12 hover:-translate-y-1 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: action.bg }}
                >
                  <action.icon size={20} style={{ color: action.color }} />
                </div>
                <div className="text-white text-sm font-semibold leading-tight">{action.label}</div>
                <div className="text-[#475569] text-xs mt-1">{action.description}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-6"
          >
            <h3 className="text-white font-bold mb-4">Overall Performance</h3>
            {showStatsLoading ? <Skeleton className="h-28 bg-[#1E293B] rounded-xl w-full" /> : (
            <div className="flex items-center gap-6">
              <div className="relative w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={54}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-white text-lg font-extrabold">{Math.round(displayStats?.avg_score || 0)}%</span>
                  <span className="text-[#64748B] text-[9px]">avg score</span>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                {[
                  { label: "Correct", count: displayStats?.correct_answers || 0, color: "#22C55E", pct: pctCorrect },
                  { label: "Wrong", count: (displayStats?.total_questions || 0) - (displayStats?.correct_answers || 0), color: "#EF4444", pct: pctWrong },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#94A3B8]">{item.label}</span>
                      <span className="text-white font-semibold">{item.count}</span>
                    </div>
                    <div className="bg-[#1E293B] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${item.pct}%`, background: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-6"
          >
            <h3 className="text-white font-bold mb-4">
              {!profile.is_premium ? "Upgrade to Premium" : "Smart Insights"}
            </h3>
            {!profile.is_premium ? (
              <div className="bg-gradient-to-r from-[#0B3D91]/40 to-[#2563EB]/20 border border-[#2563EB]/25 rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center shrink-0">
                  <Crown size={24} className="text-[#F59E0B]" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-sm">Unlock Your Full Potential</div>
                  <div className="text-[#64748B] text-xs mt-0.5">Unlimited questions, full CBT exams, and advanced analytics</div>
                </div>
                <button
                  onClick={() => navigate("/premium")}
                  className="bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white text-xs font-bold px-4 py-2.5 rounded-xl shrink-0 hover:-translate-y-0.5 transition-all shadow-md shadow-blue-500/20"
                >
                  Upgrade
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#1E293B]/40 border border-[#22C55E]/20 rounded-2xl p-5 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap size={20} className="text-[#22C55E]" />
                    <span className="text-white font-bold text-sm">You're doing great!</span>
                  </div>
                  <p className="text-[#94A3B8] text-xs leading-relaxed">
                    {displayStats?.avg_score && displayStats.avg_score >= 70 
                      ? "Your average score is excellent. Keep up the momentum and focus on practicing full-length exams to build stamina."
                      : displayStats?.avg_score && displayStats.avg_score >= 50
                      ? "You are on the right track! Review your mistakes and focus on your weakest subjects to boost your average."
                      : "Consistency is key. Try to complete at least one practice test every day to start seeing rapid improvements."}
                  </p>
                </div>
                
                {displaySubscription?.plan === "quarterly" && (
                  <div className="bg-[#2563EB]/5 border border-[#2563EB]/25 rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                      <div>
                        <h4 className="text-white font-bold text-sm">Priority Support Active</h4>
                        <p className="text-[#64748B] text-xs mt-1">Chat directly with our team of CBT prep specialists.</p>
                      </div>
                      <a
                        href="https://wa.me/2349043554038?text=Hello%20Tonex%20CBT%20Support%2C%20I%20am%20a%20Quarterly%20subscriber%20and%20need%20Priority%20Support."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold px-4 py-2.5 rounded-xl whitespace-nowrap hover:-translate-y-0.5 transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                      >
                        <MessageCircle size={14} />
                        Message Support
                      </a>
                    </div>
                  </div>
                )}
                
                {displaySubscription?.plan === "yearly" && (
                  <div className="bg-gradient-to-br from-[#F59E0B]/10 to-[#D97706]/10 border border-[#F59E0B]/30 rounded-2xl p-5">
                    <h4 className="text-[#F59E0B] font-bold text-sm flex items-center gap-1.5 mb-1">
                      <Crown size={16} /> Yearly Exclusive Perks
                    </h4>
                    <p className="text-[#94A3B8] text-xs mb-3">You have access to 1-on-1 Performance Coaching &amp; Priority Support.</p>
                    <div className="flex gap-2.5">
                      <a
                        href="https://wa.me/2349043554038?text=Hello%20Tonex%20CBT%20Support%2C%20I%20am%20a%20Yearly%20subscriber%20and%20need%20Priority%20Support."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10"
                      >
                        <MessageCircle size={14} />
                        Priority Support
                      </a>
                      <a
                        href="https://wa.me/2349043554038?text=Hello%20Tonex%20Coach%2C%20I%20am%20a%20Yearly%20subscriber%20and%20would%20like%20to%20schedule%20a%20Performance%20Coaching%20session."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#08142D] font-black text-xs py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/15"
                      >
                        <Crown size={14} />
                        Request Coaching
                      </a>
                    </div>
                  </div>
                )}
                
                {displaySubscription?.plan === "monthly" && (
                  <div className="bg-[#1E293B]/40 border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                      <div>
                        <h4 className="text-white font-bold text-sm">Priority Support &amp; Coaching</h4>
                        <p className="text-[#64748B] text-xs mt-1">Upgrade your plan to unlock WhatsApp support &amp; 1-on-1 coaching.</p>
                      </div>
                      <button
                        onClick={() => navigate("/premium")}
                        className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#08142D] font-black text-xs px-4 py-2.5 rounded-xl whitespace-nowrap hover:-translate-y-0.5 transition-all shadow-md shadow-amber-500/20"
                      >
                        Upgrade Plan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Tests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">Recent Tests</h3>
            <button onClick={() => navigate("/profile")} className="text-[#60A5FA] text-xs hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {showSessionsLoading ? <Skeleton className="h-16 bg-[#1E293B] rounded-xl w-full" /> : displaySessions?.map((test) => (
              <div
                key={test.id}
                className="flex items-center gap-3 py-2.5 border-b border-white/4 last:border-0"
              >
                <div className="w-9 h-9 rounded-xl bg-[#2563EB]/15 flex items-center justify-center">
                  <BookOpen size={16} className="text-[#60A5FA]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{test.subjects?.name || "Unknown Subject"}</div>
                  <div className="text-[#475569] text-xs flex items-center gap-2">
                    <Clock size={10} />
                    {new Date(test.completed_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${
                    test.score_percentage >= 70 ? "text-[#22C55E]"
                    : test.score_percentage >= 50 ? "text-[#F59E0B]"
                    : "text-[#EF4444]"
                  }`}>
                    {test.correct_answers}/{test.total_questions}
                  </div>
                  <div className="text-[#475569] text-xs">{Math.round(test.score_percentage)}%</div>
                </div>
              </div>
            ))}
            {!showSessionsLoading && !displaySessions?.length && (
              <div className="text-[#64748B] text-sm">No recent tests found.</div>
            )}
          </div>
        </motion.div>

        {/* Mini Leaderboard Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Trophy size={16} className="text-[#F59E0B]" />
              Top Students
            </h3>
            <button onClick={() => navigate("/leaderboard")} className="text-[#60A5FA] text-xs hover:underline flex items-center gap-1">
              Full Board <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {showLeaderboardLoading ? Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-12 bg-[#1E293B] rounded-xl w-full" />
            ) ) : displayTopStudents?.slice(0, 5).map((student, idx) => {
              const isMe = student.full_name === profile?.full_name;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div
                  key={student.user_id}
                  className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all ${
                    isMe ? "bg-[#2563EB]/10 border border-[#2563EB]/20" : "hover:bg-white/4"
                  }`}
                >
                  <span className="text-lg w-6 text-center">{medals[idx] || `${idx + 1}`}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {student.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${isMe ? "text-[#60A5FA]" : "text-white"}`}>
                      {student.full_name} {isMe && <span className="text-[10px] text-[#60A5FA]/70">(You)</span>}
                    </div>
                    <div className="text-[#475569] text-xs">{student.total_exams} exams taken</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      student.avg_score >= 70 ? "text-[#22C55E]" : student.avg_score >= 50 ? "text-[#F59E0B]" : "text-[#EF4444]"
                    }`}>
                      {Math.round(student.avg_score)}%
                    </div>
                    <div className="text-[#475569] text-[10px]">avg score</div>
                  </div>
                </div>
              );
            })}
            {!showLeaderboardLoading && !displayTopStudents?.length && (
              <div className="text-[#64748B] text-sm text-center py-4">No data yet — be the first!</div>
            )}
          </div>
         </motion.div>
          </>
        )}

        {activeTab === "calculator" && <AggregateCalculatorPage />}
        {activeTab === "cutoffs" && <CutOffMarksPage />}
        {activeTab === "analytics" && <AnalyticsPage />}
        {activeTab === "bookmarks" && <BookmarksPage />}
      </div>
    </div>
  );
}
