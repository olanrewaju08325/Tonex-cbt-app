import { useState } from "react";
import { motion } from "motion/react";
import { Save, User, Moon, Smartphone, Volume2, Globe, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";

export function SettingsPage() {
  const { profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    state: profile?.state || "",
    target_department: profile?.target_department || "",
  });
  const [preferences, setPreferences] = useState({
    theme: "dark", // currently only dark is supported
    animations: true,
    sound: true,
    language: "en",
  });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const lengthValid = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lengthValid || !hasLetter || !hasNumber || !passwordsMatch) return;
    
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setUpdatingPassword(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      setPassword("");
      setConfirmPassword("");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile(formData);
    if (error) toast.error("Failed to update profile settings");
    else toast.success("Profile settings saved successfully");
    setSaving(false);
  };

  if (!profile) {
    return <div className="p-8 max-w-3xl mx-auto"><Skeleton className="h-64 w-full bg-[#1E293B] rounded-2xl" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8 mt-4 md:mt-0">
        <h1 className="text-2xl font-extrabold text-white font-['Manrope']">App Settings</h1>
        <p className="text-[#94A3B8] text-sm mt-1">Manage your profile details and app preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0F172A] border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center">
              <User size={20} className="text-[#3B82F6]" />
            </div>
            <div>
              <h3 className="text-white font-bold">Personal Information</h3>
              <p className="text-[#64748B] text-xs">Update your display name and contact details</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                title="Full Name"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData(f => ({ ...f, full_name: e.target.value }))}
                className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">Phone Number</label>
                <input
                  type="text"
                  title="Phone Number"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">State of Origin</label>
                <input
                  type="text"
                  title="State of Origin"
                  placeholder="State of Origin"
                  value={formData.state}
                  onChange={(e) => setFormData(f => ({ ...f, state: e.target.value }))}
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">Target Department / Course</label>
              <input
                type="text"
                title="Target Department / Course"
                placeholder="e.g. Medicine & Surgery, Law, Computer Science"
                value={formData.target_department}
                onChange={(e) => setFormData(f => ({ ...f, target_department: e.target.value }))}
                className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Update Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0F172A] border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
              <Lock size={20} className="text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-white font-bold">Update Password</h3>
              <p className="text-[#64748B] text-xs">Ensure your account is using a long, random password to stay secure.</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
                />
              </div>
            </div>

            <div className="bg-[#1E293B]/50 rounded-xl p-4 border border-white/5 space-y-2">
              <div className="text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wide">Password Requirements</div>
              <div className={`flex items-center gap-2 text-xs ${lengthValid ? "text-[#22C55E]" : "text-[#64748B]"}`}>
                {lengthValid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                At least 8 characters
              </div>
              <div className={`flex items-center gap-2 text-xs ${hasLetter ? "text-[#22C55E]" : "text-[#64748B]"}`}>
                {hasLetter ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                Contains at least one letter
              </div>
              <div className={`flex items-center gap-2 text-xs ${hasNumber ? "text-[#22C55E]" : "text-[#64748B]"}`}>
                {hasNumber ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                Contains at least one number
              </div>
              <div className={`flex items-center gap-2 text-xs ${passwordsMatch ? "text-[#22C55E]" : "text-[#64748B]"}`}>
                {passwordsMatch ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                Passwords match
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updatingPassword || !lengthValid || !hasLetter || !hasNumber || !passwordsMatch}
                className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Save size={16} />
                {updatingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </motion.div>

        {/* App Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0F172A] border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
              <Smartphone size={20} className="text-[#8B5CF6]" />
            </div>
            <div>
              <h3 className="text-white font-bold">App Preferences</h3>
              <p className="text-[#64748B] text-xs">Customize your Tonex CBT experience</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center"><Moon size={16} className="text-[#94A3B8]" /></div>
                <div>
                  <div className="text-white text-sm font-medium">Dark Mode</div>
                  <div className="text-[#64748B] text-xs mt-0.5">Tonex is currently optimized for dark mode</div>
                </div>
              </div>
              <div className="w-11 h-6 rounded-full bg-[#2563EB] relative opacity-70 cursor-not-allowed">
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white translate-x-5" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center"><Volume2 size={16} className="text-[#94A3B8]" /></div>
                <div>
                  <div className="text-white text-sm font-medium">Sound Effects</div>
                  <div className="text-[#64748B] text-xs mt-0.5">Play sounds when selecting answers</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setPreferences(p => ({ ...p, sound: !p.sound }));
                  toast.success(preferences.sound ? "Sound disabled" : "Sound enabled");
                }}
                className={`w-11 h-6 rounded-full transition-colors relative ${preferences.sound ? "bg-[#2563EB]" : "bg-[#1E293B]"}`}
                title="Toggle Sound Effects"
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${preferences.sound ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center"><Globe size={16} className="text-[#94A3B8]" /></div>
                <div>
                  <div className="text-white text-sm font-medium">Language</div>
                  <div className="text-[#64748B] text-xs mt-0.5">Default interface language</div>
                </div>
              </div>
              <select title="Language" className="bg-[#1E293B] border border-white/6 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
