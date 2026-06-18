import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import gsap from "gsap";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../../contexts/AuthContext";
import { NIGERIAN_STATES } from "../data/mockData";
import { useUniversities } from "../../lib/hooks/useUniversities";

const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number required"),
  state: z.string().min(1, "State is required"),
  targetUniversity: z.string().min(1, "Target University is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const { signUp, user, loading: authLoading } = useAuth();
  const { data: universities, isLoading: universitiesLoading } = useUniversities();

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
  }, [step]); // Re-run animation when step changes

  const { register, handleSubmit, formState: { errors }, trigger } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const handleStep1 = async () => {
    const isValid = await trigger(["fullName", "email", "phone"]);
    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    const { error } = await signUp({
      email: data.email,
      password: data.password,
      full_name: data.fullName,
      phone: data.phone,
      state: data.state,
      target_university_id: data.targetUniversity,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Welcome to Tonex CBT.");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#08142D] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#08142D] via-[#0B1829] to-[#08142D]" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#2563EB]/8 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md" style={{ perspective: "1000px" }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2">
            <img src="/logo.jpg" alt="Tonex CBT" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-500/25" />
            <span className="text-white font-extrabold text-xl font-['Manrope']">
              Tonex CBT
            </span>
          </button>
        </motion.div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 justify-center mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s < step
                  ? "bg-[#22C55E] text-white"
                  : s === step
                  ? "bg-[#2563EB] text-white"
                  : "bg-[#1E293B] text-[#475569]"
              }`}>
                {s < step ? <CheckCircle size={14} /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-px ${s < step ? "bg-[#22C55E]" : "bg-[#1E293B]"}`} />}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, rotateY: -90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.3, delay: 0.1 }}
          className="bg-[#0F172A]/80 backdrop-blur-sm border border-white/8 rounded-2xl p-8"
          style={{ transformStyle: "preserve-3d", transformOrigin: "center left" }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-white mb-1 font-['Manrope']">
              {step === 1 ? "Create Your Account" : "Your Study Profile"}
            </h1>
            <p className="text-[#64748B] text-sm">
              {step === 1 ? "Start your journey to admission" : "Help us personalize your experience"}
            </p>
          </div>

          <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input
                    type="text"
                    {...register("fullName")}
                    placeholder="e.g. Chioma Nwosu"
                    className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all"
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
                </div>
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
                  <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    {...register("phone")}
                    placeholder="+234 801 234 5678"
                    className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <button
                  type="button"
                  onClick={handleStep1}
                  className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all hover:-translate-y-0.5 mt-2"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">
                    State of Origin
                  </label>
                  <select
                    {...register("state")}
                    className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all appearance-none"
                  >
                    <option value="" className="bg-[#1E293B]">Select your state</option>
                    {NIGERIAN_STATES.map(s => (
                      <option key={s} value={s} className="bg-[#1E293B]">{s}</option>
                    ))}
                  </select>
                  {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
                </div>
                <div>
                  <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">
                    Target University
                  </label>
                  <select
                    {...register("targetUniversity")}
                    disabled={universitiesLoading}
                    className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all appearance-none disabled:opacity-60"
                  >
                    <option value="" className="bg-[#1E293B]">
                      {universitiesLoading ? 'Loading universities...' : 'Select your university'}
                    </option>
                    {universities?.map(u => (
                      <option key={u.id} value={u.id} className="bg-[#1E293B]">{u.short_name} — {u.name.split("(")[0].trim()}</option>
                    ))}
                  </select>
                  {errors.targetUniversity && <p className="text-red-500 text-xs mt-1">{errors.targetUniversity.message}</p>}
                  {!universitiesLoading && (!universities || universities.length === 0) && (
                    <p className="text-[#F59E0B] text-xs mt-1">No universities found. Please ensure the database is seeded.</p>
                  )}
                </div>
                <div>
                  <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      {...register("password")}
                      placeholder="Min. 8 characters"
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
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-[#1E293B] text-[#94A3B8] font-semibold py-3.5 rounded-xl text-sm hover:text-white transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-auto bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all hover:-translate-y-0.5 disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Create Account<ArrowRight size={16} /></>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <span className="text-[#64748B] text-sm">Already have an account? </span>
            <button
              onClick={() => navigate("/login")}
              className="text-[#60A5FA] text-sm font-semibold hover:underline"
            >
              Sign in
            </button>
          </div>
        </motion.div>

        <p className="text-center text-[#475569] text-xs mt-4">
          By creating an account, you agree to our{" "}
          <span className="text-[#60A5FA]">Terms of Service</span> and{" "}
          <span className="text-[#60A5FA]">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
