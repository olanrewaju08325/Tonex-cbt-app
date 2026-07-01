import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Check, X, Tag, BookOpen, Layers } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubjects } from "../../../lib/hooks/useSubjects";

interface TopicInfo {
  topic: string;
  count: number;
}

export function TopicTagManagerView() {
  const qc = useQueryClient();
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();
  
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSlug, setNewSubjectSlug] = useState("");

  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectSlug, setEditSubjectSlug] = useState("");

  const [editingTopicName, setEditingTopicName] = useState<string | null>(null);
  const [newTopicNameValue, setNewTopicNameValue] = useState("");
  const [updatingTopic, setUpdatingTopic] = useState(false);

  // Fetch unique topics and question counts for the selected subject
  const { data: topics = [], isLoading: topicsLoading } = useQuery<TopicInfo[]>({
    queryKey: ["admin-topics", selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      
      const { data, error } = await supabase
        .from("questions")
        .select("topic")
        .eq("subject_id", selectedSubjectId)
        .not("topic", "is", null);
        
      if (error) throw error;
      
      // Count frequency of each topic
      const counts: Record<string, number> = {};
      data.forEach((q: any) => {
        const t = String(q.topic).trim();
        if (t) {
          counts[t] = (counts[t] || 0) + 1;
        }
      });
      
      return Object.entries(counts).map(([topic, count]) => ({
        topic,
        count
      })).sort((a, b) => b.count - a.count);
    },
    enabled: !!selectedSubjectId
  });

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return toast.error("Subject name is required.");
    const slug = newSubjectSlug.trim() || newSubjectName.trim().toLowerCase().replace(/\s+/g, "-");

    const { error } = await supabase
      .from("subjects")
      .insert({
        name: newSubjectName.trim(),
        slug,
        is_active: true
      });

    if (error) {
      toast.error(`Failed to add subject: ${error.message}`);
      return;
    }

    toast.success("Subject created successfully!");
    setNewSubjectName("");
    setNewSubjectSlug("");
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };

  const handleSaveSubjectEdit = async (id: string) => {
    if (!editSubjectName.trim()) return toast.error("Subject name is required.");

    const { error } = await supabase
      .from("subjects")
      .update({
        name: editSubjectName.trim(),
        slug: editSubjectSlug.trim()
      })
      .eq("id", id);

    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }

    toast.success("Subject updated successfully!");
    setEditingSubjectId(null);
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };

  const handleToggleSubjectActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("subjects")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error(`Toggle failed: ${error.message}`);
      return;
    }

    toast.success(`Subject is now ${!currentStatus ? "active" : "inactive"}`);
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject? All associated questions will have their subject set to null.")) return;

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }

    toast.success("Subject deleted successfully.");
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };

  // Bulk rename topic globally for the selected subject
  const handleRenameTopic = async (oldTopic: string) => {
    const trimmedNew = newTopicNameValue.trim();
    if (!trimmedNew) return toast.error("Topic name cannot be empty.");
    if (trimmedNew === oldTopic) return setEditingTopicName(null);

    setUpdatingTopic(true);
    const { error } = await supabase
      .from("questions")
      .update({ topic: trimmedNew })
      .eq("subject_id", selectedSubjectId)
      .eq("topic", oldTopic);

    setUpdatingTopic(false);
    if (error) {
      toast.error(`Failed to rename topic tag: ${error.message}`);
      return;
    }

    toast.success(`Successfully renamed topic tag to '${trimmedNew}' across all questions.`);
    setEditingTopicName(null);
    qc.invalidateQueries({ queryKey: ["admin-topics", selectedSubjectId] });
  };

  // Bulk delete topic globally for the selected subject
  const handleDeleteTopic = async (topic: string) => {
    if (!confirm(`Are you sure you want to clear the topic tag '${topic}'? This will remove the tag from all questions under this subject.`)) return;

    setUpdatingTopic(true);
    const { error } = await supabase
      .from("questions")
      .update({ topic: null })
      .eq("subject_id", selectedSubjectId)
      .eq("topic", topic);

    setUpdatingTopic(false);
    if (error) {
      toast.error(`Failed to clear topic tag: ${error.message}`);
      return;
    }

    toast.success(`Cleared topic tag from questions.`);
    qc.invalidateQueries({ queryKey: ["admin-topics", selectedSubjectId] });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Subjects Registry */}
        <div className="lg:col-span-6 bg-[#0F1F35] border border-white/5 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            <BookOpen size={18} className="text-[#60A5FA]" /> Subjects Manager
          </h2>

          {/* Add Subject Form */}
          <form onSubmit={handleAddSubject} className="bg-[#1E293B]/40 p-4 border border-white/5 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Physics"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Slug (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. physics"
                  value={newSubjectSlug}
                  onChange={e => setNewSubjectSlug(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-2 rounded-xl text-xs transition-all"
            >
              <Plus size={14} /> Add Subject
            </button>
          </form>

          {/* Subjects List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {subjectsLoading ? (
              <div className="text-[#64748B] text-center py-6 text-xs">Loading subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-6 text-[#64748B] text-xs">No subjects created yet.</div>
            ) : (
              subjects.map(sub => (
                <div key={sub.id} className="bg-[#1E293B]/40 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    {editingSubjectId === sub.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editSubjectName}
                          onChange={e => setEditSubjectName(e.target.value)}
                          className="bg-[#0F172A] border border-white/10 rounded px-2 py-1 text-white text-xs font-bold w-24"
                        />
                        <input
                          type="text"
                          value={editSubjectSlug}
                          onChange={e => setEditSubjectSlug(e.target.value)}
                          className="bg-[#0F172A] border border-white/10 rounded px-2 py-1 text-white text-xs w-20"
                        />
                        <button
                          onClick={() => handleSaveSubjectEdit(sub.id)}
                          className="p-1 bg-[#22C55E]/20 text-[#22C55E] rounded hover:bg-[#22C55E]/30"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingSubjectId(null)}
                          className="p-1 bg-white/5 text-[#64748B] rounded hover:bg-white/10"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-xs">{sub.name}</span>
                          <span className="text-[#475569] text-[10px]">{sub.slug}</span>
                        </div>
                        <button
                          onClick={() => handleToggleSubjectActive(sub.id, sub.is_active)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border mt-1 transition-all ${
                            sub.is_active 
                              ? "bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]" 
                              : "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]"
                          }`}
                        >
                          {sub.is_active ? "Active" : "Inactive"}
                        </button>
                      </>
                    )}
                  </div>

                  {editingSubjectId !== sub.id && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingSubjectId(sub.id);
                          setEditSubjectName(sub.name);
                          setEditSubjectSlug(sub.slug || "");
                        }}
                        className="p-1.5 bg-[#1E293B] text-[#94A3B8] hover:text-white rounded-lg transition-all"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="p-1.5 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 rounded-lg transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Topics Tag Manager */}
        <div className="lg:col-span-6 bg-[#0F1F35] border border-white/5 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            <Tag size={18} className="text-[#A78BFA]" /> Global Topic Tag Editor
          </h2>

          <div className="space-y-1">
            <label className="text-[#64748B] text-[10px] font-bold uppercase block">Select Subject to View Topics</label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none"
            >
              <option value="">Choose Subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {!selectedSubjectId ? (
            <div className="text-center py-16 text-[#64748B] text-xs border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center">
              <Layers size={24} className="mb-2 opacity-50" />
              Select a subject above to manage its question topic tags.
            </div>
          ) : topicsLoading ? (
            <div className="text-[#64748B] text-center py-8 text-xs">Querying topic tags...</div>
          ) : topics.length === 0 ? (
            <div className="text-[#64748B] text-center py-8 text-xs">No topic tags assigned to questions under this subject.</div>
          ) : (
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {topics.map(t => (
                <div key={t.topic} className="bg-[#1E293B]/40 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {editingTopicName === t.topic ? (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          value={newTopicNameValue}
                          onChange={e => setNewTopicNameValue(e.target.value)}
                          className="bg-[#0F172A] border border-white/10 rounded px-2 py-1 text-white text-xs font-bold flex-1"
                        />
                        <button
                          onClick={() => handleRenameTopic(t.topic)}
                          disabled={updatingTopic}
                          className="p-1 bg-[#22C55E]/20 text-[#22C55E] rounded hover:bg-[#22C55E]/30 disabled:opacity-50"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingTopicName(null)}
                          disabled={updatingTopic}
                          className="p-1 bg-white/5 text-[#64748B] rounded hover:bg-white/10 disabled:opacity-50"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-xs">{t.topic}</span>
                        <span className="bg-white/5 border border-white/5 text-[#94A3B8] text-[9px] font-black px-1.5 py-0.5 rounded">
                          {t.count} questions
                        </span>
                      </div>
                    )}
                  </div>

                  {editingTopicName !== t.topic && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingTopicName(t.topic);
                          setNewTopicNameValue(t.topic);
                        }}
                        className="p-1.5 bg-[#1E293B] text-[#94A3B8] hover:text-white rounded-lg transition-all"
                        title="Rename Tag"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(t.topic)}
                        className="p-1.5 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 rounded-lg transition-all"
                        title="Delete Tag"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
