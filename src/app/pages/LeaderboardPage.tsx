import { useState } from "react";
import { motion } from "motion/react";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Lock } from "lucide-react";
import { useNavigate } from "react-router";
import { useLeaderboard } from "../../lib/hooks/useLeaderboard";
import { useAuth } from "../../contexts/AuthContext";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";

const TABS = ["Global", "University"];

export function LeaderboardPage() {
  const [tab, setTab] = useState(0);
  const [timeframe, setTimeframe] = useState<"all" | "weekly">("all");
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const universityId = tab === 1 ? profile?.target_university_id : null;
  const { data: leaderboard, isLoading } = useLeaderboard(universityId, timeframe === "weekly");

  const data = leaderboard || [];
  
  // Find my rank
  const myIndex = data.findIndex(d => d.user_id === profile?.id);
  const myData = myIndex >= 0 ? data[myIndex] : null;
  const myRank = myIndex >= 0 ? myIndex + 1 : "-";

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-['Manrope']">
            Leaderboard
          </h1>
          <p className="text-[#64748B] text-sm">See how you rank among all aspirants</p>
        </motion.div>

        {/* My rank card */}
        {myData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-[#0B3D91]/40 to-[#2563EB]/15 border border-[#2563EB]/25 rounded-2xl p-5 mb-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0B3D91] flex items-center justify-center text-white font-bold">
              {myData.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1">
              <div className="text-white font-bold text-sm">{myData.full_name}</div>
              <div className="text-[#64748B] text-xs">{myData.university_short_name || "All"} · {Math.round(myData.avg_score)}% avg</div>
            </div>
            <div className="text-center">
              <div className="text-[#60A5FA] font-black text-2xl font-['Manrope']">
                #{myRank}
              </div>
              <div className="text-[#475569] text-xs">Your Rank</div>
            </div>
          </motion.div>
        )}

        {/* Top 3 podium */}
        {data.length >= 3 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-end justify-center gap-3 mb-8"
          >
            {/* 2nd */}
            <div className="flex-1 text-center">
              <div className="w-14 h-14 rounded-full bg-[#C0C0C0]/20 border-2 border-[#C0C0C0]/40 flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                {data[1].full_name?.charAt(0)}
              </div>
              <div className="bg-[#C0C0C0]/10 border border-[#C0C0C0]/20 rounded-t-xl pt-6 pb-3 px-2" style={{ height: 80 }}>
                <div className="text-white text-xs font-bold truncate">{data[1].full_name.split(" ")[0]}</div>
                <div className="text-[#94A3B8] text-xs">{Math.round(data[1].avg_score)}%</div>
              </div>
              <div className="bg-[#C0C0C0]/15 rounded-b-xl h-3" />
              <div className="text-[#C0C0C0] text-xs font-black mt-1">2nd</div>
            </div>
            {/* 1st */}
            <div className="flex-1 text-center">
              <Crown size={18} className="text-[#F59E0B] mx-auto mb-1" />
              <div className="w-16 h-16 rounded-full bg-[#F59E0B]/20 border-2 border-[#F59E0B]/50 flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 shadow-lg shadow-yellow-500/20">
                {data[0].full_name?.charAt(0)}
              </div>
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-t-xl pt-6 pb-3 px-2" style={{ height: 100 }}>
                <div className="text-white text-xs font-bold truncate">{data[0].full_name.split(" ")[0]}</div>
                <div className="text-[#F59E0B] text-xs font-bold">{Math.round(data[0].avg_score)}%</div>
              </div>
              <div className="bg-[#F59E0B]/15 rounded-b-xl h-3" />
              <div className="text-[#F59E0B] text-xs font-black mt-1 flex items-center justify-center gap-0.5">
                <Trophy size={11} /> 1st
              </div>
            </div>
            {/* 3rd */}
            <div className="flex-1 text-center">
              <div className="w-14 h-14 rounded-full bg-[#CD7F32]/20 border-2 border-[#CD7F32]/40 flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                {data[2].full_name?.charAt(0)}
              </div>
              <div className="bg-[#CD7F32]/10 border border-[#CD7F32]/20 rounded-t-xl pt-6 pb-3 px-2" style={{ height: 65 }}>
                <div className="text-white text-xs font-bold truncate">{data[2].full_name.split(" ")[0]}</div>
                <div className="text-[#94A3B8] text-xs">{Math.round(data[2].avg_score)}%</div>
              </div>
              <div className="bg-[#CD7F32]/15 rounded-b-xl h-3" />
              <div className="text-[#CD7F32] text-xs font-black mt-1">3rd</div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex bg-[#0F172A] p-1 rounded-xl border border-white/6">
            {TABS.map((t, i) => {
              const isLockedTab = i === 1 && !profile?.is_premium;
              return (
                <button
                  key={t}
                  onClick={() => {
                    if (isLockedTab) {
                      toast.error("University leaderboard is a Premium feature.");
                      navigate("/premium");
                      return;
                    }
                    setTab(i);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    tab === i ? "bg-[#2563EB] text-white shadow-md" : "text-[#64748B] hover:text-white"
                  }`}
                >
                  {isLockedTab && <Lock size={11} className="text-[#F59E0B]" />}
                  {t}
                </button>
              );
            })}
          </div>

          <div className="flex bg-[#0F172A] p-1 rounded-xl border border-white/6">
            {["All-Time", "Weekly"].map((t, i) => {
              const active = (i === 0 && timeframe === "all") || (i === 1 && timeframe === "weekly");
              return (
                <button
                  key={t}
                  onClick={() => setTimeframe(i === 0 ? "all" : "weekly")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active ? "bg-[#7C3AED] text-white shadow-md" : "text-[#64748B] hover:text-white"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 relative">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-[#0F172A]" />)
          ) : (
            (profile?.is_premium ? data : data.slice(0, 6)).map((user, i) => {
              const isBlurred = !profile?.is_premium && i >= 3;
              return (
                <motion.div
                  key={user.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-[#0F172A] border border-white/6 rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden transition-all ${
                    isBlurred ? "blur-[2.5px] opacity-25 select-none pointer-events-none" : ""
                  }`}
                >
                  <div className={`w-8 text-center font-black text-sm ${
                    (i + 1) === 1 ? "text-[#F59E0B]"
                    : (i + 1) === 2 ? "text-[#C0C0C0]"
                    : (i + 1) === 3 ? "text-[#CD7F32]"
                    : "text-[#475569]"
                  }`}>
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black border ${
                    (i + 1) === 1 ? 'text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10'
                    : (i + 1) === 2 ? 'text-[#C0C0C0] border-[#C0C0C0]/40 bg-[#C0C0C0]/10'
                    : (i + 1) === 3 ? 'text-[#CD7F32] border-[#CD7F32]/40 bg-[#CD7F32]/10'
                    : 'text-[#475569] border-transparent'
                  }`}>
                    {(i + 1) <= 3 ? (i + 1) : `#${i + 1}`}
                  </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB]/60 to-[#0B3D91]/60 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.full_name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{user.full_name}</div>
                    <div className="text-[#475569] text-xs">{user.university_short_name || "Any"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-white font-bold text-sm">{Math.round(user.avg_score)}%</div>
                      <div className="text-[#475569] text-[10px]">{user.total_exams} exams</div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          {!isLoading && data.length === 0 && (
            <div className="text-center text-[#64748B] py-8">No leaderboard data available yet.</div>
          )}
        </div>

        {/* Premium Lock Overlay for Leaderboard List */}
        {!profile?.is_premium && data.length > 3 && (
          <div className="relative -mt-32 pt-24 pb-8 flex flex-col items-center justify-center z-10 bg-gradient-to-t from-[#08142D] via-[#08142D]/95 to-transparent">
            <div className="w-12 h-12 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mb-3">
              <Lock size={20} className="text-[#F59E0B]" />
            </div>
            <p className="text-white font-bold text-sm text-center mb-1">Unlock 1,000+ Rankings</p>
            <p className="text-[#64748B] text-xs text-center mb-4 max-w-xs leading-relaxed">
              Upgrade to premium to see the full list, search peers, and track your weekly rank.
            </p>
            <button
              onClick={() => navigate("/premium")}
              className="bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5"
            >
              Upgrade to Premium
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
