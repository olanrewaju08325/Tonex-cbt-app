import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, Timer, Hash, ArrowRight, Lock, ShieldAlert, Zap,
  Trophy, TrendingUp, Star, CheckCircle, WifiOff, Download
} from "lucide-react";
import { useUniversities } from "../../lib/hooks/useUniversities";
import { useSubjects } from "../../lib/hooks/useSubjects";
import { useDailyLimit } from "../../lib/hooks/useDailyLimit";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../lib/hooks/useSubscription";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { cacheQuestions, cacheSubjects, cacheUniversities } from "../../lib/offlineCache";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "../components/ui/drawer";

const QUESTION_COUNTS = [10, 20, 40, 60, 100];
const TIMER_OPTIONS = [
  { label: "No Timer", value: 0 },
  { label: "15 mins", value: 15 },
  { label: "30 mins", value: 30 },
  { label: "45 mins", value: 45 },
  { label: "60 mins", value: 60 },
  { label: "90 mins", value: 90 },
];

type Mode = "practice" | "exam";

function getTimeUntilReset() {
  const now = new Date();
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export function PracticePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // Offline sync states
  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const { data: activeSub } = useSubscription();
  const canDownloadOffline = profile?.is_premium && (
    activeSub?.plan === 'quarterly' ||
    activeSub?.plan === 'yearly' ||
    activeSub?.plan === 'manual' ||
    profile?.role === 'admin' ||
    profile?.role === 'superadmin'
  );
  
  // Query practiced subjects for 4-subject free tier limit
  const { data: activeSubjectIds = [] } = useQuery({
    queryKey: ['activeSubjects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const [usageRes, sessionRes] = await Promise.all([
        supabase.from('daily_usage').select('subject_id').eq('user_id', profile.id),
        supabase.from('exam_sessions').select('subject_id').eq('user_id', profile.id),
      ]);
      const ids = new Set<string>();
      usageRes.data?.forEach(d => { if (d.subject_id) ids.add(d.subject_id); });
      sessionRes.data?.forEach(d => { if (d.subject_id) ids.add(d.subject_id); });
      return Array.from(ids);
    },
    enabled: !!profile?.id && !profile?.is_premium,
  });

  const [resetTime, setResetTime] = useState(getTimeUntilReset());

  useEffect(() => {
    const timer = setInterval(() => {
      setResetTime(getTimeUntilReset());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  const { data: universities, isLoading: unisLoading } = useUniversities();
  const { data: subjects, isLoading: subsLoading } = useSubjects();
  const [mode, setMode] = useState<Mode>("practice");
  const [proctored, setProctored] = useState(false);

  const [config, setConfig] = useState({
    university: "",
    subject: "",
    count: 40,
    timer: 30,
    pomodoro: false,
  });

  const { data: dailyLimit, isLoading: limitLoading } = useDailyLimit(config.subject);
  const isLocked = !!(dailyLimit && dailyLimit.remaining <= 0 && !dailyLimit.is_premium);

  // Automatically adjust selected count for free users if it exceeds remaining daily limit
  useEffect(() => {
    if (dailyLimit && !dailyLimit.is_premium && config.subject) {
      if (config.count > dailyLimit.remaining && dailyLimit.remaining > 0) {
        setConfig(c => ({ ...c, count: dailyLimit.remaining }));
      }
    }
  }, [dailyLimit, config.subject, config.count]);

  const handleDownloadOffline = async () => {
    if (!subjects || subjects.length === 0) {
      toast.error("Subjects registry not loaded yet.");
      return;
    }
    setDownloadingOffline(true);
    setDownloadProgress(0);
    
    try {
      // 1. Cache the subject registry itself
      await cacheSubjects(subjects);
      
      // 2. Fetch and cache universities list
      if (universities) {
        await cacheUniversities(universities);
      }
      
      // 3. For each subject, fetch first 100 questions and cache them
      let processed = 0;
      for (const sub of subjects) {
        const { data, error } = await supabase
          .from("questions")
          .select("*, subjects(name)")
          .eq("subject_id", sub.id)
          .eq("is_published", true)
          .limit(100);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          await cacheQuestions(data);
        }
        
        processed++;
        setDownloadProgress(Math.round((processed / subjects.length) * 100));
      }
      
      toast.success("All subject question banks successfully cached for offline practice!");
    } catch (err: any) {
      console.error("Offline setup error:", err);
      toast.error(`Failed to cache questions: ${err.message}`);
    } finally {
      setDownloadingOffline(false);
    }
  };

  const handleStart = () => {
    if (!config.subject) {
      toast.error("Please select a subject to continue");
      return;
    }
    if (isLocked) {
      toast.error("Daily limit reached. Upgrade to Premium for unlimited practice.");
      return;
    }

    navigate("/exam", {
      state: {
        ...config,
        mode,
        proctored: proctored && mode === "exam",
        universityName: universities?.find(u => u.id === config.university)?.short_name || "All Universities",
        subjectName: subjects?.find(s => s.id === config.subject)?.name || "",
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-['Manrope']">
            CBT Session
          </h1>
          <p className="text-[#64748B] text-sm">Configure your practice or exam session</p>
        </motion.div>

        <div className="space-y-5">
          {/* Mode Selector */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-5"
          >
            <div className="text-white font-semibold text-sm mb-4">Session Mode</div>
            <div className="grid grid-cols-2 gap-3">
              {([
                {
                  id: "practice" as Mode,
                  label: "Practice Mode",
                  desc: "Relaxed, no pressure. Instant feedback.",
                  icon: BookOpen,
                  color: "blue",
                  accent: "#2563EB",
                  bg: "#2563EB/15",
                },
                {
                  id: "exam" as Mode,
                  label: "Exam Mode",
                  desc: "Timed, realistic CBT simulation.",
                  icon: Trophy,
                  color: "amber",
                  accent: "#F59E0B",
                  bg: "#F59E0B/15",
                },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`relative p-4 rounded-2xl border text-left transition-all ${
                    mode === m.id
                      ? `border-[${m.accent}]/40 bg-[${m.bg}]`
                      : "border-white/6 hover:border-white/12 bg-[#1E293B]/40"
                  }`}
                  style={mode === m.id ? { borderColor: `${m.accent}40`, background: `${m.accent}15` } : {}}
                >
                  {mode === m.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle size={16} style={{ color: m.accent }} />
                    </div>
                  )}
                  <m.icon size={20} className="mb-2" style={{ color: mode === m.id ? m.accent : "#64748B" }} />
                  <div className={`font-bold text-sm mb-1 ${mode === m.id ? "text-white" : "text-[#94A3B8]"}`}>{m.label}</div>
                  <div className="text-[#64748B] text-xs">{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Proctored toggle — only for exam mode */}
            <AnimatePresence>
              {mode === "exam" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div
                    onClick={() => setProctored(p => !p)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      proctored ? "border-[#EF4444]/30 bg-[#EF4444]/5" : "border-white/6 bg-[#1E293B]/40 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldAlert size={18} className={proctored ? "text-[#EF4444]" : "text-[#64748B]"} />
                      <div>
                        <div className={`text-sm font-bold ${proctored ? "text-white" : "text-[#94A3B8]"}`}>
                          Proctored Exam
                        </div>
                        <div className="text-[#64748B] text-xs">Fullscreen, no copy/paste, tab-switch detection</div>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors relative ${proctored ? "bg-[#EF4444]" : "bg-[#1E293B]"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${proctored ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* University */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#2563EB]/15 flex items-center justify-center">
                <TrendingUp size={18} className="text-[#60A5FA]" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">University</div>
                <div className="text-[#475569] text-xs">Filter by target university (optional)</div>
              </div>
            </div>
            {unisLoading ? <Skeleton className="h-20 bg-[#1E293B] rounded-xl" /> : (
              <>
                {/* Mobile Button: Trigger bottom drawer */}
                <div className="block sm:hidden">
                  <Drawer>
                    <DrawerTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3.5 bg-[#1E293B]/40 hover:bg-[#1E293B]/60 text-white rounded-xl border border-white/6 text-sm font-semibold">
                        <span>
                          {config.university === ""
                            ? "All Universities"
                            : universities?.find(u => u.id === config.university)?.short_name || "Select Target"}
                        </span>
                        <span className="text-[#64748B] text-xs">Tap to change</span>
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="bg-[#0F172A] border-white/10 p-5 pb-8 max-h-[85vh]">
                      <DrawerHeader className="px-0">
                        <DrawerTitle className="text-white text-base">Select Target University</DrawerTitle>
                      </DrawerHeader>
                      <div className="grid grid-cols-2 gap-2 overflow-y-auto mt-2">
                        <DrawerClose asChild>
                          <button
                            onClick={() => setConfig(c => ({ ...c, university: "" }))}
                            className={`py-3 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                              config.university === ""
                                ? "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#60A5FA]"
                                : "border-white/6 text-[#64748B]"
                            }`}
                          >
                            All Universities
                          </button>
                        </DrawerClose>
                        {universities?.map(uni => (
                          <DrawerClose asChild key={uni.id}>
                            <button
                              onClick={() => setConfig(c => ({ ...c, university: uni.id }))}
                              className={`py-3 px-3 rounded-xl text-xs font-semibold border transition-all text-left truncate ${
                                config.university === uni.id
                                  ? "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#60A5FA]"
                                  : "border-white/6 text-[#64748B]"
                              }`}
                            >
                              {uni.short_name}
                            </button>
                          </DrawerClose>
                        ))}
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>

                {/* Desktop Grid Layout */}
                <div className="hidden sm:grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setConfig(c => ({ ...c, university: "" }))}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      config.university === ""
                        ? "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#60A5FA]"
                        : "border-white/6 text-[#64748B] hover:border-white/12 hover:text-white"
                    }`}
                  >
                    All Universities
                  </button>
                  {universities?.map(uni => (
                    <button
                      key={uni.id}
                      onClick={() => setConfig(c => ({ ...c, university: uni.id }))}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left truncate ${
                        config.university === uni.id
                          ? "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#60A5FA]"
                          : "border-white/6 text-[#64748B] hover:border-white/12 hover:text-white"
                      }`}
                    >
                      {uni.short_name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* Subject */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center">
                <BookOpen size={18} className="text-[#A78BFA]" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Subject <span className="text-[#EF4444]">*</span></div>
                <div className="text-[#475569] text-xs">Required — choose a subject to practice</div>
              </div>
            </div>
            {subsLoading ? <Skeleton className="h-20 bg-[#1E293B] rounded-xl" /> : (
              <>
                {/* Mobile Button: Trigger bottom drawer */}
                <div className="block sm:hidden">
                  <Drawer>
                    <DrawerTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3.5 bg-[#1E293B]/40 hover:bg-[#1E293B]/60 text-white rounded-xl border border-white/6 text-sm font-semibold">
                        <span className="flex items-center gap-2">
                          {config.subject ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-[#A78BFA]" />
                              {subjects?.find(s => s.id === config.subject)?.name}
                            </>
                          ) : (
                            "Choose a Subject..."
                          )}
                        </span>
                        <span className="text-[#64748B] text-xs">Tap to change</span>
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="bg-[#0F172A] border-white/10 p-5 pb-8 max-h-[85vh]">
                      <DrawerHeader className="px-0">
                        <DrawerTitle className="text-white text-base">Select Subject</DrawerTitle>
                      </DrawerHeader>
                      <div className="grid grid-cols-2 gap-2 overflow-y-auto mt-2">
                        {subjects?.map(sub => {
                          const isPracticed = activeSubjectIds.includes(sub.id);
                          const isLockedSubject = !profile?.is_premium && activeSubjectIds.length >= 4 && !isPracticed;

                          return (
                            <DrawerClose asChild key={sub.id}>
                              <button
                                onClick={() => {
                                  if (isLockedSubject) {
                                    toast.error("Subject locked. Free plan users are limited to 4 subjects. Upgrade to unlock all subjects!");
                                    navigate("/premium");
                                    return;
                                  }
                                  setConfig(c => ({ ...c, subject: sub.id }));
                                }}
                                className={`py-3 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 truncate ${
                                  isLockedSubject
                                    ? "border-white/5 bg-[#1E293B]/20 text-[#475569] cursor-not-allowed opacity-50"
                                    : config.subject === sub.id
                                    ? "bg-[#7C3AED]/20 border-[#7C3AED]/40 text-[#A78BFA]"
                                    : "border-white/6 text-[#64748B]"
                                }`}
                              >
                                {isLockedSubject ? (
                                  <Lock size={12} className="text-[#475569] shrink-0" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: config.subject === sub.id ? "#A78BFA" : "#334155" }} />
                                )}
                                {sub.name}
                              </button>
                            </DrawerClose>
                          );
                        })}
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>

                {/* Desktop Grid Layout */}
                <div className="hidden sm:grid grid-cols-3 gap-2">
                  {subjects?.map(sub => {
                    const isPracticed = activeSubjectIds.includes(sub.id);
                    const isLockedSubject = !profile?.is_premium && activeSubjectIds.length >= 4 && !isPracticed;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          if (isLockedSubject) {
                            toast.error("Subject locked. Free plan users are limited to 4 subjects. Upgrade to unlock all subjects!");
                            navigate("/premium");
                            return;
                          }
                          setConfig(c => ({ ...c, subject: sub.id }));
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 truncate ${
                          isLockedSubject
                            ? "border-white/5 bg-[#1E293B]/20 text-[#475569] cursor-not-allowed opacity-50"
                            : config.subject === sub.id
                            ? "bg-[#7C3AED]/20 border-[#7C3AED]/40 text-[#A78BFA]"
                            : "border-white/6 text-[#64748B] hover:border-white/12 hover:text-white"
                        }`}
                      >
                        {isLockedSubject ? (
                          <Lock size={12} className="text-[#475569] shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: config.subject === sub.id ? "#A78BFA" : "#334155" }} />
                        )}
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {config.subject && !limitLoading && dailyLimit && !dailyLimit.is_premium && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-medium text-center border ${
                dailyLimit.remaining > 0 ? "bg-[#22C55E]/5 border-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/5 border-[#EF4444]/20 text-[#EF4444]"
              }`}>
                {dailyLimit.remaining > 0
                  ? `${dailyLimit.remaining} free questions remaining today`
                  : `Daily free limit reached for this subject. Resets in ${resetTime}.`}
              </div>
            )}
          </motion.div>

          {/* Question Count */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 flex items-center justify-center">
                <Hash size={18} className="text-[#22C55E]" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Number of Questions</div>
                <div className="text-[#475569] text-xs">Selected: <span className="text-white font-bold">{config.count}</span></div>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              {dailyLimit && !dailyLimit.is_premium && dailyLimit.remaining > 0 && !QUESTION_COUNTS.includes(dailyLimit.remaining) && (
                <button
                  onClick={() => setConfig(c => ({ ...c, count: dailyLimit.remaining }))}
                  className={`flex-1 min-w-[140px] py-3 px-2 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                    config.count === dailyLimit.remaining
                      ? "bg-[#22C55E]/20 border-[#22C55E]/40 text-[#22C55E]"
                      : "border-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/5"
                  }`}
                >
                  {dailyLimit.remaining} Questions (Free Limit)
                </button>
              )}
              {QUESTION_COUNTS.map(count => {
                const disabled = !!(dailyLimit && !dailyLimit.is_premium && count > dailyLimit.remaining);
                return (
                  <button
                    key={count}
                    disabled={disabled}
                    onClick={() => !disabled && setConfig(c => ({ ...c, count }))}
                    className={`flex-1 min-w-[50px] py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-1.5 relative ${
                      disabled
                        ? "border-white/5 bg-[#1E293B]/20 text-[#475569] cursor-not-allowed opacity-50"
                        : config.count === count
                        ? "bg-[#22C55E]/20 border-[#22C55E]/40 text-[#22C55E]"
                        : "border-white/6 text-[#64748B] hover:border-white/12 hover:text-white"
                    }`}
                  >
                    {disabled && <Lock size={12} className="text-[#475569]" />}
                    {count}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Timer */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
            className="bg-[#0F172A] border border-white/6 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center">
                <Timer size={18} className="text-[#F59E0B]" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Time Limit</div>
                <div className="text-[#475569] text-xs">How long should this session last?</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {TIMER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setConfig(c => ({ ...c, timer: opt.value }))}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                    config.timer === opt.value
                      ? "bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B]"
                      : "border-white/6 text-[#64748B] hover:border-white/12 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Study Technique */}
          {mode === "practice" && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
              className="bg-[#0F172A] border border-white/6 rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#EC4899]/15 flex items-center justify-center">
                  <Clock size={18} className="text-[#EC4899]" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Study Technique</div>
                  <div className="text-[#475569] text-xs">Enable structured study intervals</div>
                </div>
              </div>
              <div
                onClick={() => setConfig(c => ({ ...c, pomodoro: !c.pomodoro }))}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  config.pomodoro ? "border-[#EC4899]/30 bg-[#EC4899]/5" : "border-white/6 bg-[#1E293B]/40 hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock size={18} className={config.pomodoro ? "text-[#EC4899]" : "text-[#64748B]"} />
                  <div>
                    <div className={`text-sm font-bold ${config.pomodoro ? "text-white" : "text-[#94A3B8]"}`}>
                      Pomodoro Method
                    </div>
                    <div className="text-[#64748B] text-xs">25 mins focus + 5 mins break intervals</div>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative ${config.pomodoro ? "bg-[#EC4899]" : "bg-[#1E293B]"}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${config.pomodoro ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Summary + CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-5 mb-4">
              <div className="text-white font-semibold text-sm mb-3">Session Summary</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Mode", value: mode === "exam" ? `Exam${proctored ? " (Proctored)" : ""}` : "Practice" },
                  { label: "Subject", value: subjects?.find(s => s.id === config.subject)?.name || "Not selected" },
                  { label: "Questions", value: `${config.count} questions` },
                  { label: "Time Limit", value: config.pomodoro ? "Pomodoro (25m/5m)" : config.timer === 0 ? "No limit" : `${config.timer} mins` },
                ].map(item => (
                  <div key={item.label} className="bg-[#1E293B]/60 rounded-xl p-3">
                    <div className="text-[#475569] text-xs mb-0.5">{item.label}</div>
                    <div className="text-white text-sm font-semibold truncate">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {isLocked ? (
              <div className="bg-[#1E293B] border border-[#EF4444]/40 rounded-2xl p-6 text-center">
                <Lock size={24} className="text-[#EF4444] mx-auto mb-2" />
                <h3 className="text-white font-bold mb-1">Daily Limit Reached</h3>
                <p className="text-[#94A3B8] text-sm mb-4">You've reached the free limit for this subject today.</p>
                <button
                  onClick={() => navigate("/premium")}
                  className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white font-bold py-3 px-6 rounded-xl hover:-translate-y-0.5 transition-all shadow-md shadow-orange-500/20"
                >
                  Upgrade to Premium
                </button>
              </div>
            ) : (
              <button
                onClick={handleStart}
                disabled={!config.subject}
                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                  config.subject
                    ? mode === "exam"
                      ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-1"
                      : "bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1"
                    : "bg-[#1E293B] text-[#475569] cursor-not-allowed"
                }`}
              >
                {mode === "exam" ? <><Trophy size={20} /> Start Exam</> : <><Zap size={20} /> Start Practice</>}
                <ArrowRight size={20} />
              </button>
            )}

            {!config.subject && (
              <p className="text-[#EF4444] text-xs text-center mt-2">Please select a subject to continue</p>
            )}
          </motion.div>

          {/* Offline Mode Setup Card */}
          {profile?.is_premium && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-[#0B3D91]/30 to-[#2563EB]/10 border border-[#2563EB]/20 rounded-2xl p-5 mt-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#2563EB]/25 flex items-center justify-center">
                  <WifiOff size={18} className="text-[#60A5FA]" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Offline Practice Mode</h4>
                  <p className="text-[#64748B] text-xs">Download questions to study without internet.</p>
                </div>
              </div>

              {!canDownloadOffline ? (
                <div className="space-y-3 mt-2">
                  <p className="text-[#94A3B8] text-xs leading-relaxed">
                    Offline question downloads are available on Quarterly & Yearly plans (₦6,500+). You are currently on the Monthly plan.
                  </p>
                  <div className="bg-[#1E293B]/60 rounded-xl p-3 border border-[#334155]/50 space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#94A3B8]">Paid amount (Monthly):</span>
                      <span className="text-white font-semibold">₦{(activeSub?.amount || 2500).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#94A3B8]">Quarterly Upgrade Balance:</span>
                      <span className="text-[#FBBF24] font-bold">₦{Math.max(0, 6500 - (activeSub?.amount || 2500)).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] leading-relaxed space-y-1 bg-[#1E293B]/30 p-2.5 rounded-lg border border-[#334155]/30">
                    <span className="text-white font-semibold text-xs block mb-1">🎁 Premium Perks on ₦6,500+ Plans:</span>
                    <ul className="list-disc list-inside mt-1 space-y-1 pl-0.5">
                      <li><strong className="text-white">Offline Practice Mode</strong>: Download questions & subjects to study completely offline.</li>
                      <li><strong className="text-white">Priority Support</strong>: Direct fast-track WhatsApp query resolutions with support managers.</li>
                      <li><strong className="text-white">Performance Coaching</strong>: Scheduled 1-on-1 calls with CBT tutors to improve weak subjects.</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => navigate("/subscription")}
                    className="w-full flex items-center justify-center gap-2 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/35 text-[#FBBF24] border border-[#F59E0B]/30 hover:border-[#F59E0B]/50 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Lock size={12} />
                    Upgrade for ₦{Math.max(0, 6500 - (activeSub?.amount || 2500)).toLocaleString()}
                  </button>
                </div>
              ) : downloadingOffline ? (
                <div className="space-y-2">
                  <div className="bg-[#1E293B] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#2563EB] h-full transition-all" style={{ width: `${downloadProgress}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#94A3B8]">
                    <span>Caching questions...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDownloadOffline}
                  className="w-full flex items-center justify-center gap-2 bg-[#2563EB]/20 hover:bg-[#2563EB]/35 text-[#60A5FA] border border-[#2563EB]/30 hover:border-[#2563EB]/50 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  <Download size={13} />
                  Download Question Banks (Offline Sync)
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
