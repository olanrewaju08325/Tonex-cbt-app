import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Lock, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const lengthValid = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lengthValid || !hasLetter || !hasNumber) {
      toast.error("Please follow all password rules.");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully! You can now log in.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#08142D] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#08142D] via-[#0B1829] to-[#08142D]" />
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-[#2563EB]/8 rounded-full blur-3xl" />
      
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2">
            <img src="/logo.jpg" alt="Tonex CBT" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-500/25" />
            <span className="text-white font-extrabold text-xl font-['Manrope']">Tonex CBT</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0F172A]/80 backdrop-blur-sm border border-white/8 rounded-2xl p-8 shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[#2563EB]/15 border border-[#2563EB]/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={24} className="text-[#60A5FA]" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2 font-['Manrope']">Update Password</h1>
            <p className="text-[#64748B] text-sm">Enter your new secure password below.</p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#2563EB]/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" size={16} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#2563EB]/50 transition-all"
                />
              </div>
            </div>

            {/* Password Rules UI */}
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

            <button
              type="submit"
              disabled={loading || !lengthValid || !hasLetter || !hasNumber || !passwordsMatch}
              className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] hover:to-[#0B3D91] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Update Password <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
