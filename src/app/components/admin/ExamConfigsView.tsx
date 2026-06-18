import { useState, useEffect } from "react";
import { Save, AlertTriangle, Building2, BookOpen } from "lucide-react";
import { supabase, adminSupabase } from "../../../lib/supabase";
import { useUniversities } from "../../../lib/hooks/useUniversities";
import { useSubjects } from "../../../lib/hooks/useSubjects";
import { toast } from "sonner";
import { Skeleton } from "../../components/ui/skeleton";

export function ExamConfigsView() {
  const { data: universities, isLoading: unisLoading } = useUniversities();
  const { data: subjects, isLoading: subsLoading } = useSubjects();
  const [selectedUni, setSelectedUni] = useState<string>("");
  const [config, setConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [numSubjects, setNumSubjects] = useState(4);
  const [numQuestions, setNumQuestions] = useState(20);
  const [timeLimit, setTimeLimit] = useState(60);
  const [allowedSubjects, setAllowedSubjects] = useState<{id: string, isCompulsory: boolean}[]>([]);

  useEffect(() => {
    if (!selectedUni) return;
    const fetchConfig = async () => {
      setLoadingConfig(true);
      const { data, error } = await supabase.rpc("get_university_exam_config", { p_university_id: selectedUni });
      if (!error && data?.config) {
        setConfig(data);
        setNumSubjects(data.config.num_subjects || 4);
        setNumQuestions(data.config.num_questions_per_subject || 20);
        setTimeLimit(data.config.time_limit_minutes || 60);
        setAllowedSubjects(data.subjects?.map((s: any) => ({ id: s.subject_id, isCompulsory: s.is_compulsory })) || []);
      } else {
        setConfig(null);
        setNumSubjects(4);
        setNumQuestions(20);
        setTimeLimit(60);
        setAllowedSubjects([]);
      }
      setLoadingConfig(false);
    };
    fetchConfig();
  }, [selectedUni]);

  const handleSave = async () => {
    if (!selectedUni) return;
    setSaving(true);
    
    try {
      // 1. Upsert config
      let configId = config?.config?.id;
      if (!configId) {
        const { data: newConfig, error: insertError } = await adminSupabase
          .from("university_exam_configs")
          .insert({
            university_id: selectedUni,
            num_subjects: numSubjects,
            num_questions_per_subject: numQuestions,
            time_limit_minutes: timeLimit
          }).select().single();
        if (insertError) throw insertError;
        configId = newConfig.id;
      } else {
        const { error: updateError } = await adminSupabase
          .from("university_exam_configs")
          .update({
            num_subjects: numSubjects,
            num_questions_per_subject: numQuestions,
            time_limit_minutes: timeLimit
          }).eq("id", configId);
        if (updateError) throw updateError;
      }

      // 2. Delete old subjects
      await adminSupabase.from("university_exam_config_subjects").delete().eq("config_id", configId);

      // 3. Insert new subjects
      if (allowedSubjects.length > 0) {
        const subsToInsert = allowedSubjects.map(s => ({
          config_id: configId,
          subject_id: s.id,
          is_compulsory: s.isCompulsory
        }));
        const { error: subsError } = await adminSupabase.from("university_exam_config_subjects").insert(subsToInsert);
        if (subsError) throw subsError;
      }

      toast.success("Exam configuration saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setAllowedSubjects(prev => {
      const exists = prev.find(s => s.id === subjectId);
      if (exists) return prev.filter(s => s.id !== subjectId);
      return [...prev, { id: subjectId, isCompulsory: false }];
    });
  };

  const toggleCompulsory = (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAllowedSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, isCompulsory: !s.isCompulsory } : s));
  };

  if (unisLoading || subsLoading) return <Skeleton className="h-96 w-full bg-[#0F1F35] rounded-xl" />;

  return (
    <div className="bg-[#0F1F35] border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <BookOpen className="text-[#A855F7]" size={20} /> University Exam Configs
        </h2>
      </div>

      <div className="mb-8">
        <label className="block text-[#94A3B8] text-xs font-semibold mb-2">Select University to Configure</label>
        <select
          value={selectedUni}
          onChange={(e) => setSelectedUni(e.target.value)}
          className="w-full max-w-md bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
          title="Select University"
        >
          <option value="">-- Choose a university --</option>
          {universities?.map(uni => (
            <option key={uni.id} value={uni.id}>{uni.name} ({uni.short_name})</option>
          ))}
        </select>
      </div>

      {selectedUni && (
        loadingConfig ? <Skeleton className="h-64 bg-[#1E293B] rounded-xl" /> :
        <div className="space-y-6 border-t border-white/5 pt-6">
          {!config?.config && (
            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="text-[#F59E0B] shrink-0" size={20} />
              <div>
                <div className="text-[#F59E0B] font-bold text-sm">No Configuration Found</div>
                <div className="text-[#F59E0B]/70 text-xs mt-0.5">This university does not have a specific exam configuration yet. A default one will be created when you save.</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2">Total Subjects</label>
              <input type="number" value={numSubjects} onChange={e => setNumSubjects(parseInt(e.target.value))} className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm" title="Total Subjects" placeholder="Total Subjects" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2">Questions per Subject</label>
              <input type="number" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm" title="Questions per Subject" placeholder="Questions per Subject" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2">Time Limit (mins)</label>
              <input type="number" value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))} className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm" title="Time Limit" placeholder="Time Limit" />
            </div>
          </div>

          <div>
            <label className="block text-[#94A3B8] text-xs font-semibold mb-3">Allowed Subjects (Select which subjects are available/compulsory)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2">
              {subjects?.map(sub => {
                const isSelected = allowedSubjects.some(s => s.id === sub.id);
                const isCompulsory = allowedSubjects.find(s => s.id === sub.id)?.isCompulsory;
                
                return (
                  <div key={sub.id} className={`p-3 rounded-xl border text-sm transition-all cursor-pointer ${isSelected ? 'bg-[#2563EB]/10 border-[#2563EB]/40' : 'bg-[#1E293B] border-white/5 hover:border-white/10'}`} onClick={() => toggleSubject(sub.id)}>
                    <div className={`font-semibold mb-2 ${isSelected ? 'text-white' : 'text-[#94A3B8]'}`}>{sub.name}</div>
                    {isSelected && (
                      <button onClick={(e) => toggleCompulsory(sub.id, e)} className={`text-xs px-2 py-1 rounded transition-colors ${isCompulsory ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#1E293B] text-[#64748B] hover:text-white'}`}>
                        {isCompulsory ? "Compulsory" : "Make Compulsory"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 mt-4">
            <Save size={16} /> {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      )}
    </div>
  );
}
