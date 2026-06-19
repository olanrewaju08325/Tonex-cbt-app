import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle, Crown, Copy, MessageCircle, ArrowRight, ArrowLeft,
  Clock, Shield, Zap, BookOpen, BarChart2, Trophy, Bookmark, Star
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useCreateSubscription } from "../../lib/hooks/useSubscription";
import { BANK_DETAILS } from "../../lib/manualPayment";
import { supabase } from "../../lib/supabase";

const PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    price: "₦2,500",
    period: "/month",
    priceValue: 2500,
    highlight: false,
    badge: null as string | null,
    savings: null as string | null,
  },
  {
    id: "quarterly",
    name: "Quarterly",
    price: "₦6,500",
    period: "/3 months",
    priceValue: 6500,
    highlight: true,
    badge: "Most Popular",
    savings: "Save ₦1,000",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "₦25,000",
    period: "/year",
    priceValue: 25000,
    highlight: false,
    badge: "Best Value",
    savings: "Save ₦5,000",
  },
];

const PLAN_FEATURES: Record<string, { label: string; description: string; icon: any }[]> = {
  monthly: [
    { icon: BookOpen, label: "Unlimited Questions", description: "Access all past questions without daily limits" },
    { icon: Star, label: "All 12 Subjects", description: "Practice any subject from the syllabus" },
    { icon: BarChart2, label: "Full CBT Simulations", description: "Realistic timed exams for any university" },
    { icon: Zap, label: "Detailed Analytics", description: "Track your performance across all subjects" },
    { icon: Trophy, label: "Full Leaderboard Access", description: "See your rank among all students" },
    { icon: Bookmark, label: "Bookmark Questions", description: "Save tricky questions to review later" },
  ],
  quarterly: [
    { icon: BookOpen, label: "Everything in Monthly", description: "Full access to all monthly features" },
    { icon: Star, label: "Priority Support", description: "Direct support from our exam experts" },
    { icon: BarChart2, label: "Unlimited Practice Mode", description: "No constraints on question repetitions" },
    { icon: Zap, label: "Full Insights Dashboard", description: "Unlock weak topic recommendations" },
    { icon: Trophy, label: "Full Leaderboard Access", description: "Compete globally and by university" },
    { icon: Bookmark, label: "Unlimited Bookmarks", description: "Save and categorize tricky questions" },
    { icon: Trophy, label: "AI Admission Predictor (Coming Soon)", description: "Analyze probability of gaining admission" },
  ],
  yearly: [
    { icon: BookOpen, label: "Everything in Quarterly", description: "All monthly and quarterly features included" },
    { icon: Crown, label: "Early Access Features", description: "Be the first to try out new study tools" },
    { icon: Star, label: "Performance Coaching", description: "Get personalized tips to boost your score" },
    { icon: Shield, label: "Download Question PDFs", description: "Download questions to study offline" },
    { icon: Zap, label: "All-Time Unlimited Access", description: "Full prep access for 12 complete months" },
  ],
};

const STEPS = ["Choose Plan", "Pay", "Submit Proof"];

type Step = "plans" | "instructions" | "submit";

export function PremiumPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const initialPlan = (location.state as any)?.plan || "quarterly";
  
  const [step, setStep] = useState<Step>("plans");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "yearly">(initialPlan);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { user, profile } = useAuth();
  const { mutateAsync: createSubscription } = useCreateSubscription();

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  const stepIndex: Record<Step, number> = { plans: 0, instructions: 1, submit: 2 };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Only PNG, JPEG, JPG, and PDF files are allowed");
      e.target.value = "";
      setFile(null);
      return;
    }

    // Check size (2MB)
    if (selectedFile.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      e.target.value = "";
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmitReference = async () => {
    if (!reference.trim()) {
      toast.error("Please enter your transfer reference number");
      return;
    }
    if (!file) {
      toast.error("Please select a file containing your payment proof receipt");
      return;
    }
    setSubmitting(true);
    setUploadProgress(15);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'unknown'}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipt upload')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(75);

      const { data: { publicUrl } } = supabase.storage
        .from('receipt upload')
        .getPublicUrl(fileName);

      setUploadProgress(95);

      await createSubscription({
        plan: selectedPlan,
        amount: plan.priceValue,
        payment_reference: reference.trim(),
        payment_proof_url: publicUrl,
      });

      setUploadProgress(100);

      const message = encodeURIComponent(
        `Hello, I just made a payment for Tonex CBT ${plan.name} plan (₦${plan.priceValue.toLocaleString()}).\n\nName: ${profile?.full_name}\nEmail: ${user?.email}\nTransfer Reference: ${reference.trim()}\n\nPlease activate my account. Thank you.`
      );
      window.open(`${BANK_DETAILS.whatsappLink}?text=${message}`, "_blank");
      toast.success("Payment request submitted. Your account will be activated within 24 hours.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Already premium
  if (profile?.is_premium) {
    return (
      <div className="min-h-screen bg-[#08142D] px-4 py-6 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4">
            <Crown size={30} className="text-[#F59E0B]" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2 font-['Manrope']">You are Premium</h1>
          <p className="text-[#64748B] text-sm mb-6">You have full access to all Tonex CBT features.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white font-bold px-8 py-3 rounded-xl hover:-translate-y-0.5 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/20 mb-4">
            <Crown size={30} className="text-[#F59E0B]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 font-['Manrope']">Tonex CBT Premium</h1>
          <p className="text-[#64748B] text-sm max-w-sm mx-auto">Unlock everything you need to gain admission.</p>
        </motion.div>

        {/* Step progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`flex-1 flex flex-col items-center ${i < STEPS.length - 1 ? "relative" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  i < stepIndex[step] ? "bg-[#22C55E] text-white" :
                  i === stepIndex[step] ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/30" :
                  "bg-[#1E293B] text-[#475569]"
                }`}>
                  {i < stepIndex[step] ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-semibold ${i === stepIndex[step] ? "text-white" : "text-[#475569]"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 mx-1 mb-4 transition-all ${i < stepIndex[step] ? "bg-[#22C55E]" : "bg-[#1E293B]"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Plan Selection */}
          {step === "plans" && (
            <motion.div key="plans" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              {/* Plan cards */}
              <div className="flex gap-3 mb-6">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id as "monthly" | "quarterly" | "yearly")}
                    className={`flex-1 relative py-4 px-3 rounded-2xl border transition-all text-center ${
                      selectedPlan === p.id
                        ? p.highlight
                          ? "bg-gradient-to-b from-[#0B3D91]/50 to-[#2563EB]/20 border-[#2563EB]/50"
                          : "bg-[#1E293B]/60 border-[#2563EB]/40"
                        : "bg-[#0F172A] border-white/6 hover:border-white/12"
                    }`}
                  >
                    {p.badge && (
                      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                        p.highlight ? "bg-[#F59E0B] text-[#08142D]" : "bg-[#2563EB]/30 text-[#60A5FA] border border-[#2563EB]/40"
                      }`}>
                        {p.badge}
                      </div>
                    )}
                    <div className={`text-xs font-semibold mb-1 ${selectedPlan === p.id ? "text-[#94A3B8]" : "text-[#475569]"}`}>
                      {p.name}
                    </div>
                    <div className={`font-extrabold text-base font-['Manrope'] ${selectedPlan === p.id ? "text-white" : "text-[#64748B]"}`}>
                      {p.price}
                    </div>
                    <div className="text-[#475569] text-[10px]">{p.period}</div>
                    {p.savings && (
                      <div className="text-[#22C55E] text-[10px] font-semibold mt-0.5">{p.savings}</div>
                    )}
                  </button>
                ))}
              </div>

              {/* Features */}
              <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-6">
                <div className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wide mb-4">What's included</div>
                <div className="space-y-4">
                  {(PLAN_FEATURES[selectedPlan] || PLAN_FEATURES.quarterly).map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#2563EB]/15 flex items-center justify-center shrink-0">
                        <f.icon size={15} className="text-[#60A5FA]" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white text-sm font-semibold">{f.label}</div>
                        <div className="text-[#475569] text-xs">{f.description}</div>
                      </div>
                      <CheckCircle size={14} className="text-[#22C55E] shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep("instructions")}
                className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-1 text-base mb-3"
              >
                Proceed to Payment — {plan.price}
                <ArrowRight size={18} />
              </button>
              <div className="flex items-center justify-center gap-4 text-[#475569] text-xs">
                <span className="flex items-center gap-1"><Shield size={11} /> Secure</span>
                <span className="flex items-center gap-1"><Clock size={11} /> Activated within 24hrs</span>
                <span className="flex items-center gap-1"><CheckCircle size={11} /> Manual verification</span>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Payment Instructions */}
          {step === "instructions" && (
            <motion.div key="instructions" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <button
                onClick={() => setStep("plans")}
                className="flex items-center gap-2 text-[#64748B] hover:text-white text-sm mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back to plans
              </button>

              <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-4">
                <div className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wide mb-4">Transfer Details</div>
                <div className="space-y-1">
                  <div className="bg-[#1E293B]/60 rounded-xl p-4 mb-4">
                    <div className="text-[#475569] text-xs mb-1">Amount to Transfer</div>
                    <div className="text-[#22C55E] text-2xl font-extrabold font-['Manrope']">{plan.price}</div>
                    <div className="text-[#475569] text-xs">{plan.name} Plan</div>
                  </div>

                  {[
                    { label: "Bank Name", value: BANK_DETAILS.bankName },
                    { label: "Account Number", value: BANK_DETAILS.accountNumber },
                    { label: "Account Name", value: BANK_DETAILS.accountName },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/4 last:border-0">
                      <div>
                        <div className="text-[#475569] text-xs">{item.label}</div>
                        <div className="text-white font-semibold text-sm">{item.value}</div>
                      </div>
                      <button
                        onClick={() => handleCopy(item.value, item.label)}
                        className="p-2 rounded-lg bg-[#1E293B] hover:bg-[#2563EB]/20 text-[#475569] hover:text-[#60A5FA] transition-all"
                        title={`Copy ${item.label}`}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[#F59E0B] font-semibold text-sm">Important</div>
                    <p className="text-[#94A3B8] text-xs mt-1 leading-relaxed">
                      After making the transfer, click below to submit your transfer reference number.
                      Your account will be activated within 24 hours after verification.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep("submit")}
                className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-1 text-base"
              >
                I Have Made the Transfer
                <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* STEP 3: Submit Reference */}
          {step === "submit" && (
            <motion.div key="submit" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <button
                onClick={() => setStep("instructions")}
                className="flex items-center gap-2 text-[#64748B] hover:text-white text-sm mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-4">
                <h2 className="text-white font-bold text-lg mb-1 font-['Manrope']">Submit Payment Proof</h2>
                <p className="text-[#64748B] text-sm mb-6">
                  Enter your bank transfer reference number so we can verify your payment.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">
                      Transfer Reference Number
                    </label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. TRF2024012345678"
                      className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all"
                    />
                    <p className="text-[#475569] text-xs mt-1">
                      This is the reference/transaction ID from your bank app or receipt.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">
                      Upload Receipt Proof (Max 2MB, PDF/PNG/JPEG)
                    </label>
                    <div className="relative border-2 border-dashed border-white/6 hover:border-white/12 rounded-xl p-4 flex flex-col items-center justify-center bg-[#1E293B]/40 hover:bg-[#1E293B]/60 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={submitting}
                      />
                      <Crown size={24} className="text-[#60A5FA] mb-2" />
                      <span className="text-white text-xs font-semibold text-center">
                        {file ? file.name : "Click to select PNG, JPEG, JPG, or PDF"}
                      </span>
                      {file && (
                        <span className="text-[#64748B] text-[10px] mt-1">
                          {(file.size / 1024 / 1024).toFixed(2)} MB — click to replace
                        </span>
                      )}
                    </div>
                  </div>

                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[#94A3B8]">
                        <span>Uploading receipt...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-[#1E293B] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#2563EB] h-1.5 rounded-full transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-[#1E293B]/60 rounded-xl p-4">
                    <div className="text-[#475569] text-xs mb-2">Payment Summary</div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8] text-sm">{plan.name} Plan</span>
                      <span className="text-white font-bold text-sm">{plan.price}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmitReference}
                disabled={submitting || !reference.trim() || !file}
                className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed text-base mb-4"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><CheckCircle size={18} /> Submit &amp; Send Receipt</>
                )}
              </button>

              <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-4 text-center">
                <MessageCircle size={20} className="text-[#22C55E] mx-auto mb-2" />
                <p className="text-[#94A3B8] text-xs leading-relaxed">
                  After submitting, you will be redirected to WhatsApp to send your receipt to{" "}
                  <span className="text-white font-semibold">{BANK_DETAILS.whatsappNumber}</span> for faster verification.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Social proof */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 text-center">
          <div className="flex justify-center gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} className="text-[#F59E0B] fill-[#F59E0B]" />
            ))}
          </div>
          <p className="text-[#64748B] text-xs">
            "Premium is worth every naira. I gained admission to UNILAG after 3 weeks of practice." — Adaeze O.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
