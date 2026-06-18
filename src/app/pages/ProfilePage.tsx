import { useState } from "react";
import { motion } from "motion/react";
import {
  Mail, Phone, MapPin, Clock, BookOpen,
  ChevronRight, Crown, Settings, LogOut, Bell, Shield, Edit2, CheckCircle, Award, MessageCircle
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useUserStats } from "../../lib/hooks/useUserStats";
import { useExamSessions } from "../../lib/hooks/useExamSessions";
import { useSubscription } from "../../lib/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile } = useAuth();
  const { data: stats } = useUserStats();
  const { data: sessions } = useExamSessions(5);
  const { data: subscription } = useSubscription();

  // Fetch DB-level badges from user_badges table
  const { data: badges = [] } = useQuery({
    queryKey: ['userBadges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  // Dynamic badges calculation based on stats and sessions
  const dynamicBadges: any[] = [];
  
  // 1. Pioneer
  dynamicBadges.push({
    id: "pioneer",
    badge_name: "Pioneer",
    badge_icon: "🚀",
    badge_description: "Joined the Tonex CBT community",
    earned: true,
    earned_at: profile?.created_at
  });

  // 2. First Blood
  const hasFirstBlood = (stats?.tests_taken || 0) >= 1;
  dynamicBadges.push({
    id: "first_blood",
    badge_name: "First Blood",
    badge_icon: "🎯",
    badge_description: "Completed first test",
    earned: hasFirstBlood,
    earned_at: sessions?.[sessions.length - 1]?.completed_at || null
  });

  // 3. Consistent Scholar
  const hasConsistent = (stats?.tests_taken || 0) >= 10;
  dynamicBadges.push({
    id: "consistent_scholar",
    badge_name: "Scholar",
    badge_icon: "📚",
    badge_description: "Completed 10+ exams",
    earned: hasConsistent,
    earned_at: hasConsistent ? new Date().toISOString() : null
  });

  // 4. Streak Master
  const hasStreak = (stats?.streak_count || 0) >= 7;
  dynamicBadges.push({
    id: "streak_master",
    badge_name: "Streak Master",
    badge_icon: "🔥",
    badge_description: "Maintained a 7-day streak",
    earned: hasStreak,
    earned_at: hasStreak ? new Date().toISOString() : null
  });

  // 5. Perfectionist
  const hasPerfectionist = (sessions || []).some((s: any) => Math.round(s.score_percentage) === 100);
  const perfSession = (sessions || []).find((s: any) => Math.round(s.score_percentage) === 100);
  dynamicBadges.push({
    id: "perfectionist",
    badge_name: "Perfectionist",
    badge_icon: "👑",
    badge_description: "Scored 100% in a test",
    earned: hasPerfectionist,
    earned_at: perfSession?.completed_at || null
  });

  // 6. Speed Demon
  const hasSpeedDemon = (sessions || []).some((s: any) => s.time_taken_seconds > 0 && s.time_taken_seconds <= 180);
  const speedSession = (sessions || []).find((s: any) => s.time_taken_seconds > 0 && s.time_taken_seconds <= 180);
  dynamicBadges.push({
    id: "speed_demon",
    badge_name: "Speed Demon",
    badge_icon: "⚡",
    badge_description: "Completed test under 3 mins",
    earned: hasSpeedDemon,
    earned_at: speedSession?.completed_at || null
  });

  // Merge with DB badges if they exist
  const dbBadgesList = (badges || []).map((b: any) => ({
    id: b.id,
    badge_name: b.badge_name,
    badge_icon: b.badge_icon || "🏆",
    badge_description: b.badge_description || "",
    earned: true,
    earned_at: b.earned_at
  }));

  const allBadges = [...dbBadgesList, ...dynamicBadges];

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  let daysLeft = null;
  if (subscription?.expires_at) {
    const diff = new Date(subscription.expires_at).getTime() - new Date().getTime();
    daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile({ full_name: name });
      if (error) {
        toast.error("Failed to update profile");
      } else {
        toast.success("Profile updated successfully");
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-['Manrope']">
            Profile
          </h1>
          <p className="text-[#64748B] text-sm">Manage your account and preferences</p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-5"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0B3D91] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                {profile.full_name?.charAt(0) || "U"}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center shadow-md" title="Edit Avatar">
                <Edit2 size={10} className="text-white" />
              </button>
            </div>
            <div className="flex-1">
              {editing ? (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-[#1E293B] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/50 w-full mb-1"
                  title="Full Name"
                  autoFocus
                />
              ) : (
                <div className="text-white font-bold text-lg leading-tight">{profile.full_name}</div>
              )}
              <div className="text-[#64748B] text-xs">{profile.email}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  profile.is_premium
                    ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20"
                    : "bg-[#1E293B] text-[#64748B]"
                }`}>
                  <Crown size={11} />
                  {profile.is_premium ? "Premium" : "Free Plan"}
                </div>
                <div className="text-[#475569] text-xs">
                  Joined {new Date(profile.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
            {editing ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3 py-1 rounded-lg transition-colors flex items-center justify-center min-w-[60px]"
                title="Save Profile"
              >
                <CheckCircle size={16} />
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 bg-[#1E293B] hover:bg-[#2563EB]/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                title="Edit Profile"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>

          {/* Info fields */}
          <div className="space-y-3">
            {[
              { icon: Mail, label: "Email", value: profile.email },
              { icon: Phone, label: "Phone", value: profile.phone },
              { icon: MapPin, label: "State", value: profile.state },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 py-2 border-b border-white/4 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center">
                  <item.icon size={14} className="text-[#60A5FA]" />
                </div>
                <div>
                  <div className="text-[#475569] text-xs">{item.label}</div>
                  <div className="text-white text-sm font-medium">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5"
        >
          {[
            { label: "Tests Taken", value: stats?.tests_taken || 0, color: "#2563EB" },
            { label: "Avg Score", value: `${Math.round(stats?.avg_score || 0)}%`, color: "#22C55E" },
            { label: "Correct", value: stats?.correct_answers || 0, color: "#7C3AED" },
            { label: "Total Qs", value: stats?.total_questions || 0, color: "#F59E0B" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0F172A] border border-white/6 rounded-xl p-4 text-center">
              <div className="text-lg font-extrabold text-white font-['Manrope']">{stat.value}</div>
              <div className="text-[#64748B] text-xs">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Badges & Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#0F172A] border border-white/6 rounded-2xl p-5 mb-5"
        >
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Award size={16} className="text-[#F59E0B]" /> Badges & Achievements
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {allBadges.map((badge: any) => (
              <div key={badge.id} className={`bg-[#1E293B] rounded-xl p-3 text-center border transition-all ${
                badge.earned 
                  ? "border-[#F59E0B]/30 opacity-100 hover:border-[#F59E0B]" 
                  : "border-white/5 opacity-40 select-none"
              }`}>
                <div className="text-2xl mb-1">{badge.badge_icon || "🏆"}</div>
                <div className="text-white text-xs font-bold leading-tight">{badge.badge_name}</div>
                <div className="text-[#475569] text-[9px] mt-1 line-clamp-1">{badge.badge_description}</div>
                {badge.earned && badge.earned_at && (
                  <div className="text-[#F59E0B] text-[8px] mt-1 font-semibold">
                    {new Date(badge.earned_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Test History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0F172A] border border-white/6 rounded-2xl p-5 mb-5"
        >
          <h3 className="text-white font-bold mb-4">Test History</h3>
          <div className="space-y-3">
            {sessions?.map((test) => (
              <div key={test.id} className="flex items-center gap-3 py-2 border-b border-white/4 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-[#2563EB]/15 flex items-center justify-center">
                  <BookOpen size={14} className="text-[#60A5FA]" />
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{test.subjects?.name || "Unknown"}</div>
                  <div className="flex items-center gap-1.5 text-[#475569] text-xs">
                    <Clock size={10} />
                    {new Date(test.completed_at).toLocaleDateString()}
                  </div>
                </div>
                <div className={`text-sm font-bold ${
                  test.score_percentage >= 70 ? "text-[#22C55E]"
                  : test.score_percentage >= 50 ? "text-[#F59E0B]"
                  : "text-[#EF4444]"
                }`}>
                  {Math.round(test.score_percentage)}%
                </div>
              </div>
            ))}
            {!sessions?.length && <div className="text-[#64748B] text-sm">No tests taken yet.</div>}
          </div>
        </motion.div>

        {/* Settings & actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#0F172A] border border-white/6 rounded-2xl overflow-hidden mb-5"
        >
          {subscription && (
            <div className="w-full flex flex-col px-5 py-4 transition-colors border-b border-white/4 bg-[#2563EB]/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F59E0B]/15">
                  <Crown size={15} className="text-[#F59E0B]" />
                </div>
                <span className="flex-1 text-sm font-medium text-left text-[#F59E0B]">
                  {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan - {subscription.status}
                  <div className={`text-xs mt-0.5 ${daysLeft !== null && daysLeft <= 5 ? "text-[#EF4444] font-bold" : "text-[#94A3B8]"}`}>
                    Expires: {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : "Pending/N/A"}
                    {daysLeft !== null && daysLeft <= 5 && daysLeft > 0 ? ` (${daysLeft} days left)` : ""}
                    {daysLeft !== null && daysLeft <= 0 ? " (Expired)" : ""}
                  </div>
                </span>
              </div>
              
              {subscription.status === 'active' && subscription.plan === 'monthly' && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => navigate('/premium')} className="flex-1 bg-[#2563EB]/20 text-[#60A5FA] text-xs font-bold py-2 rounded-lg border border-[#2563EB]/30 hover:bg-[#2563EB]/30 transition-all" title="Upgrade to Quarterly">
                    Upgrade to Quarterly (Save ₦1k)
                  </button>
                  <button onClick={() => navigate('/premium')} className="flex-1 bg-amber-500/20 text-amber-500 text-xs font-bold py-2 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-all" title="Upgrade to Yearly">
                    Upgrade to Yearly (Save ₦5k)
                  </button>
                </div>
              )}
              {subscription.status === 'active' && subscription.plan === 'quarterly' && (
                <div className="mt-4 flex flex-col gap-2">
                  <button onClick={() => navigate('/premium')} className="w-full bg-amber-500/20 text-amber-500 text-xs font-bold py-2 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-all" title="Upgrade to Yearly">
                    Upgrade to Yearly (Save ₦5k)
                  </button>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl mt-1">
                    <p className="text-white text-xs font-semibold mb-2">Priority Support Active</p>
                    <a
                      href="https://wa.me/2349043554038?text=Hello%20Tonex%20CBT%20Support%2C%20I%20am%20a%20Quarterly%20subscriber%20and%20need%20Priority%20Support."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#2563EB]/25 hover:bg-[#2563EB]/35 text-[#60A5FA] text-xs font-bold py-1.5 px-3 rounded-lg border border-[#2563EB]/30 transition-all"
                    >
                      <MessageCircle size={12} />
                      Contact Priority Support
                    </a>
                  </div>
                </div>
              )}
              {subscription.status === 'active' && subscription.plan === 'yearly' && (
                <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl space-y-2.5">
                  <p className="text-white text-xs font-semibold">Yearly Exclusive Benefits</p>
                  <div className="flex gap-2">
                    <a
                      href="https://wa.me/2349043554038?text=Hello%20Tonex%20CBT%20Support%2C%20I%20am%20a%20Yearly%20subscriber%20and%20need%20Priority%20Support."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#2563EB]/25 hover:bg-[#2563EB]/35 text-[#60A5FA] text-xs font-bold py-1.5 rounded-lg border border-[#2563EB]/30 transition-all"
                    >
                      <MessageCircle size={12} />
                      Priority Support
                    </a>
                    <a
                      href="https://wa.me/2349043554038?text=Hello%20Tonex%20Coach%2C%20I%20am%20a%20Yearly%20subscriber%20and%20would%20like%20to%20schedule%20a%20Performance%20Coaching%20session."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/35 text-[#F59E0B] text-xs font-bold py-1.5 rounded-lg border border-[#F59E0B]/30 transition-all"
                    >
                      <Crown size={12} />
                      Coaching Session
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
          {[
            { icon: Bell, label: "Notifications", action: () => navigate("/notifications") },
            { icon: Shield, label: "Privacy & Security", action: () => navigate("/privacy") },
            { icon: Crown, label: "Subscription", action: () => navigate("/subscription"), highlight: !profile.is_premium },
            { icon: Settings, label: "App Settings", action: () => navigate("/settings") },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-5 py-4 transition-colors border-b border-white/4 last:border-0 ${
                item.highlight ? "hover:bg-[#2563EB]/10" : "hover:bg-white/3"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                item.highlight ? "bg-[#F59E0B]/15" : "bg-[#1E293B]"
              }`}>
                <item.icon size={15} className={item.highlight ? "text-[#F59E0B]" : "text-[#60A5FA]"} />
              </div>
              <span className={`flex-1 text-sm font-medium text-left ${item.highlight ? "text-[#F59E0B]" : "text-[#94A3B8]"}`}>
                {item.label}
              </span>
              <ChevronRight size={14} className="text-[#475569]" />
            </button>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-[#EF4444]/10 border border-[#EF4444]/20 hover:bg-[#EF4444]/20 text-[#EF4444] font-semibold py-3.5 rounded-2xl transition-all text-sm"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </motion.div>
      </div>
    </div>
  );
}
