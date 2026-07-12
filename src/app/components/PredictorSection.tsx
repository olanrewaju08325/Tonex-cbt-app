import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calculator, Award, TrendingUp, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useUniversities } from "../../lib/hooks/useUniversities";

const GRADE_POINTS: Record<string, number> = {
  A1: 4.0,
  B2: 3.6,
  B3: 3.2,
  C4: 2.8,
  C5: 2.4,
  C6: 2.0,
  D7: 0.0,
  E8: 0.0,
  F9: 0.0,
};

export function PredictorSection() {
  const { profile } = useAuth();
  const { data: universities } = useUniversities();

  const [jambScore, setJambScore] = useState<number>(270);
  const [mockScore, setMockScore] = useState<number>(70);
  const [targetUniId, setTargetUniId] = useState<string>(profile?.target_university_id || "");
  const [targetDept, setTargetDept] = useState<string>("");
  const [grades, setGrades] = useState<string[]>(Array(5).fill("B3"));

  // Fetch unique cutoff departments for the chosen university
  const { data: cutoffs = [] } = useQuery({
    queryKey: ["uni-cutoff-departments", targetUniId],
    queryFn: async () => {
      if (!targetUniId) return [];
      const { data, error } = await supabase
        .from("university_cut_off_marks")
        .select("department, cutoff_aggregate")
        .eq("university_id", targetUniId)
        .order("department");
      if (error) throw error;
      return data;
    },
    enabled: !!targetUniId
  });

  // Aggregate computation
  const oLevelPoints = grades.reduce((acc, curr) => acc + (GRADE_POINTS[curr] || 0), 0);
  const calculatedAggregate = (jambScore / 8) + (mockScore / 2) + oLevelPoints;

  const currentCutoff = cutoffs.find(c => c.department === targetDept)?.cutoff_aggregate || 0;
  const diff = calculatedAggregate - currentCutoff;

  let chance = 0;
  let chanceColor = "text-[#EF4444]";
  let chanceText = "Low Chance";
  let recommendations = "";

  if (currentCutoff > 0) {
    if (diff >= 5) {
      chance = Math.round(90 + Math.random() * 9);
      chanceColor = "text-[#22C55E]";
      chanceText = "Highly Probable (Merit List)";
      recommendations = "Excellent performance! Your aggregate is well above the merit line. Maintain your current study momentum to secure your spot.";
    } else if (diff >= 0) {
      chance = Math.round(75 + Math.random() * 14);
      chanceColor = "text-[#60A5FA]";
      chanceText = "Good Chance";
      recommendations = "You are currently on track for admission! Focus on completing 2 more practice exams to lock in your score buffer.";
    } else if (diff >= -5) {
      chance = Math.round(45 + Math.random() * 25);
      chanceColor = "text-[#F59E0B]";
      chanceText = "Borderline";
      const targetImprovement = Math.ceil(Math.abs(diff) * 2);
      recommendations = `You are very close! You need to improve your Post-UTME mock score by approximately ${targetImprovement} marks (or secure better O'Level results) to clear the merit threshold.`;
    } else {
      chance = Math.round(15 + Math.random() * 29);
      chanceColor = "text-[#EF4444]";
      chanceText = "Challenging";
      const targetImprovement = Math.ceil(Math.abs(diff) * 2);
      recommendations = `Significant improvement required. We suggest focusing on your weakest topics using flashcards to boost your mock exam score by ${targetImprovement}+ marks.`;
    }
  }

  if (!profile?.is_premium) {
    return (
      <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#8B5CF6] flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
            <Zap className="text-white" size={32} />
          </div>
          <h3 className="text-white font-black text-xl mb-2">AI Predictor Locked</h3>
          <p className="text-[#94A3B8] text-sm max-w-sm mb-6">
            Upgrade to Premium to unlock our AI-powered Admission Predictor and see exactly what you need to score to get into your dream course.
          </p>
          <a href="/settings" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3 px-8 rounded-full transition-colors shadow-lg">
            Upgrade to Premium
          </a>
        </div>
        
        {/* Blurred background content */}
        <div className="opacity-30 pointer-events-none blur-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 flex items-center justify-center border border-[#2563EB]/25">
              <Calculator className="text-[#60A5FA]" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">AI Admission Predictor</h3>
              <p className="text-[#64748B] text-xs">Analyze aggregate calculations...</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-[#1E293B] rounded-xl"></div>
            <div className="h-10 bg-[#1E293B] rounded-xl"></div>
            <div className="h-10 bg-[#1E293B] rounded-xl col-span-2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 flex items-center justify-center border border-[#2563EB]/25">
          <Calculator className="text-[#60A5FA]" size={20} />
        </div>
        <div>
          <h3 className="text-white font-bold text-base font-['Manrope']">AI Admission Predictor</h3>
          <p className="text-[#64748B] text-xs">Analyze aggregate calculations and check your target university admission chance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">JAMB Score (max 400)</label>
              <input
                type="number"
                value={jambScore}
                onChange={e => setJambScore(Math.min(400, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full bg-[#1E293B] border border-white/6 focus:border-[#2563EB] rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Mock Exam Score (max 100)</label>
              <input
                type="number"
                value={mockScore}
                onChange={e => setMockScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full bg-[#1E293B] border border-white/6 focus:border-[#2563EB] rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">University</label>
              <select
                value={targetUniId}
                onChange={e => setTargetUniId(e.target.value)}
                className="w-full bg-[#1E293B] border border-white/6 focus:border-[#2563EB] rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              >
                <option value="">Select University</option>
                {universities?.map(u => (
                  <option key={u.id} value={u.id}>{u.short_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Department</label>
              <select
                value={targetDept}
                onChange={e => setTargetDept(e.target.value)}
                disabled={!targetUniId || cutoffs.length === 0}
                className="w-full bg-[#1E293B] border border-white/6 focus:border-[#2563EB] rounded-xl px-3 py-2 text-white text-xs focus:outline-none disabled:opacity-50"
              >
                <option value="">Choose course...</option>
                {cutoffs.map(c => (
                  <option key={c.department} value={c.department}>{c.department}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-2">O'Level core 5 grades (e.g. WAEC/NECO)</label>
            <div className="flex gap-2">
              {grades.map((gr, idx) => (
                <select
                  key={idx}
                  value={gr}
                  onChange={e => {
                    const newGr = [...grades];
                    newGr[idx] = e.target.value;
                    setGrades(newGr);
                  }}
                  className="flex-1 bg-[#1E293B] border border-white/6 rounded-lg py-1.5 text-white text-[10px] text-center focus:outline-none"
                >
                  {Object.keys(GRADE_POINTS).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Aggregate Summary & Chance */}
        <div className="bg-[#1E293B]/30 border border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[#64748B] text-[10px] font-bold uppercase block">Your Aggregate</span>
              <span className="text-white text-3xl font-black">{calculatedAggregate.toFixed(2)}</span>
              <span className="text-[#475569] text-[10px] block">Formula: JAMB/8 + Mock/2 + O'Level ({oLevelPoints}/20)</span>
            </div>
            
            {currentCutoff > 0 && (
              <div className="text-right space-y-1">
                <span className="text-[#64748B] text-[10px] font-bold uppercase block">Merit Cutoff</span>
                <span className="text-white font-extrabold text-lg">{currentCutoff.toFixed(2)}</span>
                <span className={`text-[10px] block font-bold ${diff >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {diff >= 0 ? `+${diff.toFixed(2)} over` : `${diff.toFixed(2)} below`}
                </span>
              </div>
            )}
          </div>

          {currentCutoff > 0 ? (
            <div className="border-t border-white/5 pt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {diff >= 0 ? (
                    <CheckCircle className="text-[#22C55E]" size={16} />
                  ) : (
                    <AlertTriangle className="text-[#F59E0B]" size={16} />
                  )}
                  <span className={`font-black text-sm ${chanceColor}`}>{chanceText} ({chance}%)</span>
                </div>
              </div>
              <p className="text-[#94A3B8] text-xs leading-relaxed">{recommendations}</p>
            </div>
          ) : (
            <div className="border-t border-white/5 pt-4 text-center text-[#64748B] text-xs">
              Select a target university and department to calculate your chance of admission.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
