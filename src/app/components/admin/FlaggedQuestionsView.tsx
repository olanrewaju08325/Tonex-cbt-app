import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Flag, CheckCircle, X, Eye, AlertTriangle } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";

async function fetchFlags() {
  const { data, error } = await supabase
    .from("question_flags")
    .select("*, questions(text, option_a, option_b, option_c, option_d, correct_option), profiles(full_name, email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  reviewed: "bg-[#2563EB]/15 text-[#60A5FA] border-[#2563EB]/30",
  fixed: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
  dismissed: "bg-[#1E293B] text-[#64748B] border-white/5",
};

export function FlaggedQuestionsView() {
  const qc = useQueryClient();
  const { data: flags, isLoading } = useQuery({ queryKey: ["questionFlags"], queryFn: fetchFlags });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [editedA, setEditedA] = useState("");
  const [editedB, setEditedB] = useState("");
  const [editedC, setEditedC] = useState("");
  const [editedD, setEditedD] = useState("");
  const [editedCorrect, setEditedCorrect] = useState("");

  const startEditing = (flag: any) => {
    setIsEditing(true);
    setEditedText(flag.questions?.text || "");
    setEditedA(flag.questions?.option_a || "");
    setEditedB(flag.questions?.option_b || "");
    setEditedC(flag.questions?.option_c || "");
    setEditedD(flag.questions?.option_d || "");
    setEditedCorrect(flag.questions?.correct_option || flag.questions?.correct_answer || "A");
  };

  const saveAndMarkFixed = async (flag: any) => {
    if (!editedText.trim()) return toast.error("Question text cannot be empty.");
    if (!editedA.trim() || !editedB.trim() || !editedC.trim() || !editedD.trim()) {
      return toast.error("All options must be filled.");
    }

    setUpdating(true);
    try {
      // 1. Update the actual question
      const { error: qError } = await supabase
        .from("questions")
        .update({
          text: editedText,
          option_a: editedA,
          option_b: editedB,
          option_c: editedC,
          option_d: editedD,
          correct_option: editedCorrect,
        })
        .eq("id", flag.question_id);

      if (qError) throw qError;

      // 2. Mark the flag as fixed
      const { error: fError } = await supabase
        .from("question_flags")
        .update({
          status: "fixed",
          admin_note: adminNote ? `[Inline Edit] ${adminNote}` : "[Inline Edit] Question corrected by admin."
        })
        .eq("id", flag.id);

      if (fError) throw fError;

      toast.success("Question successfully corrected and flag marked as fixed!");
      setExpanded(null);
      setIsEditing(false);
      setAdminNote("");
      qc.invalidateQueries({ queryKey: ["questionFlags"] });
    } catch (e: any) {
      toast.error(`Correction failed: ${e.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const updateFlag = async (id: string, status: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("question_flags")
      .update({ status, admin_note: adminNote || null })
      .eq("id", id);
    setUpdating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Flag marked as ${status}`);
    setExpanded(null);
    setAdminNote("");
    qc.invalidateQueries({ queryKey: ["questionFlags"] });
  };

  const pendingCount = flags?.filter(f => f.status === "pending").length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-white font-bold text-lg flex-1 flex items-center gap-2">
          <Flag size={20} className="text-[#F59E0B]" /> Flagged Questions
        </h2>
        {pendingCount > 0 && (
          <span className="bg-[#F59E0B]/15 text-[#F59E0B] text-xs font-bold px-3 py-1 rounded-full border border-[#F59E0B]/30">
            {pendingCount} Pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-[#0F1F35]" />)}</div>
      ) : flags?.length === 0 ? (
        <div className="bg-[#0F1F35] border border-white/5 rounded-2xl p-12 text-center">
          <CheckCircle size={40} className="text-[#22C55E] mx-auto mb-3" />
          <p className="text-white font-semibold">No flagged questions</p>
          <p className="text-[#64748B] text-sm">Great job! All content looks clean.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags?.map((flag: any) => (
            <div key={flag.id} className="bg-[#0F1F35] border border-white/5 rounded-xl overflow-hidden">
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[flag.status]}`}>
                      {flag.status}
                    </span>
                    <span className="text-[#475569] text-xs">
                      by {flag.profiles?.full_name || flag.profiles?.email || "Unknown"} · {new Date(flag.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[#94A3B8] text-sm line-clamp-2">{flag.questions?.text}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[#EF4444] text-xs">
                    <AlertTriangle size={11} />
                    <span className="font-semibold">Reason:</span> {flag.reason}
                  </div>
                </div>
                {flag.status === "pending" && (
                  <button
                    onClick={() => {
                      if (expanded === flag.id) {
                        setExpanded(null);
                        setIsEditing(false);
                      } else {
                        setExpanded(flag.id);
                        setIsEditing(false);
                      }
                    }}
                    className="shrink-0 p-2 rounded-lg bg-[#1E293B] text-[#475569] hover:text-white transition-all"
                    title="Review Flag"
                  >
                    <Eye size={16} />
                  </button>
                )}
              </div>

              {expanded === flag.id && (
                <div className="border-t border-white/5 p-4 bg-[#0B1829] space-y-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Question Text</label>
                        <textarea
                          value={editedText}
                          onChange={e => setEditedText(e.target.value)}
                          className="w-full h-24 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Option A</label>
                          <input
                            type="text"
                            value={editedA}
                            onChange={e => setEditedA(e.target.value)}
                            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Option B</label>
                          <input
                            type="text"
                            value={editedB}
                            onChange={e => setEditedB(e.target.value)}
                            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Option C</label>
                          <input
                            type="text"
                            value={editedC}
                            onChange={e => setEditedC(e.target.value)}
                            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Option D</label>
                          <input
                            type="text"
                            value={editedD}
                            onChange={e => setEditedD(e.target.value)}
                            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="w-1/3">
                        <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Correct Answer</label>
                        <select
                          value={editedCorrect}
                          onChange={e => setEditedCorrect(e.target.value)}
                          className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-white text-sm font-medium">{flag.questions?.text}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {["A", "B", "C", "D"].map((l, i) => {
                          const key = `option_${l.toLowerCase()}` as any;
                          const opt = flag.questions?.[key];
                          if (!opt) return null;
                          const isCorrect = l === flag.questions?.correct_option;
                          return (
                            <div key={l} className={`p-2 rounded-lg border ${isCorrect ? "border-[#22C55E]/30 text-[#22C55E]" : "border-white/5 text-[#94A3B8]"}`}>
                              <span className="font-bold mr-1">{l}.</span>{opt}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-[#64748B] text-[10px] font-bold uppercase block">Resolution Notes</label>
                    <textarea
                      placeholder="Describe what was fixed (or general review summary)..."
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      className="w-full h-16 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveAndMarkFixed(flag)}
                          disabled={updating}
                          className="flex-1 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:opacity-95 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                        >
                          Save Changes & Mark Fixed
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          disabled={updating}
                          className="bg-[#1E293B] text-[#64748B] hover:text-white border border-white/5 font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(flag)}
                          disabled={updating}
                          className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                        >
                          ✏ Edit Question Inline
                        </button>
                        <button
                          onClick={() => updateFlag(flag.id, "reviewed")}
                          disabled={updating}
                          className="bg-[#2563EB]/15 text-[#60A5FA] font-bold px-4 py-2.5 rounded-xl text-sm border border-[#2563EB]/30 transition-all disabled:opacity-50"
                        >
                          Mark Reviewed
                        </button>
                        <button
                          onClick={() => updateFlag(flag.id, "dismissed")}
                          disabled={updating}
                          className="bg-[#1E293B] text-[#64748B] font-bold px-4 py-2.5 rounded-xl text-sm border border-white/5 transition-all disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
