import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, Trophy } from "lucide-react";

export function ChallengeAttemptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [challenge, setChallenge] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function fetchChallenge() {
      if (!id || !profile) return;
      
      // 1. Check if user already attempted
      const { data: existingResult } = await supabase
        .from("challenge_results")
        .select("*")
        .eq("challenge_id", id)
        .eq("user_id", profile.id)
        .single();
        
      if (existingResult) {
        setSubmitted(true);
        setScore(existingResult.score_percentage);
      }

      // 2. Fetch challenge
      const { data: chData, error: chError } = await supabase
        .from("challenges")
        .select("*, subjects(name)")
        .eq("id", id)
        .single();
        
      if (chError || !chData) {
        toast.error("Challenge not found");
        navigate("/challenges");
        return;
      }
      
      setChallenge(chData);

      // 3. Fetch questions
      const { data: qData } = await supabase
        .from("questions")
        .select("id, text, option_a, option_b, option_c, option_d, correct_option, correct_answer")
        .in("id", chData.question_ids);
        
      if (qData) {
        // Reorder questions to match the array order or just use them
        setQuestions(qData);
      }
      
      setLoading(false);
    }
    
    fetchChallenge();
  }, [id, profile, navigate]);

  const handleSelect = (qId: string, option: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const submitChallenge = async () => {
    if (Object.keys(answers).length < questions.length) {
      if (!confirm("You have unanswered questions. Submit anyway?")) return;
    }

    let correctCount = 0;
    questions.forEach(q => {
      const correctAns = q.correct_option || q.correct_answer;
      if (answers[q.id] === correctAns) correctCount++;
    });

    const percentage = (correctCount / questions.length) * 100;
    setScore(percentage);
    setSubmitted(true);

    const { error } = await supabase.from("challenge_results").insert({
      challenge_id: id,
      user_id: profile!.id,
      score_percentage: percentage
    });

    if (error) {
      toast.error("Failed to save result: " + error.message);
    } else {
      toast.success("Challenge completed! Score: " + percentage.toFixed(0) + "%");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#08142D] text-white flex justify-center items-center">Loading challenge...</div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#08142D] px-4 py-12 flex justify-center items-center">
        <div className="bg-[#0B1829] border border-[#7C3AED]/30 rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#7C3AED]/20 flex items-center justify-center mx-auto mb-6">
            <Trophy size={40} className="text-[#A78BFA]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Challenge Complete!</h1>
          <p className="text-[#94A3B8] mb-8">You scored</p>
          <div className="text-6xl font-black text-[#A78BFA] mb-8">{Math.round(score)}%</div>
          <button onClick={() => navigate("/challenges")} className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-3.5 rounded-xl transition-all">
            Back to Challenges
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Peer Challenge</h1>
            <div className="text-[#A78BFA] text-sm">{challenge?.subjects?.name}</div>
          </div>
          <div className="bg-[#1E293B] border border-white/10 px-4 py-2 rounded-xl text-white font-bold">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>

        {currentQ && (
          <div className="bg-[#0B1829] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-lg sm:text-xl text-white font-semibold mb-8 leading-relaxed">
              {currentQ.text}
            </h2>

            <div className="space-y-3">
              {(["A", "B", "C", "D"] as const).map(opt => {
                const optKey = `option_${opt.toLowerCase()}` as keyof typeof currentQ;
                if (!currentQ[optKey]) return null;
                
                const isSelected = answers[currentQ.id] === opt;
                
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(currentQ.id, opt)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                      isSelected ? "bg-[#7C3AED]/20 border-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.15)]" : "bg-[#1E293B]/50 border-transparent hover:border-white/10 hover:bg-[#1E293B]"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      isSelected ? "bg-[#7C3AED] text-white" : "bg-[#0F172A] text-[#94A3B8]"
                    }`}>
                      {opt}
                    </div>
                    <span className={`text-sm sm:text-base ${isSelected ? "text-white font-medium" : "text-[#94A3B8]"}`}>
                      {currentQ[optKey]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-6 py-3 rounded-xl font-bold text-white bg-[#1E293B] hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          {currentIndex === questions.length - 1 ? (
            <button
              onClick={submitChallenge}
              className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:-translate-y-0.5 transition-all shadow-lg shadow-green-500/20"
            >
              Submit Challenge
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="px-6 py-3 rounded-xl font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
            >
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
