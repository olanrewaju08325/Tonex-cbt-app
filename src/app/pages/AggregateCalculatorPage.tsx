import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { 
  Calculator, Building2, BookOpen, AlertCircle, Award, 
  HelpCircle, CheckCircle2, ChevronRight, Plus, Trash2 
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

interface University {
  id: string;
  name: string;
  short_name: string;
}

const GRADES = [
  { grade: "A1", unilag: 4.0, oau: 8 },
  { grade: "B2", unilag: 3.6, oau: 7 },
  { grade: "B3", unilag: 3.2, oau: 6 },
  { grade: "C4", unilag: 2.8, oau: 5 },
  { grade: "C5", unilag: 2.4, oau: 4 },
  { grade: "C6", unilag: 2.0, oau: 3 },
  { grade: "D7", unilag: 0.0, oau: 0 },
  { grade: "E8", unilag: 0.0, oau: 0 },
  { grade: "F9", unilag: 0.0, oau: 0 }
];

const SUBJECTS = [
  "English Language",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Government",
  "Literature in English",
  "Economics",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "Financial Accounting",
  "Agricultural Science",
  "Geography"
];

export function AggregateCalculatorPage() {
  const { profile } = useAuth();
  
  // State variables
  const [targetUniId, setTargetUniId] = useState<string>("");
  const [jambScore, setJambScore] = useState<string>("");
  const [postUtmeScore, setPostUtmeScore] = useState<string>("");
  const [sittingMode, setSittingMode] = useState<"single" | "double">("single");
  
  // Sitting 1 grades
  const [sitting1, setSitting1] = useState<{ subject: string; grade: string }[]>([
    { subject: "English Language", grade: "A1" },
    { subject: "Mathematics", grade: "A1" },
    { subject: "", grade: "A1" },
    { subject: "", grade: "A1" },
    { subject: "", grade: "A1" }
  ]);

  // Sitting 2 grades (used if double sitting)
  const [sitting2, setSitting2] = useState<{ subject: string; grade: string }[]>([
    { subject: "English Language", grade: "A1" },
    { subject: "Mathematics", grade: "A1" },
    { subject: "", grade: "A1" },
    { subject: "", grade: "A1" },
    { subject: "", grade: "A1" }
  ]);

  // Fetch list of active universities
  const { data: universities = [] } = useQuery<University[]>({
    queryKey: ["universities-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("universities")
        .select("id, name, short_name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  // Fetch university exam config weights dynamically
  const { data: examConfigs = [] } = useQuery<any[]>({
    queryKey: ["university-exam-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("university_exam_configs")
        .select("*");
      if (error) throw error;
      return data || [];
    }
  });

  // Automatically load the student's target university and average mock score
  const { data: averageMockScore } = useQuery<number | null>({
    queryKey: ["avg-post-utme-score", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data, error } = await supabase
        .from("exam_sessions")
        .select("score_percentage")
        .eq("user_id", profile.id);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const total = data.reduce((acc, curr) => acc + curr.score_percentage, 0);
      return Math.round((total / data.length) * 100) / 100;
    },
    enabled: !!profile?.id
  });

  useEffect(() => {
    if (profile?.target_university_id) {
      setTargetUniId(profile.target_university_id);
    }
    if (averageMockScore !== undefined && averageMockScore !== null) {
      setPostUtmeScore(averageMockScore.toString());
    }
  }, [profile, averageMockScore]);

  const activeUni = universities.find(u => u.id === targetUniId);
  const activeConfig = examConfigs.find(c => c.university_id === targetUniId);

  // Derived configuration settings with default fallback parameters
  const jambWeight = activeConfig ? Number(activeConfig.jamb_weight_percentage) : 0.50;
  const postUtmeWeight = activeConfig ? Number(activeConfig.post_utme_weight_percentage) : 0.50;
  const olevelWeight = activeConfig ? Number(activeConfig.olevel_weight_percentage) : 0.00;
  const olevelPointsSystem = activeConfig ? activeConfig.olevel_points_system : "none";
  const allowDoubleSitting = activeConfig ? activeConfig.allow_double_sitting : true;

  // Grade point calculations
  const calculateOLevelScore = () => {
    if (!activeUni) return 0;
    
    // O'Level points system check
    if (olevelPointsSystem === "none") {
      return 0;
    }

    if (sittingMode === "double" && !allowDoubleSitting) {
      return -1; // double sittings are rejected!
    }

    // Get combined list of subject-grade values
    const list1 = sitting1.filter(item => item.subject !== "");
    const list2 = sitting2.filter(item => item.subject !== "");

    if (olevelPointsSystem === "unilag") {
      // Calculate UNILAG O'Level points (max 20)
      let score = 0;
      sitting1.forEach(item => {
        if (!item.subject) return;
        const gDef = GRADES.find(g => g.grade === item.grade);
        score += gDef ? gDef.unilag : 0;
      });
      return score;
    }

    if (olevelPointsSystem === "oau") {
      // Find best grade for each subject across sittings
      const subjectMap: Record<string, string> = {};
      
      list1.forEach(item => {
        subjectMap[item.subject] = item.grade;
      });

      if (sittingMode === "double") {
        list2.forEach(item => {
          const existingGrade = subjectMap[item.subject];
          if (!existingGrade) {
            subjectMap[item.subject] = item.grade;
          } else {
            // Pick the grade with more points
            const currentPoints = GRADES.find(g => g.grade === existingGrade)?.oau || 0;
            const newPoints = GRADES.find(g => g.grade === item.grade)?.oau || 0;
            if (newPoints > currentPoints) {
              subjectMap[item.subject] = item.grade;
            }
          }
        });
      }

      // Sum top 5 OAU grades (compulsory Math, English + next 3 best relevant subjects)
      let score = 0;
      const subjectsWithGrades = Object.entries(subjectMap);
      
      // Separate core subjects
      const mathGrade = subjectMap["Mathematics"];
      const englishGrade = subjectMap["English Language"];
      
      if (mathGrade) score += GRADES.find(g => g.grade === mathGrade)?.oau || 0;
      if (englishGrade) score += GRADES.find(g => g.grade === englishGrade)?.oau || 0;

      const otherSubjects = subjectsWithGrades
        .filter(([sub]) => sub !== "Mathematics" && sub !== "English Language")
        .map(([_, grade]) => GRADES.find(g => g.grade === grade)?.oau || 0)
        .sort((a, b) => b - a);

      for (let i = 0; i < Math.min(3, otherSubjects.length); i++) {
        score += otherSubjects[i];
      }

      // Apply double sitting penalty (-2 points for double sitting on OAU screening)
      if (sittingMode === "double" && score > 0) {
        score = Math.max(0, score - 2.0);
      }

      return score;
    }

    return 0;
  };

  // Calculate final aggregate
  const calculateFinalAggregate = () => {
    const jamb = parseFloat(jambScore) || 0;
    const postUtme = parseFloat(postUtmeScore) || 0;
    const oLevel = calculateOLevelScore();

    if (!activeUni) return 0;
    if (jamb > 400 || postUtme > 100) return 0;
    if (oLevel === -1) return 0; // Double sitting rejected

    const jambPart = (jamb / 400) * 100 * jambWeight;
    const postUtmePart = (postUtme / 100) * 100 * postUtmeWeight;
    const oLevelPart = oLevel; // Raw O'Level points scale directly into aggregate points

    return jambPart + postUtmePart + oLevelPart;
  };

  const finalAggregate = calculateFinalAggregate();
  const oLevelPoints = calculateOLevelScore();

  const handleSittingChange = (index: number, field: "subject" | "grade", value: string, sitting: 1 | 2) => {
    const setter = sitting === 1 ? setSitting1 : setSitting2;
    setter(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const getUpgradeTip = () => {
    if (!activeUni) return "";
    return `${activeUni.short_name} Aggregate = JAMB (${(jambWeight * 100).toFixed(0)}%) + Post-UTME (${(postUtmeWeight * 100).toFixed(0)}%)` + 
      (olevelPointsSystem !== "none" ? ` + O'Level (${(olevelWeight * 100).toFixed(0)}%)` : "") + 
      (allowDoubleSitting ? " · Double sittings allowed" : " · Double sittings rejected");
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 mt-4 md:mt-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 flex items-center justify-center border border-[#2563EB]/30">
            <Calculator className="text-[#60A5FA]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white font-['Manrope']">Post-UTME Aggregate Calculator</h1>
            <p className="text-[#94A3B8] text-sm mt-0.5">Evaluate your admission eligibility dynamically based on target university formulas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
            <h2 className="text-white font-bold text-base border-b border-white/5 pb-3 flex items-center gap-2">
              <Building2 size={16} className="text-[#60A5FA]" />
              Step 1: Exam Credentials & School
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[#94A3B8] text-xs font-semibold block">Target University</label>
                <select
                  value={targetUniId}
                  onChange={(e) => setTargetUniId(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/5 focus:border-[#2563EB] rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all"
                >
                  <option value="">Select a university</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[#94A3B8] text-xs font-semibold block">JAMB Score (out of 400)</label>
                <input
                  type="number"
                  min="0"
                  max="400"
                  placeholder="e.g. 290"
                  value={jambScore}
                  onChange={(e) => setJambScore(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/5 focus:border-[#2563EB] rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#94A3B8] text-xs font-semibold block">
                  Post-UTME Mock Score (out of 100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 75"
                  value={postUtmeScore}
                  onChange={(e) => setPostUtmeScore(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/5 focus:border-[#2563EB] rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all"
                />
                {averageMockScore !== undefined && averageMockScore !== null && (
                  <span className="text-[10px] text-[#60A5FA] block mt-1">
                    🎯 Auto-loaded average practice score: {averageMockScore}%
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[#94A3B8] text-xs font-semibold block">Sitting Mode</label>
                <div className="flex bg-[#1E293B] p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setSittingMode("single")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${sittingMode === "single" ? "bg-[#2563EB] text-white" : "text-[#94A3B8] hover:text-white"}`}
                  >
                    Single Sitting
                  </button>
                  <button
                    onClick={() => {
                      if (!allowDoubleSitting) {
                        toast.error(`${activeUni?.short_name || "This university"} does not accept double sittings!`);
                        return;
                      }
                      setSittingMode("double");
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      !allowDoubleSitting ? "opacity-30 cursor-not-allowed" : ""
                    } ${sittingMode === "double" ? "bg-[#2563EB] text-white" : "text-[#94A3B8] hover:text-white"}`}
                  >
                    Double Sitting
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* O'Level Grade Inputs */}
          {activeUni && olevelPointsSystem !== "none" && (
            <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
              <h2 className="text-white font-bold text-base border-b border-white/5 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen size={16} className="text-[#22C55E]" />
                  Step 2: O'Level Grades (WAEC / NECO)
                </span>
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Points Calculator</span>
              </h2>

              {/* Sitting 1 Panel */}
              <div className="space-y-3">
                <h3 className="text-[#CBD5E1] text-xs font-bold uppercase tracking-wider">
                  {sittingMode === "double" ? "Sitting 1 (Exam Year 1)" : "Core Subject Grades"}
                </h3>
                <div className="space-y-2.5">
                  {sitting1.map((item, index) => (
                    <div key={`s1-${index}`} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-8">
                        <select
                          value={item.subject}
                          onChange={(e) => handleSittingChange(index, "subject", e.target.value, 1)}
                          className="w-full bg-[#1E293B] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none transition-all"
                        >
                          <option value="">-- Choose Subject --</option>
                          {SUBJECTS.map((sub, sIdx) => (
                            <option key={`sub1-${sIdx}`} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <select
                          value={item.grade}
                          onChange={(e) => handleSittingChange(index, "grade", e.target.value, 1)}
                          className="w-full bg-[#1E293B] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none transition-all"
                        >
                          {GRADES.map((g, gIdx) => (
                            <option key={`g1-${gIdx}`} value={g.grade}>{g.grade}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sitting 2 Panel */}
              {sittingMode === "double" && (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <h3 className="text-[#CBD5E1] text-xs font-bold uppercase tracking-wider">Sitting 2 (Exam Year 2)</h3>
                  <div className="space-y-2.5">
                    {sitting2.map((item, index) => (
                      <div key={`s2-${index}`} className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-8">
                          <select
                            value={item.subject}
                            onChange={(e) => handleSittingChange(index, "subject", e.target.value, 2)}
                            className="w-full bg-[#1E293B] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none transition-all"
                          >
                            <option value="">-- Choose Subject --</option>
                            {SUBJECTS.map((sub, sIdx) => (
                              <option key={`sub2-${sIdx}`} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <select
                            value={item.grade}
                            onChange={(e) => handleSittingChange(index, "grade", e.target.value, 2)}
                            className="w-full bg-[#1E293B] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none transition-all"
                          >
                            {GRADES.map((g, gIdx) => (
                              <option key={`g2-${gIdx}`} value={g.grade}>{g.grade}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Result Summary Card */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 bg-gradient-to-br from-[#0B3D91]/35 to-[#0F172A] border border-[#2563EB]/25 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#2563EB]/20 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-white font-extrabold text-lg mb-4 font-['Manrope']">Admission Evaluation</h2>

            {!activeUni ? (
              <div className="py-12 space-y-3">
                <AlertCircle className="mx-auto text-[#64748B]" size={36} />
                <p className="text-[#94A3B8] text-xs">Please select a target university to view calculations.</p>
              </div>
            ) : oLevelPoints === -1 ? (
              <div className="py-12 space-y-3">
                <AlertCircle className="mx-auto text-[#EF4444]" size={36} />
                <h3 className="text-white font-bold text-sm">Evaluation Error</h3>
                <p className="text-[#94A3B8] text-xs">UNILAG does not accept double sittings. Please switch to Single Sitting.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] text-[#60A5FA] font-bold uppercase tracking-widest mb-1">
                    {activeUni.name} Aggregate
                  </div>
                  <div className="text-white text-5xl font-black font-['Manrope'] mb-1">
                    {finalAggregate.toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">Target Cut-off score varies by department</span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#1E293B]/60 border border-white/5 rounded-2xl p-4 text-left">
                  <div>
                    <span className="text-[#94A3B8] text-[10px] uppercase font-bold block">O'Level Points</span>
                    <span className="text-white font-extrabold text-sm">
                      {olevelPointsSystem === "none"
                        ? "Not Used"
                        : `${oLevelPoints.toFixed(1)} / ${olevelPointsSystem === "unilag" ? "20.0" : "40.0"}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] text-[10px] uppercase font-bold block">JAMB (Weighted)</span>
                    <span className="text-white font-extrabold text-sm">
                      {jambScore ? `${((parseFloat(jambScore) / 400) * 100 * jambWeight).toFixed(2)} / ${(jambWeight * 100).toFixed(1)}` : "0.00"}
                    </span>
                  </div>
                </div>

                <div className="bg-[#1E293B]/30 border border-[#334155]/40 rounded-xl p-3.5 text-left text-xs leading-relaxed space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-[#22C55E] mt-0.5 shrink-0" />
                    <span className="text-[#CBD5E1]">
                      Formula: <strong className="text-white">{getUpgradeTip()}</strong>
                    </span>
                  </div>
                  {sittingMode === "double" && (
                    <div className="flex items-start gap-2 text-[#F59E0B]">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      <span>Note: Renders a penalty deduction on sittings index.</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <div className="text-[10px] text-[#64748B] uppercase font-bold mb-2 tracking-wider">Core Requirements Checked</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/20 text-[10px] px-2.5 py-1 rounded-full font-semibold">
                      Compulsory English A1-C6
                    </span>
                    <span className="bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/20 text-[10px] px-2.5 py-1 rounded-full font-semibold">
                      Compulsory Math A1-C6
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
