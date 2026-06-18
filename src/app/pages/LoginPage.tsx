import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight, BookOpen } from "lucide-react";
import gsap from "gsap";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../../contexts/AuthContext";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { signIn, resetPassword, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(
        formRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, delay: 0.3, ease: "power2.out" }
      );
    }
  }, []);
  
  const { register, handleSubmit, formState: { errors }, getValues } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const res = await signIn(data.email, data.password);
    setLoading(false);
    
    if (res.error) {
      toast.error(res.error.message);
    } else if (res.data?.user) {
      // Fetch role directly to guarantee we have the latest immediately
      const { supabase } = await import('../../lib/supabase');
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', res.data.user.id).maybeSingle();
      
      // Save credential for future biometric login
      if (window.PasswordCredential && navigator.credentials) {
        try {
          const cred = new window.PasswordCredential({
            id: data.email,
            password: data.password,
            name: profile?.full_name || data.email,
            iconURL: window.location.origin + "/logo.jpg"
          });
          await navigator.credentials.store(cred);
        } catch (e) {
          console.error("Failed to store credential", e);
        }
      }

      toast.success("Welcome back! Redirecting...");
      if (profile?.role === 'superadmin') {
        navigate("/tonexadmin-2007");
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleBiometricLogin = async () => {
    if (!navigator.credentials) {
      toast.error("Biometric login is not supported on this device.");
      return;
    }
    try {
      const cred = await navigator.credentials.get({ password: true }) as PasswordCredential;
      if (cred && cred.password) {
        setLoading(true);
        const res = await signIn(cred.id, cred.password);
        setLoading(false);
        if (res.error) {
          toast.error(res.error.message);
        } else if (res.data?.user) {
          const { supabase } = await import('../../lib/supabase');
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', res.data.user.id).maybeSingle();
          toast.success("Biometric authentication successful!");
          if (profile?.role === 'superadmin') {
            navigate("/tonexadmin-2007");
          } else {
            navigate("/dashboard");
          }
        }
      } else {
        toast.error("No saved fingerprint credentials found. Please sign in with email and password first.");
      }
    } catch (err) {
      toast.error("Biometric authentication cancelled or failed.");
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues("email");
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    const { error } = await resetPassword(email);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent!");
    }
  };

  return (
    <div className="min-h-screen bg-[#08142D] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#08142D] via-[#0B1829] to-[#08142D]" />
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-[#2563EB]/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-[#0B3D91]/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md" style={{ perspective: "1000px" }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 group">
            <img src="/logo.jpg" alt="Tonex CBT" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-500/25" />
            <span className="text-white font-extrabold text-xl font-['Manrope']">
              Tonex CBT
            </span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, rotateY: 90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.3, delay: 0.1 }}
          className="bg-[#0F172A]/80 backdrop-blur-sm border border-white/8 rounded-2xl p-8"
          style={{ transformStyle: "preserve-3d", transformOrigin: "center right" }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-white mb-1 font-['Manrope']">
              Welcome back
            </h1>
            <p className="text-[#64748B] text-sm">Sign in to continue your preparation</p>
          </div>

          <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                {...register("email")}
                placeholder="your@email.com"
                className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wide">
                  Password
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-[#60A5FA] text-xs hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-white"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] hover:to-[#0B3D91] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleBiometricLogin}
              className="w-full bg-[#1E293B] hover:bg-[#334155] border border-white/10 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 mt-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-fingerprint"><path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.5 15.6a8.1 8.1 0 0 0 4.7 1.9 8.3 8.3 0 0 0 3-1.6"/><path d="M13.8 3.2a9 9 0 0 0-11 5.3"/><path d="M17 10.3c.3 1.1.5 2.4.5 3.7"/><path d="M19 19.5v-3c0-3.2-1.3-6.2-3.7-8.5"/><path d="M22 19.5v-2c0-4.3-1.8-8.4-4.8-11.3"/><path d="M9 19.5v-1a5 5 0 0 1 5-5"/></svg>
              Sign in with Fingerprint
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[#64748B] text-sm">Don't have an account? </span>
            <button
              onClick={() => navigate("/register")}
              className="text-[#60A5FA] text-sm font-semibold hover:underline"
            >
              Create one free
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex items-center justify-center gap-2 text-[#475569] text-xs"
        >
          <BookOpen size={12} />
          <span>Join 12,800+ students already preparing with Tonex CBT</span>
        </motion.div>
      </div>
    </div>
  );
}
