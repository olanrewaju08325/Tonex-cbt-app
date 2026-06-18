import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, Key, Bell, Trash2, Smartphone, Save } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";

export function PrivacyPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [prefs, setPrefs] = useState({
    email_notifications: true,
    push_notifications: false,
    exam_reminders: true,
    promo_emails: true,
    weekly_report: true,
  });

  useEffect(() => {
    const loadPrefs = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (!error && data) {
        setPrefs({
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
          exam_reminders: data.exam_reminders,
          promo_emails: data.promo_emails,
          weekly_report: data.weekly_report,
        });
      }
      setLoading(false);
    };
    loadPrefs();
  }, [user]);

  const handleUpdatePrefs = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...prefs });
      
    if (error) toast.error("Failed to update preferences");
    else toast.success("Preferences updated successfully");
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully");
      setPassword("");
    }
  };

  if (loading) {
    return <div className="p-8 max-w-3xl mx-auto"><Skeleton className="h-64 w-full bg-[#1E293B] rounded-2xl" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8 mt-4 md:mt-0">
        <h1 className="text-2xl font-extrabold text-white font-['Manrope']">Privacy & Security</h1>
        <p className="text-[#94A3B8] text-sm mt-1">Manage your account security and notification preferences</p>
      </div>

      <div className="space-y-6">
        {/* Password Update */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0F172A] border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center">
              <Key size={20} className="text-[#3B82F6]" />
            </div>
            <div>
              <h3 className="text-white font-bold">Change Password</h3>
              <p className="text-[#64748B] text-xs">Ensure your account is using a long, random password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="flex gap-3">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
            />
            <button
              type="submit"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Update
            </button>
          </form>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0F172A] border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
              <Bell size={20} className="text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-white font-bold">Notification Preferences</h3>
              <p className="text-[#64748B] text-xs">Choose what updates you want to receive</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { id: 'email_notifications', label: 'Email Notifications', desc: 'Receive daily digests and important updates via email' },
              { id: 'exam_reminders', label: 'Exam Reminders', desc: 'Get reminded when it\'s time for your daily practice' },
              { id: 'weekly_report', label: 'Weekly Reports', desc: 'Receive a summary of your performance every week' },
              { id: 'promo_emails', label: 'Promotions & Offers', desc: 'Hear about premium discounts and new features' },
            ].map((setting) => (
              <div key={setting.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-white text-sm font-medium">{setting.label}</div>
                  <div className="text-[#64748B] text-xs mt-0.5">{setting.desc}</div>
                </div>
                <button
                  onClick={() => setPrefs(p => ({ ...p, [setting.id]: !p[setting.id as keyof typeof p] }))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    prefs[setting.id as keyof typeof prefs] ? "bg-[#2563EB]" : "bg-[#1E293B]"
                  }`}
                  title={`Toggle ${setting.label}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    prefs[setting.id as keyof typeof prefs] ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>
            ))}

            <div className="pt-4 mt-2 border-t border-white/5">
              <button
                onClick={handleUpdatePrefs}
                disabled={saving}
                className="flex items-center gap-2 bg-[#1E293B] hover:bg-[#2563EB]/20 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors w-full justify-center"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1A0B0B] border border-[#EF4444]/20 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#EF4444]/10 flex items-center justify-center">
              <Shield size={20} className="text-[#EF4444]" />
            </div>
            <div>
              <h3 className="text-white font-bold">Danger Zone</h3>
              <p className="text-[#EF4444]/70 text-xs">Irreversible account actions</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-white text-sm font-medium">Delete Account</div>
              <div className="text-[#64748B] text-xs mt-0.5">Permanently delete your account and all data</div>
            </div>
            <button
              onClick={() => toast.error("Please contact support to delete your account.")}
              className="bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/20 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0 flex items-center gap-2"
            >
              <Trash2 size={16} /> Delete Account
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
