import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useUniversities } from "../../../lib/hooks/useUniversities";
import { useSubjects } from "../../../lib/hooks/useSubjects";
import { toast } from "sonner";

export function MaterialUploadView() {
  const { data: universities } = useUniversities();
  const { data: subjects } = useSubjects();
  const [selectedUni, setSelectedUni] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (selected.size > 20 * 1024 * 1024) { // 20MB limit
      toast.error("File size must be less than 20MB");
      return;
    }
    setFile(selected);
    if (!title) {
      setTitle(selected.name.replace(".pdf", ""));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }
    if (!title) {
      toast.error("Please enter a title");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${selectedUni || 'general'}/${selectedSubject || 'general'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      // 3. Create database record
      const { error: dbError } = await supabase.from('materials').insert({
        title,
        description,
        file_url: publicUrl,
        subject_id: selectedSubject || null,
        university_id: selectedUni || null,
        is_active: true
      });

      if (dbError) throw dbError;

      toast.success("Material uploaded successfully!");
      
      // Reset form
      setFile(null);
      setTitle("");
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to upload material");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#0F1F35] border border-white/5 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <FileText className="text-[#EF4444]" size={20} /> Upload PDF Material
        </h2>
      </div>

      {/* Config */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 2023 Mathematics Past Questions"
            className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#EF4444]/40"
          />
        </div>
        <div>
          <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">Subject (Optional)</label>
          <select
            title="Subject"
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#EF4444]/40"
          >
            <option value="">-- General --</option>
            {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">University (Optional)</label>
          <select
            title="University"
            value={selectedUni}
            onChange={e => setSelectedUni(e.target.value)}
            className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#EF4444]/40"
          >
            <option value="">-- General --</option>
            {universities?.map(u => <option key={u.id} value={u.id}>{u.short_name} — {u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description..."
            className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#EF4444]/40"
          />
        </div>
      </div>

      {/* Upload area */}
      {!file ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-[#EF4444]/40 rounded-2xl p-10 text-center cursor-pointer transition-all group mb-6"
        >
          <Upload size={36} className="text-[#475569] group-hover:text-[#EF4444] mx-auto mb-3 transition-colors" />
          <p className="text-white font-semibold mb-1">Click to select PDF file</p>
          <p className="text-[#64748B] text-xs">Maximum size: 20MB</p>
          <input ref={fileRef} type="file" accept="application/pdf" title="Upload PDF" className="hidden" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#EF4444]/15 flex items-center justify-center">
              <FileText size={24} className="text-[#EF4444]" />
            </div>
            <div>
              <div className="text-white font-semibold">{file.name}</div>
              <div className="text-[#64748B] text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-[#EF4444] hover:bg-[#EF4444]/10 p-2 rounded-xl transition-colors"
            title="Remove File"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || !file || !title}
        className="w-full flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20"
      >
        {uploading ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
        ) : (
          <><Upload size={16} /> Upload PDF Material</>
        )}
      </button>
    </div>
  );
}
