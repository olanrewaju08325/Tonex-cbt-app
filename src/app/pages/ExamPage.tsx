import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Flag, ChevronLeft, ChevronRight, Clock, Grid3X3, X,
  AlertTriangle, Maximize, ShieldAlert, Eye, EyeOff, Wifi, WifiOff, Calculator
} from "lucide-react";
import { useQuestions } from "../../lib/hooks/useQuestions";
import Latex from "react-latex-next";
import { CbtCalculator } from "../components/CbtCalculator";
import { useSaveExamSession } from "../../lib/hooks/useExamSessions";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";
import { queueOfflineSession } from "../../lib/offlineCache";

type QStatus = "unanswered" | "answered" | "flagged";

const CHEAT_MAX_VIOLATIONS = 3;

export function ExamPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const examContainerRef = useRef<HTMLDivElement>(null);

  const state = location.state as {
    count?: number;
    timer?: number;
    subject?: string;
    subjectName?: string;
    subjects?: string[];
    subjectNames?: string[];
    university?: string;
    universityName?: string;
    mode?: string;
    proctored?: boolean;
  } | null;

  const limit = state?.count ?? 15;
  const timerMins = state?.timer ?? 30;
  const isProctored = state?.proctored === true;
  const isPomodoro = state?.pomodoro === true;

  const POMODORO_FOCUS_SECS = 25 * 60;
  const POMODORO_BREAK_SECS = 5 * 60;

  const { data: questions, isLoading } = useQuestions({
    subjectId: state?.mode === "full_exam" ? undefined : state?.subject,
    subjectIds: state?.mode === "full_exam" ? state?.subjects : undefined,
    universityId: state?.university,
    limit,
  });

  const { mutateAsync: saveSession, isPending: saving } = useSaveExamSession();

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [statuses, setStatuses] = useState<QStatus[]>([]);
  const [timeLeft, setTimeLeft] = useState(isPomodoro ? POMODORO_FOCUS_SECS : timerMins * 60);
  const [pomodoroMode, setPomodoroMode] = useState<"focus" | "break">("focus");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [violationModal, setViolationModal] = useState(false);
  const [violationReason, setViolationReason] = useState("");
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [flagModal, setFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagging, setFlagging] = useState(false);

  const autosaveKey = `tonex_autosave_${profile?.id || 'guest'}_${state?.mode || 'practice'}_${state?.subject || state?.subjects?.join('-') || 'mixed'}`;

  // ─── Initialize answers array from autosave or fresh ───────────────────────
  useEffect(() => {
    if (questions && answers.length === 0) {
      const saved = localStorage.getItem(autosaveKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === questions.length) {
            setAnswers(parsed);
            const initialStatuses = parsed.map(ans => ans ? "answered" as QStatus : "unanswered" as QStatus);
            setStatuses(initialStatuses);
            return;
          }
        } catch (e) {
          // invalid json, ignore
        }
      }
      setAnswers(Array(questions.length).fill(null));
      setStatuses(Array(questions.length).fill("unanswered"));
    }
  }, [questions, answers.length, autosaveKey]);

  // ─── Enter fullscreen on mount if proctored ──────────────────────────────────
  useEffect(() => {
    if (!isProctored) return;
    const requestFS = async () => {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        toast.error("Please allow fullscreen for the proctored exam.");
      }
    };
    requestFS();

    const onFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        recordViolation("Exited fullscreen mode");
      }
    };
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, [isProctored]);

  // ─── Anti-cheat: visibility change ──────────────────────────────────────────
  useEffect(() => {
    if (!isProctored) return;
    const onVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("Switched to another tab or window");
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isProctored, violations]);

  // ─── Anti-cheat: right click & copy ─────────────────────────────────────────
  useEffect(() => {
    if (!isProctored) return;
    const noContext = (e: MouseEvent) => e.preventDefault();
    const noCopy = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "a", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        recordViolation("Attempted to copy or inspect page");
      }
    };
    document.addEventListener("contextmenu", noContext);
    document.addEventListener("keydown", noCopy);
    return () => {
      document.removeEventListener("contextmenu", noContext);
      document.removeEventListener("keydown", noCopy);
    };
  }, [isProctored, violations]);

  const recordViolation = useCallback((reason: string) => {
    setViolations(v => {
      const newCount = v + 1;
      setViolationReason(reason);
      setViolationModal(true);
      if (newCount >= CHEAT_MAX_VIOLATIONS) {
        // Force submit on max violations
        toast.error("Maximum violations reached. Exam submitted automatically.");
        setViolationModal(false);
        // Will trigger submit via useEffect below
      }
      return newCount;
    });
  }, []);

  // Auto-submit when max violations reached
  useEffect(() => {
    if (violations >= CHEAT_MAX_VIOLATIONS && !sessionSaved) {
      handleFinalSubmit();
    }
  }, [violations]);

  // ─── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if ((timerMins === 0 && !isPomodoro) || isLoading || sessionSaved) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (isPomodoro) {
            if (pomodoroMode === "focus") {
              setPomodoroMode("break");
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([200, 100, 200]);
              return POMODORO_BREAK_SECS;
            } else {
              setPomodoroMode("focus");
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([200, 100, 200]);
              return POMODORO_FOCUS_SECS;
            }
          } else {
            clearInterval(interval);
            handleFinalSubmit();
            return 0;
          }
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerMins, isLoading, sessionSaved, isPomodoro, pomodoroMode, handleFinalSubmit]);

  // ─── Submit handler ──────────────────────────────────────────────────────────
  const handleFinalSubmit = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    if (!questions || sessionSaved) return;
    setSessionSaved(true);
    setSubmitModal(false);

    // Exit fullscreen
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* ignore */ }
    }

    // Clear autosave
    localStorage.removeItem(autosaveKey);

    const answersData = questions.map((q, i) => ({
      question_id: q.id,
      selected_answer: answers[i] || null,
      is_correct: answers[i] === (q.correct_option || q.correct_answer),
    }));

    const correctAnswersCount = answersData.filter(a => a.is_correct).length;
    const totalQ = questions.length;
    const scorePercentage = (correctAnswersCount / totalQ) * 100;
    const timeTakenSeconds = isPomodoro ? POMODORO_FOCUS_SECS - timeLeft : timerMins * 60 - timeLeft;

    try {
      if (profile) {
        if (!navigator.onLine) {
          await queueOfflineSession({
            subject_id: state?.subject,
            university_id: state?.university,
            score_percentage: scorePercentage,
            total_questions: totalQ,
            correct_answers: correctAnswersCount,
            time_taken_seconds: timeTakenSeconds,
            answers: answersData,
          });
          toast.warning("Connection offline. Your test results have been queued locally and will sync when you are online!");
        } else {
          await saveSession({
            subject_id: state?.subject,
            university_id: state?.university,
            score_percentage: scorePercentage,
            total_questions: totalQ,
            correct_answers: correctAnswersCount,
            time_taken_seconds: timeTakenSeconds,
            answers: answersData,
          });
        }
      }
      // Save Daily Challenge completion
      if (state?.isDailyChallenge) {
        const dateStr = new Date().toLocaleDateString('en-CA');
        localStorage.setItem(`tonex_daily_challenge_${profile?.id || 'guest'}_${dateStr}`, "true");
        try {
          const key = `tonex_xp_points_${profile?.id || 'guest'}`;
          const currentXp = parseInt(localStorage.getItem(key) || "100");
          const earned = state?.isDoubleChallenge ? 100 : 50;
          localStorage.setItem(key, (currentXp + earned).toString());
        } catch (e) {
          console.error("XP saving failed:", e);
        }
      }
      navigate("/results", {
        replace: true,
        state: {
          answers,
          questions,
          correct: correctAnswersCount,
          timeTaken: timeTakenSeconds,
          subjectName: state?.subjectName || "Mixed",
          universityName: state?.universityName || "All",
          violations,
        },
      });
    } catch (error) {
      console.error("Online submit failed, queuing locally:", error);
      try {
        await queueOfflineSession({
          subject_id: state?.subject,
          university_id: state?.university,
          score_percentage: scorePercentage,
          total_questions: totalQ,
          correct_answers: correctAnswersCount,
          time_taken_seconds: timeTakenSeconds,
          answers: answersData,
        });
        toast.warning("Network issue. Session results saved locally and will auto-sync when connection is restored.");
      } catch (localErr) {
        console.error("Failed to save locally:", localErr);
        toast.error("Failed to save session locally, but here are your results.");
      }
      navigate("/results", {
        replace: true,
        state: { answers, questions, correct: correctAnswersCount, timeTaken: timeTakenSeconds, subjectName: state?.subjectName, universityName: state?.universityName, violations },
      });
    }
  }, [answers, questions, timeLeft, navigate, state, saveSession, profile, timerMins, sessionSaved, violations]);

  const submitFlag = async () => {
    if (!flagReason.trim()) return toast.error("Please describe the error");
    const q = questions?.[current];
    if (!q || !profile) return;
    setFlagging(true);
    const { error } = await supabase.from("question_flags").upsert({
      question_id: q.id,
      user_id: profile.id,
      reason: flagReason,
      status: "pending",
    }, { onConflict: "question_id,user_id" });
    setFlagging(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Question reported! Our team will review it.");
    setFlagModal(false);
    setFlagReason("");
  };

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (isLoading || !questions) {
    return (
      <div className="min-h-screen bg-[#08142D] flex flex-col p-6">
        <Skeleton className="h-16 w-full mb-6 bg-[#1E293B]" />
        <Skeleton className="h-48 w-full max-w-3xl mx-auto bg-[#0F172A]" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#08142D] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-white text-2xl font-bold mb-2">No Questions Found</h2>
        <p className="text-[#64748B] mb-6 max-w-md">There are currently no questions available for your selected subject and university configuration.</p>
        <button onClick={() => navigate("/practice")} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">
          Go Back to Settings
        </button>
      </div>
    );
  }

  if (answers.length !== questions.length) {
    return (
      <div className="min-h-screen bg-[#08142D] flex flex-col p-6">
        <Skeleton className="h-16 w-full mb-6 bg-[#1E293B]" />
        <Skeleton className="h-48 w-full max-w-3xl mx-auto bg-[#0F172A]" />
      </div>
    );
  }

  const selectAnswer = (letter: string) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }
    const newAnswers = [...answers];
    newAnswers[current] = letter;
    setAnswers(newAnswers);
    localStorage.setItem(autosaveKey, JSON.stringify(newAnswers));
    const newStatuses = [...statuses];
    if (newStatuses[current] !== "flagged") newStatuses[current] = "answered";
    setStatuses(newStatuses);
  };

  const toggleFlag = () => {
    const newStatuses = [...statuses];
    newStatuses[current] =
      newStatuses[current] === "flagged"
        ? answers[current] ? "answered" : "unanswered"
        : "flagged";
    setStatuses(newStatuses);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const q = questions[current];
  const answeredCount = answers.filter(Boolean).length;
  const flaggedCount = statuses.filter(s => s === "flagged").length;
  const isLowTime = (timerMins > 0 || isPomodoro) && timeLeft < 120 && pomodoroMode === "focus";
  const progress = ((current + 1) / questions.length) * 100;
  const optionLetters = ["A", "B", "C", "D"];
  const options = [q.option_a, q.option_b, q.option_c, q.option_d];

  return (
    <div ref={examContainerRef} className="min-h-screen bg-[#08142D] flex flex-col select-none">
      {/* Proctor Banner */}
      {isProctored && (
        <div className="bg-[#EF4444]/10 border-b border-[#EF4444]/20 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#EF4444] font-semibold">
            <ShieldAlert size={14} />
            <span>PROCTORED EXAM — Do not switch tabs, copy, or exit fullscreen</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1 ${isFullscreen ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
              {isFullscreen ? <><Maximize size={12} /> Fullscreen</> : <><AlertTriangle size={12} /> Not Fullscreen</>}
            </span>
            {violations > 0 && (
              <span className="text-[#F59E0B] flex items-center gap-1">
                <AlertTriangle size={12} /> {violations}/{CHEAT_MAX_VIOLATIONS} warnings
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0F172A]/90 backdrop-blur-xl border-b border-white/6 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-[#94A3B8] text-sm">
              <span className="text-white font-bold">{current + 1}</span>/{questions.length}
            </div>
            <div className="hidden sm:block text-[#475569] text-xs">
              {state?.mode === "full_exam" ? "Full Exam Mode" : state?.subjectName || "Practice"} · {state?.universityName || "All"}
            </div>
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm ${
            isLowTime
              ? "bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] animate-pulse"
              : isPomodoro && pomodoroMode === "break"
              ? "bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E]"
              : "bg-[#1E293B] text-white"
          }`}>
            <Clock size={14} className={isLowTime ? "text-[#EF4444]" : isPomodoro && pomodoroMode === "break" ? "text-[#22C55E]" : "text-[#60A5FA]"} />
            {(timerMins > 0 || isPomodoro) ? formatTime(timeLeft) : "∞"}
            {isPomodoro && <span className="text-[10px] ml-1 uppercase">{pomodoroMode}</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalc(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                showCalc
                  ? "bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#60A5FA]"
                  : "bg-[#1E293B] hover:bg-[#2563EB]/20 text-[#94A3B8] hover:text-white"
              }`}
              title="Toggle Calculator"
            >
              <Calculator size={14} />
              <span className="hidden sm:inline">Calculator</span>
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-1.5 bg-[#1E293B] hover:bg-[#2563EB]/20 px-3 py-2 rounded-xl text-[#94A3B8] hover:text-white transition-all text-xs"
              title="Question Palette"
            >
              <Grid3X3 size={14} />
              <span className="hidden sm:inline">Palette</span>
            </button>
            <button
              onClick={() => setSubmitModal(true)}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-3xl mx-auto mt-2">
          <div className="bg-[#1E293B] rounded-full h-1">
            <motion.div
              className="bg-gradient-to-r from-[#2563EB] to-[#60A5FA] h-1 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Subject Tabs for Full Exam */}
        {state?.mode === "full_exam" && state?.subjects && state?.subjectNames && (
          <div className="max-w-3xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {state.subjects.map((subId, idx) => {
              const isActive = questions[current]?.subject_id === subId;
              const firstQIndex = questions.findIndex(q => q.subject_id === subId);
              return (
                <button
                  key={subId}
                  onClick={() => {
                    if (firstQIndex !== -1) setCurrent(firstQIndex);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2563EB]/20 hover:text-white"
                  }`}
                >
                  {state!.subjectNames![idx]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Question card */}
              <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 mb-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-[#2563EB]/15 text-[#60A5FA] text-xs font-semibold px-3 py-1 rounded-full">
                      {state?.subjectName || q.subjects?.name || "Subject"}
                    </span>
                    {q.year && (
                      <span className="bg-white/5 text-[#64748B] text-xs font-semibold px-2 py-1 rounded-full">
                        {q.year}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFlagModal(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all border-white/6 text-[#475569] hover:text-[#EF4444] hover:border-[#EF4444]/30"
                      title="Report an error in this question"
                    >
                      <Flag size={12} /> Report
                    </button>
                    <button
                      onClick={toggleFlag}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                        statuses[current] === "flagged"
                          ? "bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]"
                          : "border-white/6 text-[#475569] hover:text-[#F59E0B] hover:border-[#F59E0B]/30"
                      }`}
                    >
                      <Flag size={12} />
                      {statuses[current] === "flagged" ? "Flagged" : "Flag"}
                    </button>
                  </div>
                </div>

                <div className="text-white text-base leading-relaxed font-medium whitespace-pre-wrap"><Latex>{q.text}</Latex></div>
                {q.image_url && (
                  <img src={q.image_url} alt="Question figure" className="mt-4 rounded-lg max-h-64 object-contain" />
                )}
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {options.map((option, i) => {
                  if (!option) return null;
                  const letter = optionLetters[i];
                  const selected = answers[current] === letter;
                  return (
                    <motion.button
                      key={i}
                      onClick={() => selectAnswer(letter)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                        selected
                          ? "bg-[#2563EB]/15 border-[#2563EB]/40 shadow-md shadow-blue-500/10"
                          : "bg-[#0F172A] border-white/6 hover:border-white/12 hover:bg-[#1E293B]/40"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all ${
                        selected
                          ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/30"
                          : "bg-[#1E293B] text-[#64748B]"
                      }`}>
                        {letter}
                      </div>
                      <span className={`text-sm leading-relaxed ${selected ? "text-white font-medium" : "text-[#94A3B8]"}`}>
                        <Latex>{option}</Latex>
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setCurrent(c => Math.max(0, c - 1))}
                  disabled={current === 0}
                  className="flex items-center gap-2 bg-[#0F172A] border border-white/6 text-[#94A3B8] hover:text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:border-white/12"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <div className="text-[#475569] text-xs text-center">
                  {answeredCount}/{questions.length} answered
                </div>

                {current < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                    className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setSubmitModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white px-5 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-green-500/20 transition-all"
                  >
                    Finish
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Question Palette Sidebar */}
      <AnimatePresence>
        {paletteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setPaletteOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-[#0F172A] border-l border-white/8 z-50 p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold">Question Palette</h3>
                <button onClick={() => setPaletteOpen(false)} className="text-[#475569] hover:text-white" title="Close Palette">
                  <X size={18} />
                </button>
              </div>

              {state?.mode === "full_exam" && state?.subjects ? (
                <div className="space-y-6 mb-6">
                  {state.subjects.map((subId, subIdx) => {
                    const subName = state!.subjectNames![subIdx];
                    const subQs = questions.map((q, i) => ({ q, i })).filter(x => x.q.subject_id === subId);
                    if (subQs.length === 0) return null;
                    return (
                      <div key={subId}>
                        <div className="text-white text-xs font-bold mb-3">{subName}</div>
                        <div className="grid grid-cols-5 gap-2">
                          {subQs.map(x => (
                            <button
                              key={x.i}
                              onClick={() => { setCurrent(x.i); setPaletteOpen(false); }}
                              className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                x.i === current
                                  ? "bg-[#2563EB] text-white ring-2 ring-[#2563EB]/50"
                                  : statuses[x.i] === "flagged"
                                  ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30"
                                  : statuses[x.i] === "answered"
                                  ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30"
                                  : "bg-[#1E293B] text-[#475569] border border-white/6 hover:border-white/12"
                              }`}
                            >
                              {x.i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setCurrent(i); setPaletteOpen(false); }}
                      className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                        i === current
                          ? "bg-[#2563EB] text-white ring-2 ring-[#2563EB]/50"
                          : statuses[i] === "flagged"
                          ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30"
                          : statuses[i] === "answered"
                          ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30"
                          : "bg-[#1E293B] text-[#475569] border border-white/6 hover:border-white/12"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2 mb-6">
                {[
                  { color: "bg-[#22C55E]/20 border-[#22C55E]/30", text: "Answered", count: answeredCount },
                  { color: "bg-[#F59E0B]/20 border-[#F59E0B]/30", text: "Flagged", count: flaggedCount },
                  { color: "bg-[#1E293B] border-white/6", text: "Not Answered", count: questions.length - answeredCount - flaggedCount },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border ${item.color}`} />
                    <span className="text-[#94A3B8] text-sm">{item.text}</span>
                    <span className="ml-auto text-white text-sm font-bold">{item.count}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setPaletteOpen(false); setSubmitModal(true); }}
                className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white font-bold py-3 rounded-xl"
              >
                Submit Exam
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Violation Warning Modal */}
      <AnimatePresence>
        {violationModal && violations < CHEAT_MAX_VIOLATIONS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1A0B0B] border-2 border-[#EF4444]/30 rounded-2xl p-7 max-w-sm w-full shadow-2xl shadow-red-500/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/15 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={28} className="text-[#EF4444]" />
              </div>
              <h3 className="text-white font-extrabold text-xl text-center mb-2 font-['Manrope']">
                Integrity Violation
              </h3>
              <p className="text-[#EF4444]/80 text-sm text-center mb-2">{violationReason}</p>
              <p className="text-[#94A3B8] text-xs text-center mb-5">
                Warning {violations} of {CHEAT_MAX_VIOLATIONS}. 
                {violations >= CHEAT_MAX_VIOLATIONS - 1 
                  ? " Next violation will auto-submit your exam."
                  : " Further violations will result in automatic submission."}
              </p>
              <button
                onClick={() => {
                  setViolationModal(false);
                  // Re-enter fullscreen if lost
                  if (isProctored && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }}
                className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold py-3 rounded-xl transition-all"
              >
                I Understand — Continue Exam
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pomodoro Break Overlay */}
      <AnimatePresence>
        {isPomodoro && pomodoroMode === "break" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-[#08142D]/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-[#22C55E]/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                <Clock size={40} className="text-[#22C55E] animate-pulse" />
              </div>
              <h2 className="text-white font-extrabold text-3xl mb-3 font-['Manrope']">Break Time!</h2>
              <p className="text-[#94A3B8] text-sm mb-8 max-w-sm mx-auto">
                Step away from the screen, stretch, and grab a drink. Your exam is safely paused.
              </p>
              <div className="text-[5rem] font-black text-white font-mono leading-none tracking-tighter mb-8 drop-shadow-2xl">
                {formatTime(timeLeft)}
              </div>
              <button
                onClick={() => {
                  setPomodoroMode("focus");
                  setTimeLeft(POMODORO_FOCUS_SECS);
                }}
                className="bg-[#1E293B] hover:bg-[#334155] text-white border border-white/10 font-bold py-3 px-8 rounded-xl transition-all"
              >
                Skip Break
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {submitModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4"
            >
              <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-7 max-w-sm w-full shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/15 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={28} className="text-[#F59E0B]" />
                </div>
                <h3 className="text-white font-extrabold text-xl text-center mb-2 font-['Manrope']">
                  Submit Exam?
                </h3>
                <p className="text-[#64748B] text-sm text-center mb-2">
                  You've answered <span className="text-white font-bold">{answeredCount}</span> of{" "}
                  <span className="text-white font-bold">{questions.length}</span> questions.
                </p>
                {questions.length - answeredCount > 0 && (
                  <p className="text-[#EF4444] text-xs text-center mb-5">
                    ⚠ Warning: {questions.length - answeredCount} questions unanswered
                  </p>
                )}
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setSubmitModal(false)}
                    className="flex-1 bg-[#1E293B] text-[#94A3B8] hover:text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
                    disabled={saving}
                  >
                    Continue
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-green-500/20 disabled:opacity-70 flex items-center justify-center"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Submit Now"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Report Question Modal */}
      <AnimatePresence>
        {flagModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[60]" onClick={() => setFlagModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-[60] px-4">
              <div className="bg-[#0B1829] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Flag size={16} className="text-[#EF4444]" />
                  <h3 className="text-white font-bold">Report an Error</h3>
                </div>
                <p className="text-[#64748B] text-xs mb-4">Question #{current + 1} — Help us improve by describing the issue.</p>
                <textarea
                  placeholder="e.g. Wrong correct answer, typo in option B..."
                  value={flagReason}
                  onChange={e => setFlagReason(e.target.value)}
                  className="w-full h-24 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setFlagModal(false)} className="flex-1 bg-[#1E293B] text-[#94A3B8] font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
                  <button onClick={submitFlag} disabled={flagging}
                    className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {flagging ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Flag size={13} /> Submit Report</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Draggable Calculator */}
      <AnimatePresence>
        {showCalc && <CbtCalculator onClose={() => setShowCalc(false)} />}
      </AnimatePresence>
    </div>
  );
}
