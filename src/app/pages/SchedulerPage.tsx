import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Plus, Trash2, Clock, BookOpen, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useSubjects } from "../../lib/hooks/useSubjects";
import { useQuery, useQueryClient } from "@tanstack/react-query";

async function fetchSchedules(userId: string) {
  const { data } = await supabase
    .from("exam_schedules")
    .select("*, subjects(name)")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true });
  return data || [];
}

function getDaysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 3600 * 24));
}

export function SchedulerPage() {
  const { profile } = useAuth();
  const { data: subjects } = useSubjects();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", subject_id: "", scheduled_at: "" });
  const [saving, setSaving] = useState(false);

  const { data: schedules } = useQuery({
    queryKey: ["examSchedules", profile?.id],
    queryFn: () => fetchSchedules(profile!.id),
    enabled: !!profile?.id,
  });

  const upcoming = schedules?.filter(s => new Date(s.scheduled_at) >= new Date()) || [];
  const past = schedules?.filter(s => new Date(s.scheduled_at) < new Date()) || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.scheduled_at) return toast.error("Title and date are required");
    setSaving(true);
    const { error } = await supabase.from("exam_schedules").insert({
      user_id: profile!.id,
      title: form.title,
      subject_id: form.subject_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Exam scheduled!");
    setShowAdd(false);
    setForm({ title: "", subject_id: "", scheduled_at: "" });
    qc.invalidateQueries({ queryKey: ["examSchedules"] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("exam_schedules").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Schedule removed"); qc.invalidateQueries({ queryKey: ["examSchedules"] }); }
  };

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-['Manrope'] flex items-center gap-3">
                <Calendar className="text-[#22C55E]" size={28} /> Exam Timetable
              </h1>
              <p className="text-[#64748B] text-sm">Plan mock sessions, schedule real Post-UTME target dates, and get countdown status alerts to stay ahead.</p>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-500/20">
              <Plus size={14} /> Schedule
            </button>
          </div>
        </motion.div>

        {/* Upcoming */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <h2 className="text-white font-bold mb-3 flex items-center gap-2">
            <Bell size={16} className="text-[#22C55E]" /> Upcoming ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-10 text-center">
              <Calendar size={36} className="text-[#475569] mx-auto mb-3" />
              <p className="text-[#64748B] text-sm">No upcoming exams scheduled.</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-[#22C55E] text-sm font-semibold hover:underline">Schedule one now →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(s => {
                const days = getDaysUntil(s.scheduled_at);
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className={`bg-[#0F172A] border rounded-2xl p-4 flex items-center gap-4 ${days <= 1 ? "border-[#EF4444]/30 bg-[#EF4444]/5" : days <= 3 ? "border-[#F59E0B]/30 bg-[#F59E0B]/5" : "border-white/6"}`}>
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-white ${days <= 1 ? "bg-[#EF4444]/20" : days <= 3 ? "bg-[#F59E0B]/20" : "bg-[#22C55E]/15"}`}>
                      <span className="text-lg font-black leading-none">{days <= 0 ? "!" : days}</span>
                      <span className="text-[9px] font-semibold uppercase opacity-70">{days <= 0 ? "Today" : "days"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm">{s.title}</div>
                      <div className="text-[#64748B] text-xs flex items-center gap-2 mt-0.5">
                        {s.subjects?.name && <><BookOpen size={10} /> {s.subjects.name} ·</>}
                        <Clock size={10} /> {new Date(s.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(s.id)} title="Remove Schedule"
                      className="p-2 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all">
                      <Trash2 size={15} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Past */}
        {past.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-[#475569] font-bold mb-3 text-sm uppercase tracking-wider">Past</h2>
            <div className="space-y-2 opacity-50">
              {past.map(s => (
                <div key={s.id} className="bg-[#0F172A] border border-white/4 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center shrink-0">
                    <Calendar size={14} className="text-[#475569]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#64748B] text-sm">{s.title}</div>
                    <div className="text-[#475569] text-xs">{new Date(s.scheduled_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => handleDelete(s.id)} title="Remove" className="p-1.5 text-[#475569] hover:text-[#EF4444] transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowAdd(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4">
              <div className="bg-[#0B1829] border border-white/10 rounded-2xl p-7 max-w-sm w-full shadow-2xl">
                <h3 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <Calendar size={18} className="text-[#22C55E]" /> Schedule Exam
                </h3>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Exam Title *</label>
                    <input type="text" required placeholder="e.g. UNILAG Post UTME Mock" value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#22C55E]/40" />
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Subject (Optional)</label>
                    <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                      title="Select Subject">
                      <option value="">All Subjects</option>
                      {subjects?.map(s => <option key={s.id} value={s.id} className="bg-[#1E293B]">{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Date & Time *</label>
                    <input type="datetime-local" required value={form.scheduled_at}
                      onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#22C55E]/40" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-[#1E293B] text-[#94A3B8] font-semibold py-3 rounded-xl text-sm">Cancel</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                      {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Calendar size={14} /> Save</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
