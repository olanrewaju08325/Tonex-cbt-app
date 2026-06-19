import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { BookOpen, Search, Download, FileText, ChevronRight, Filter, CheckCircle, Trash2, Bookmark, WifiOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useSubjects } from "../../lib/hooks/useSubjects";
import { useUniversities } from "../../lib/hooks/useUniversities";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";
import { 
  cacheMaterial, 
  getCachedMaterial, 
  getCachedMaterialsList, 
  removeCachedMaterial 
} from "../../lib/offlineCache";

type Material = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  subject_id: string;
  university_id: string;
  created_at: string;
};

export function MaterialsPage() {
  const { profile } = useAuth();
  const { data: subjects } = useSubjects();
  const { data: universities } = useUniversities();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedUni, setSelectedUni] = useState("");

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [cachingId, setCachingId] = useState<string | null>(null);

  // Connection status listener
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Load cached materials list
  useEffect(() => {
    const loadCachedList = async () => {
      const list = await getCachedMaterialsList();
      setSavedIds(list);
    };
    loadCachedList();
  }, []);

  const handleSaveOffline = async (material: Material) => {
    if (cachingId) return;
    setCachingId(material.id);
    const toastId = toast.loading(`Saving "${material.title}" offline...`);
    try {
      const response = await fetch(material.file_url);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      
      await cacheMaterial(material.id, material.title, blob);
      setSavedIds(prev => [...prev, material.id]);
      toast.success(`"${material.title}" is now available offline!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save material offline. Please check your connection.", { id: toastId });
    } finally {
      setCachingId(null);
    }
  };

  const handleDeleteCache = async (id: string, title: string) => {
    try {
      await removeCachedMaterial(id);
      setSavedIds(prev => prev.filter(savedId => savedId !== id));
      toast.success(`Removed "${title}" cache`);
    } catch (err) {
      toast.error("Failed to remove material cache");
    }
  };

  const handleReadOffline = async (id: string, title: string) => {
    try {
      const cached = await getCachedMaterial(id);
      if (cached && cached.blob) {
        const objectUrl = URL.createObjectURL(cached.blob);
        window.open(objectUrl, "_blank");
      } else {
        toast.error("Cached file not found locally");
      }
    } catch (err) {
      toast.error("Failed to load local PDF file");
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [selectedSubject, selectedUni]);

  const fetchMaterials = async () => {
    setLoading(true);
    let query = supabase.from("materials").select("*").eq("is_active", true).order("created_at", { ascending: false });
    
    if (selectedSubject) query = query.eq("subject_id", selectedSubject);
    if (selectedUni) query = query.eq("university_id", selectedUni);

    const { data } = await query;
    if (data) setMaterials(data);
    setLoading(false);
  };

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase()) || 
    (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-['Manrope']">
            Study Materials
          </h1>
          <p className="text-[#64748B] text-sm">Access curated study guides and university past screening questions in PDF. Premium account is required to download files.</p>
        </motion.div>

        {/* Filters */}
        <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input
              type="text"
              placeholder="Search materials..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1E293B] border border-white/6 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select
              title="Subject Filter"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB]/40 min-w-[140px]"
            >
              <option value="">All Subjects</option>
              {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              title="University Filter"
              value={selectedUni}
              onChange={e => setSelectedUni(e.target.value)}
              className="bg-[#1E293B] border border-white/6 rounded-xl px-4 py-2.5 text-[#94A3B8] text-sm focus:outline-none focus:border-[#2563EB]/40 min-w-[140px]"
            >
              <option value="">All Universities</option>
              {universities?.map(u => <option key={u.id} value={u.id}>{u.short_name}</option>)}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl bg-[#0F172A]" />
            ))
          ) : filteredMaterials.length > 0 ? (
            filteredMaterials.map((material, i) => (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[#0F172A] border border-white/6 rounded-2xl p-5 hover:border-white/12 transition-all group flex flex-col h-full"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-[#EF4444]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold leading-tight line-clamp-2" title={material.title}>
                      {material.title}
                    </h3>
                    <div className="text-[#64748B] text-xs mt-1 flex items-center gap-2">
                      {material.subject_id && subjects?.find(s => s.id === material.subject_id)?.name}
                      {material.university_id && (
                        <>
                          <span className="w-1 h-1 bg-[#475569] rounded-full" />
                          {universities?.find(u => u.id === material.university_id)?.short_name}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {material.description && (
                  <p className="text-[#94A3B8] text-xs mb-4 line-clamp-2 flex-1">
                    {material.description}
                  </p>
                )}
                <div className="mt-auto space-y-2">
                  {!profile?.is_premium ? (
                    <button 
                      onClick={() => toast.error("Please upgrade to Premium to download materials.")}
                      className="w-full flex items-center justify-center gap-2 bg-[#1E293B] text-[#94A3B8] px-4 py-2.5 rounded-xl text-sm font-semibold hover:text-white transition-all border border-white/5 group-hover:border-[#F59E0B]/30 group-hover:bg-[#F59E0B]/10 group-hover:text-[#F59E0B] cursor-pointer"
                    >
                      Premium Only
                    </button>
                  ) : (
                    <>
                      {isOnline ? (
                        <div className="flex flex-col gap-2">
                          <a
                            href={material.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#60A5FA] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border border-[#2563EB]/20 hover:border-[#2563EB]/40"
                          >
                            <Download size={16} /> Download PDF
                          </a>
                          
                          {savedIds.includes(material.id) ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 flex items-center justify-center gap-1 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] py-2 px-3 rounded-xl text-xs font-bold">
                                <CheckCircle size={12} /> Saved Offline
                              </div>
                              <button
                                onClick={() => handleDeleteCache(material.id, material.title)}
                                className="bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 text-[#EF4444] p-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                title="Delete from Offline cache"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSaveOffline(material)}
                              disabled={cachingId !== null}
                              className="w-full flex items-center justify-center gap-2 bg-[#1E293B] hover:bg-[#2563EB]/10 text-[#94A3B8] hover:text-[#60A5FA] border border-white/5 hover:border-[#2563EB]/20 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {cachingId === material.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Bookmark size={12} />
                              )}
                              Save Offline
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {savedIds.includes(material.id) ? (
                            <button
                              onClick={() => handleReadOffline(material.id, material.title)}
                              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-green-500/10 cursor-pointer"
                            >
                              <FileText size={16} /> Read Offline PDF
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full flex items-center justify-center gap-2 bg-[#1E293B]/45 text-[#475569] border border-white/5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-not-allowed"
                            >
                              <WifiOff size={16} /> Offline (Not Saved)
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-[#64748B] bg-[#0F172A] rounded-2xl border border-white/6">
              <BookOpen size={32} className="mx-auto mb-3 opacity-20" />
              <p>No materials found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
