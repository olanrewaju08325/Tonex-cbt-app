import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Layers, Plus, Edit2, Trash2, Search, UploadCloud, FileText, AlertCircle, X, Check } from "lucide-react";
import Papa from "papaparse";

type Flashcard = {
  id: string;
  subject_id: string | null;
  front: string;
  back: string;
  created_at: string;
  subjects?: {
    name: string;
  };
};

type Subject = {
  id: string;
  name: string;
};

export function FlashcardsView() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  
  // Tabs: "list" or "bulk"
  const [activeTab, setActiveTab] = useState<"list" | "bulk">("list");

  // Add/Edit Form states
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [formSubject, setFormSubject] = useState("");
  const [formFront, setFormFront] = useState("");
  const [formBack, setFormBack] = useState("");
  const [saving, setSaving] = useState(false);

  // Bulk upload states
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch subjects
      const { data: subData, error: subErr } = await supabase
        .from("subjects")
        .select("id, name")
        .order("name");
      if (subErr) throw subErr;
      setSubjects(subData || []);

      // Fetch flashcards
      const { data: cardData, error: cardErr } = await supabase
        .from("flashcards")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false });
      if (cardErr) throw cardErr;
      setFlashcards(cardData || []);
    } catch (err: any) {
      toast.error(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCard(null);
    setFormSubject(subjects[0]?.id || "");
    setFormFront("");
    setFormBack("");
    setShowForm(true);
  };

  const handleOpenEdit = (card: Flashcard) => {
    setEditingCard(card);
    setFormSubject(card.subject_id || "");
    setFormFront(card.front);
    setFormBack(card.back);
    setShowForm(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFront.trim() || !formBack.trim()) {
      toast.error("Please fill in both front and back contents.");
      return;
    }
    setSaving(true);

    try {
      if (editingCard) {
        // Update
        const { error } = await supabase
          .from("flashcards")
          .update({
            subject_id: formSubject || null,
            front: formFront.trim(),
            back: formBack.trim()
          })
          .eq("id", editingCard.id);
        if (error) throw error;
        toast.success("Flashcard updated successfully!");
      } else {
        // Create
        const { error } = await supabase
          .from("flashcards")
          .insert({
            subject_id: formSubject || null,
            front: formFront.trim(),
            back: formBack.trim()
          });
        if (error) throw error;
        toast.success("Flashcard created successfully!");
      }
      
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this flashcard?")) return;

    try {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Flashcard deleted successfully!");
      fetchData();
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  // Bulk Upload logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreview(results.data.slice(0, 5));
        }
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a CSV file first.");
    setUploading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        
        try {
          const flashcardsToInsert = rows.map(row => {
            if (!row.front || !row.back) {
              throw new Error("Missing front or back text. CSV must have 'front' and 'back' columns.");
            }
            if (!row.subject_id) {
              throw new Error("Missing subject_id.");
            }
            return {
              subject_id: row.subject_id,
              front: row.front,
              back: row.back
            };
          });

          const { error } = await supabase.from('flashcards').insert(flashcardsToInsert);
          if (error) throw error;
          
          toast.success(`Successfully uploaded ${flashcardsToInsert.length} flashcards!`);
          setFile(null);
          setPreview([]);
          setActiveTab("list");
          fetchData();
        } catch (error: any) {
          toast.error(`Upload failed: ${error.message}`);
        } finally {
          setUploading(false);
        }
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setUploading(false);
      }
    });
  };

  const downloadTemplate = () => {
    const headers = "subject_id,front,back\n";
    const example = "uuid-of-physics-subject,Newton's First Law,An object at rest remains at rest unless acted upon by a force.";
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'tonex_flashcards_template.csv');
    a.click();
  };

  // Filter flashcards
  const filtered = flashcards.filter(c => {
    const matchesSearch = 
      c.front.toLowerCase().includes(search.toLowerCase()) || 
      c.back.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = filterSubject === "all" || c.subject_id === filterSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-white/5 pb-4">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
            activeTab === "list" ? "bg-[#2563EB] text-white" : "bg-[#1E293B] text-[#94A3B8] hover:text-white"
          }`}
        >
          All Flashcards
        </button>
        <button
          onClick={() => setActiveTab("bulk")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
            activeTab === "bulk" ? "bg-[#2563EB] text-white" : "bg-[#1E293B] text-[#94A3B8] hover:text-white"
          }`}
        >
          Bulk Upload
        </button>
      </div>

      {activeTab === "list" && (
        <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Layers size={20} className="text-[#2563EB]" /> Flashcard Registry
            </h2>
            <button
              onClick={handleOpenAdd}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Flashcard
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <input
                type="text"
                placeholder="Search front or back..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#1E293B] border border-white/6 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
              />
            </div>
            <select
              title="Subject Filter"
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2 text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB]/40 min-w-[150px]"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-[#64748B]">Loading flashcards...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-[#64748B]">No flashcards found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-[#475569] border-b border-white/5 text-xs uppercase font-bold">
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">Front (Prompt)</th>
                    <th className="pb-3 pr-4">Back (Explanation/Answer)</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                      <td className="py-4 pr-4">
                        <span className="text-[10px] font-semibold text-[#60A5FA] bg-[#2563EB]/15 px-2 py-0.5 rounded">
                          {c.subjects?.name || "General"}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-white font-medium max-w-xs truncate" title={c.front}>{c.front}</td>
                      <td className="py-4 pr-4 text-[#94A3B8] max-w-xs truncate" title={c.back}>{c.back}</td>
                      <td className="py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#2563EB]/20 text-[#64748B] hover:text-[#60A5FA] transition-all"
                          title="Edit Card"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(c.id)}
                          className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#EF4444]/20 text-[#64748B] hover:text-[#EF4444] transition-all"
                          title="Delete Card"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "bulk" && (
        <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <UploadCloud size={20} className="text-[#2563EB]" /> Bulk Upload Flashcards
            </h2>
            <button onClick={downloadTemplate} className="text-[#60A5FA] hover:text-white text-sm font-semibold transition-colors">
              Download CSV Template
            </button>
          </div>

          <div className="border-2 border-dashed border-[#1E293B] hover:border-[#2563EB] rounded-2xl p-8 text-center transition-colors">
            <input
              type="file"
              accept=".csv"
              id="csv-upload-flashcards"
              className="hidden"
              onChange={handleFileChange}
            />
            <label htmlFor="csv-upload-flashcards" className="cursor-pointer flex flex-col items-center">
              <div className="bg-[#1E293B] p-4 rounded-full mb-4">
                <FileText size={32} className="text-[#64748B]" />
              </div>
              <p className="text-white font-semibold mb-1">
                {file ? file.name : "Click to browse or drag and drop"}
              </p>
              <p className="text-[#64748B] text-sm">CSV files only</p>
            </label>
          </div>

          {preview.length > 0 && (
            <div className="mt-6">
              <h3 className="text-white font-semibold mb-3">Preview (First 5 rows)</h3>
              <div className="overflow-x-auto bg-[#1E293B] rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[#94A3B8] border-b border-white/5">
                      <th className="p-3">Front</th>
                      <th className="p-3">Back</th>
                      <th className="p-3">Subject ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="text-white border-b border-white/5 last:border-0">
                        <td className="p-3 truncate max-w-xs">{row.front}</td>
                        <td className="p-3 truncate max-w-xs">{row.back}</td>
                        <td className="p-3 text-[#64748B] font-mono text-xs">{row.subject_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-6 w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#1E293B] disabled:text-[#64748B] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? "Uploading..." : "Import Database"}
          </button>

          <div className="bg-[#1E293B]/50 border border-white/5 rounded-2xl p-6 mt-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-semibold mb-1">Upload Guidelines</h4>
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                The CSV file must contain <code className="text-[#60A5FA]">subject_id</code>, <code className="text-[#60A5FA]">front</code>, and <code className="text-[#60A5FA]">back</code> headers. Ensure the subject IDs match valid subject UUIDs from your registry.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-[#64748B] hover:text-white"
              title="Close modal"
            >
              <X size={20} />
            </button>
            <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <Layers size={18} className="text-[#2563EB]" />
              {editingCard ? "Edit Flashcard" : "New Flashcard"}
            </h3>

            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase">Subject</label>
                <select
                  title="Form Subject"
                  value={formSubject}
                  onChange={e => setFormSubject(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase">Front Content (Prompt)</label>
                <textarea
                  title="Front Content"
                  rows={3}
                  value={formFront}
                  onChange={e => setFormFront(e.target.value)}
                  placeholder="e.g. Newton's Third Law of Motion"
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase">Back Content (Answer/Explanation)</label>
                <textarea
                  title="Back Content"
                  rows={4}
                  value={formBack}
                  onChange={e => setFormBack(e.target.value)}
                  placeholder="e.g. For every action, there is an equal and opposite reaction."
                  className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-[#1E293B] text-[#94A3B8] hover:text-white font-semibold py-3 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      {editingCard ? "Save Changes" : "Create Card"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
