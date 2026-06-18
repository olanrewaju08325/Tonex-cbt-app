import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, Copy, Share2, Trophy, Clock, CheckCircle, XCircle, Zap, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useSubjects } from "../../lib/hooks/useSubjects";
import { useQuery } from "@tanstack/react-query";

async function fetchMyChallenges(userId: string) {
  const { data } = await supabase
    .from("challenges")
    .select("*, subjects(name), challenge_results(user_id, score_percentage, profiles(full_name))")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

export function ChallengesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: subjects } = useSubjects();
  const [creating, setCreating] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);

  if (!profile?.is_premium) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center mt-20 bg-[#0F172A] border border-white/5 rounded-2xl shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Trophy size={30} className="text-[#F59E0B]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 font-['Manrope']">Premium Feature</h2>
        <p className="text-[#94A3B8] text-sm mb-6 max-w-md mx-auto leading-relaxed">
          Creating and competing in peer challenges is only available to premium subscribers. Upgrade now to invite friends and track scores in real-time.
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

  const { data: challenges, refetch } = useQuery({
    queryKey: ["myChallenges", profile?.id],
    queryFn: () => fetchMyChallenges(profile!.id),
    enabled: !!profile?.id,
  });

  const createChallenge = async () => {
    if (!subjectId) return toast.error("Please select a subject");
    setGenerating(true);
    // Fetch 10 random question IDs for the subject
    const { data: questions, error } = await supabase
      .from("questions")
      .select("id")
      .eq("subject_id", subjectId)
      .eq("is_published", true)
      .limit(50);

    if (error || !questions?.length) {
      toast.error("Not enough questions for this subject");
      setGenerating(false);
      return;
    }

    // Pick 10 random
    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, 10);
    const ids = shuffled.map((q: any) => q.id);

    const { data, error: insertError } = await supabase
      .from("challenges")
      .insert({ created_by: profile!.id, question_ids: ids, subject_id: subjectId })
      .select()
      .single();

    setGenerating(false);
    if (insertError) { toast.error(insertError.message); return; }
    const link = `${window.location.origin}/challenge/${data.id}`;
    setNewLink(link);
    setCreating(false);
    refetch();
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Challenge link copied!");
  };

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-['Manrope'] flex items-center gap-3">
            <Users className="text-[#7C3AED]" size={28} /> Peer Challenges
          </h1>
          <p className="text-[#64748B] text-sm">Create a 10-question challenge and share the link with friends to compete.</p>
        </motion.div>

        {/* How It Works Explainer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#0F172A] border border-white/6 rounded-2xl p-5 mb-6"
        >
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-[#7C3AED]" /> How Challenges Work
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#94A3B8]">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#7C3AED]/15 text-[#A78BFA] flex items-center justify-center shrink-0 font-bold">1</div>
              <div>
                <span className="text-white font-semibold block mb-0.5">Generate a Quiz</span>
                Select any subject to automatically assemble 10 random exam questions.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#2563EB]/15 text-[#60A5FA] flex items-center justify-center shrink-0 font-bold">2</div>
              <div>
                <span className="text-white font-semibold block mb-0.5">Share with Peers</span>
                Copy and share the unique invite link with friends, classmates, or study groups.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#22C55E]/15 text-[#4ADE80] flex items-center justify-center shrink-0 font-bold">3</div>
              <div>
                <span className="text-white font-semibold block mb-0.5">Track Leaderboards</span>
                Compare scores in real-time as participants complete the challenge. Limit 1 attempt.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Create Challenge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-[#7C3AED]/20 to-[#2563EB]/20 border border-[#7C3AED]/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
              <Zap size={20} className="text-[#A78BFA]" />
            </div>
            <div>
              <div className="text-white font-bold">Challenge a Friend</div>
              <div className="text-[#64748B] text-xs">Pick a subject, share the link, see who wins</div>
            </div>
            <button onClick={() => setCreating(true)}
              className="ml-auto bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
              <Share2 size={14} /> New Challenge
            </button>
          </div>
          {newLink && (
            <div className="bg-[#0B1829] border border-[#7C3AED]/30 rounded-xl p-3 flex items-center gap-3">
              <span className="text-[#A78BFA] text-xs flex-1 truncate">{newLink}</span>
              <button onClick={() => copyLink(newLink)}
                className="shrink-0 bg-[#7C3AED]/20 text-[#A78BFA] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#7C3AED]/30 transition-all flex items-center gap-1.5">
                <Copy size={12} /> Copy
              </button>
            </div>
          )}
        </motion.div>

        {/* Challenges list */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-white font-bold mb-3">Your Challenges</h2>
          {!challenges?.length ? (
            <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-10 text-center">
              <Trophy size={36} className="text-[#475569] mx-auto mb-3" />
              <p className="text-[#64748B] text-sm">No challenges yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((ch: any) => {
                const results = ch.challenge_results || [];
                const myResult = results.find((r: any) => r.user_id === profile?.id);
                const link = `${window.location.origin}/challenge/${ch.id}`;
                return (
                  <div key={ch.id} className="bg-[#0F172A] border border-white/6 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center">
                        <Users size={16} className="text-[#A78BFA]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-semibold">{ch.subjects?.name || "Challenge"}</div>
                        <div className="text-[#475569] text-xs flex items-center gap-1">
                          <Clock size={10} /> {new Date(ch.created_at).toLocaleDateString()} · {results.length} participant{results.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <button onClick={() => copyLink(link)} title="Copy Link"
                        className="p-2 rounded-lg bg-[#1E293B] text-[#64748B] hover:text-[#A78BFA] transition-all">
                        <Copy size={14} />
                      </button>
                    </div>
                    {results.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {results.sort((a: any, b: any) => b.score_percentage - a.score_percentage).map((r: any, i: number) => (
                          <div key={r.user_id} className={`flex items-center gap-2 p-2 rounded-lg ${r.user_id === profile?.id ? "bg-[#7C3AED]/10 border border-[#7C3AED]/20" : "bg-[#1E293B]/50"}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${i === 0 ? "bg-[#F59E0B] text-white" : "bg-[#1E293B] text-[#64748B]"}`}>{i + 1}</span>
                            <span className="text-[#94A3B8] text-xs flex-1">{r.profiles?.full_name || "Unknown"}{r.user_id === profile?.id ? " (You)" : ""}</span>
                            <span className={`text-xs font-bold ${r.score_percentage >= 70 ? "text-[#22C55E]" : r.score_percentage >= 50 ? "text-[#F59E0B]" : "text-[#EF4444]"}`}>
                              {Math.round(r.score_percentage)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!myResult && (
                      <button onClick={() => navigate(`/challenge/${ch.id}`)}
                        className="mt-3 w-full bg-[#7C3AED]/15 hover:bg-[#7C3AED]/25 text-[#A78BFA] text-sm font-semibold py-2 rounded-xl transition-all flex items-center justify-center gap-2">
                        Take Your Attempt <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {creating && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50" onClick={() => setCreating(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4">
              <div className="bg-[#0B1829] border border-white/10 rounded-2xl p-7 max-w-sm w-full shadow-2xl">
                <h3 className="text-white font-bold text-lg mb-5">New Challenge</h3>
                <label className="block text-[#94A3B8] text-xs font-semibold mb-2">Select Subject</label>
                <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-3 text-white text-sm mb-5 focus:outline-none"
                  title="Select Subject">
                  <option value="">Choose a subject…</option>
                  {subjects?.map(s => <option key={s.id} value={s.id} className="bg-[#1E293B]">{s.name}</option>)}
                </select>
                <div className="flex gap-3">
                  <button onClick={() => setCreating(false)} className="flex-1 bg-[#1E293B] text-[#94A3B8] font-semibold py-3 rounded-xl text-sm">Cancel</button>
                  <button onClick={createChallenge} disabled={generating}
                    className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Zap size={14} /> Generate</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
