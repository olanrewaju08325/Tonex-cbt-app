import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Play, BookOpen, Clock, AlertTriangle, Building2, Crown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useSubjects } from "../../lib/hooks/useSubjects";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";

export function FullExamPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: allSubjects } = useSubjects();
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [numSubjects, setNumSubjects] = useState<number>(4);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!profile?.target_university_id) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.rpc("get_university_exam_config", { 
        p_university_id: profile.target_university_id 
      });
      
      if (!error && data?.config) {
        setConfig(data);
        const defaultNum = data.config.num_subjects || 4;
        setNumSubjects(defaultNum);
        // Pre-select compulsory subjects
        const compulsory = (data.subjects || []).filter((s: any) => s.is_compulsory).map((s: any) => s.subject_id);
        setSelectedSubjects(compulsory.slice(0, defaultNum));
      }
      setLoading(false);
    };
    
    fetchConfig();
  }, [profile]);

  const toggleSubject = (subjectId: string, isCompulsory: boolean) => {
    if (isCompulsory) {
      toast.error("This subject is compulsory for your university");
      return;
    }
    
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        if (prev.length >= numSubjects) {
          toast.error(`You can only select ${numSubjects} subjects`);
          return prev;
        }
        return [...prev, subjectId];
      }
    });
  };

  const handleStart = () => {
    if (selectedSubjects.length !== numSubjects) {
      toast.error(`Please select exactly ${numSubjects} subjects`);
      return;
    }
    
    const selectedSubjectNames = selectedSubjects.map(id => allSubjects?.find(s => s.id === id)?.name || "Unknown");

    navigate("/exam", {
      state: {
        subjects: selectedSubjects,
        subjectNames: selectedSubjectNames,
        university: profile?.target_university_id,
        mode: "full_exam",
        count: config?.config?.num_questions_per_subject || 20,
        timer: config?.config?.time_limit_minutes || 60,
      }
    });
  };

  if (!profile?.target_university_id) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center mt-20">
        <Building2 size={48} className="mx-auto text-[#64748B] mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No University Selected</h2>
        <p className="text-[#94A3B8] mb-6">You need to select your target university in your profile before you can take a full exam.</p>
        <button 
          onClick={() => navigate("/profile")}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-3 rounded-xl font-bold transition-all"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 max-w-2xl mx-auto"><Skeleton className="h-64 bg-[#1E293B] rounded-2xl w-full" /></div>;
  }

  if (!profile?.is_premium) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center mt-20 bg-[#0F172A] border border-white/5 rounded-2xl shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Crown size={30} className="text-[#F59E0B]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 font-['Manrope']">Premium Feature</h2>
        <p className="text-[#94A3B8] text-sm mb-6 max-w-md mx-auto leading-relaxed">
          Full CBT Exam simulations are only available to premium subscribers. Upgrade to get unlimited full exam practice, leaderboard access, and detailed analytics.
        </p>
        <button 
          onClick={() => navigate("/premium")}
          className="bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] text-white px-8 py-3.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
        >
          Upgrade to Premium
        </button>
      </div>
    );
  }

  if (!config?.config) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center mt-20">
        <AlertTriangle size={48} className="mx-auto text-[#F59E0B] mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Config Not Found</h2>
        <p className="text-[#94A3B8]">The admin hasn't configured the full exam for your university yet. Please practice individual subjects for now.</p>
      </div>
    );
  }

  const { time_limit_minutes, num_questions_per_subject } = config.config;
  const allowedSubjects = config.subjects || [];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8 mt-4 md:mt-0">
        <h1 className="text-2xl font-extrabold text-white font-['Manrope']">Full Exam Mode</h1>
        <p className="text-[#94A3B8] text-sm mt-1">Simulate the real Post-UTME experience for your university</p>
      </div>

      <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1E293B] rounded-xl p-4 text-center">
            <BookOpen size={20} className="mx-auto text-[#60A5FA] mb-2" />
            <div className="text-white font-bold text-lg">{numSubjects}</div>
            <div className="text-[#64748B] text-xs">Subjects Required</div>
          </div>
          <div className="bg-[#1E293B] rounded-xl p-4 text-center">
            <Clock size={20} className="mx-auto text-[#F59E0B] mb-2" />
            <div className="text-white font-bold text-lg">{time_limit_minutes}m</div>
            <div className="text-[#64748B] text-xs">Time Limit</div>
          </div>
          <div className="bg-[#1E293B] rounded-xl p-4 text-center">
            <AlertTriangle size={20} className="mx-auto text-[#22C55E] mb-2" />
            <div className="text-white font-bold text-lg">{num_questions_per_subject * numSubjects}</div>
            <div className="text-[#64748B] text-xs">Total Questions</div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-white font-bold mb-1">Select {numSubjects} Subjects</h3>
          <p className="text-[#94A3B8] text-xs">Compulsory subjects are pre-selected. Choose the remaining subjects to complete your combination.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {allSubjects?.map(sub => {
            const isSelected = selectedSubjects.includes(sub.id);
            const isCompulsory = allowedSubjects.find((as: any) => as.subject_id === sub.id)?.is_compulsory;
            
            return (
              <button
                key={sub.id}
                onClick={() => toggleSubject(sub.id, !!isCompulsory)}
                className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                  isSelected 
                    ? "bg-[#2563EB]/10 border-[#2563EB]/40 shadow-[0_0_15px_rgba(37,99,235,0.05)]" 
                    : "bg-[#1E293B] border-white/5 hover:border-white/10"
                }`}
              >
                <div>
                  <div className={`font-semibold ${isSelected ? "text-white" : "text-[#CBD5E1]"}`}>
                    {sub.name}
                  </div>
                  {isCompulsory && <div className="text-[#F59E0B] text-xs mt-0.5">Compulsory</div>}
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  isSelected ? "bg-[#2563EB] border-[#2563EB]" : "border-[#475569]"
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] hover:to-[#092c69] text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
        >
          <Play size={18} className="fill-white" />
          Start Full Exam
        </button>
      </div>
    </div>
  );
}
