import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { 
  Award, Building2, Search, Filter, HelpCircle, 
  TrendingUp, CheckCircle, XCircle, ArrowUpRight, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "../components/ui/drawer";

interface CutOffMark {
  id: string;
  university_id: string;
  department: string;
  year: number;
  cutoff_aggregate: number;
  universities: {
    name: string;
    short_name: string;
  };
}

interface University {
  id: string;
  name: string;
  short_name: string;
}

export function CutOffMarksPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [selectedUniId, setSelectedUniId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch list of active universities
  const { data: universities = [] } = useQuery<University[]>({
    queryKey: ["universities-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("universities")
        .select("id, name, short_name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  // Fetch student average mock aggregate parts
  const { data: userStats } = useQuery({
    queryKey: ["user-jamb-postutme-aggregate", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      // Get mock average
      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("score_percentage")
        .eq("user_id", profile.id);
      
      const avgPostUtme = sessions && sessions.length > 0
        ? sessions.reduce((acc, curr) => acc + curr.score_percentage, 0) / sessions.length
        : 0;
      
      return {
        avgPostUtme,
        targetUniId: profile.target_university_id
      };
    },
    enabled: !!profile?.id
  });

  // Fetch historical cut-off marks
  const { data: cutoffs = [], isLoading } = useQuery<CutOffMark[]>({
    queryKey: ["cutoff-marks", selectedUniId],
    queryFn: async () => {
      let query = supabase
        .from("university_cut_off_marks")
        .select(`
          id,
          university_id,
          department,
          year,
          cutoff_aggregate,
          universities:university_id (name, short_name)
        `);
      
      if (selectedUniId) {
        query = query.eq("university_id", selectedUniId);
      }
      
      const { data, error } = await query.order("cutoff_aggregate", { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  // Filter cutoffs by search query
  const filteredCutoffs = cutoffs.filter(c => 
    c.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.universities.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.universities.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute estimated aggregate if target university matches
  const getComparison = (cutoff: number, cutoffUniId: string) => {
    if (!userStats || !profile?.target_university_id || profile.target_university_id !== cutoffUniId) {
      return null;
    }
    // Calculate aggregate (assumes average mock + simple default 270 jamb score if not entered)
    const postUtmePart = userStats.avgPostUtme / 2; // general formula
    const jambPart = 270 / 8; // fallback placeholder JAMB score
    const totalEstAggregate = postUtmePart + jambPart;
    const diff = totalEstAggregate - cutoff;

    return {
      aggregate: totalEstAggregate,
      diff,
      passed: diff >= 0
    };
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 mt-4 md:mt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#22C55E]/20 flex items-center justify-center border border-[#22C55E]/30">
            <Award className="text-[#22C55E]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white font-['Manrope']">Departmental Cut-Off Marks</h1>
            <p className="text-[#94A3B8] text-sm mt-0.5">Explore admission merit aggregates required by major departments</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/aggregate-calculator")}
          className="flex items-center gap-2 bg-[#2563EB]/10 hover:bg-[#2563EB]/25 text-[#60A5FA] border border-[#2563EB]/20 hover:border-[#2563EB]/45 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
        >
          <TrendingUp size={14} />
          Calculate My Aggregate
          <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mobile Filter Button */}
        <div className="block lg:hidden w-full mb-2">
          <Drawer>
            <DrawerTrigger asChild>
              <button className="w-full flex items-center justify-between p-3.5 bg-[#0F172A] hover:bg-[#0F172A]/85 text-white rounded-2xl border border-white/6 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Filter size={16} className="text-[#60A5FA]" />
                  Filter Registry {(searchQuery || selectedUniId) ? "• Active" : ""}
                </span>
                <ChevronRight size={16} className="text-[#64748B]" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="bg-[#0F172A] border-white/10 p-5 pb-8">
              <DrawerHeader className="px-0">
                <DrawerTitle className="text-white text-base flex items-center gap-2">
                  <Filter size={16} className="text-[#60A5FA]" /> Filter Registry
                </DrawerTitle>
              </DrawerHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <label className="text-[#64748B] text-[10px] uppercase font-bold">Search Department</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Medicine, Law..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#1E293B] border border-white/5 focus:border-[#2563EB] rounded-xl pl-9 pr-4 py-3.5 text-white text-xs focus:outline-none transition-all placeholder-[#475569]"
                    />
                    <Search size={13} className="absolute left-3.5 top-4 text-[#475569]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[#64748B] text-[10px] uppercase font-bold">University</label>
                  <select
                    value={selectedUniId}
                    onChange={(e) => setSelectedUniId(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/5 focus:border-[#2563EB] rounded-xl px-3 py-3.5 text-white text-xs focus:outline-none transition-all"
                  >
                    <option value="">All Universities</option>
                    {universities.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>
                    ))}
                  </select>
                </div>

                <DrawerClose asChild>
                  <button className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3 rounded-xl text-xs transition-all mt-4">
                    Apply Filters
                  </button>
                </DrawerClose>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Filters Panel (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Filter size={15} className="text-[#60A5FA]" />
              Filter Registry
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[#64748B] text-[10px] uppercase font-bold">Search Department</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Medicine, Law..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/5 focus:border-[#2563EB] rounded-xl pl-9 pr-4 py-2.5 text-white text-xs focus:outline-none transition-all placeholder-[#475569]"
                  />
                  <Search size={13} className="absolute left-3.5 top-3.5 text-[#475569]" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#64748B] text-[10px] uppercase font-bold">University</label>
                <select
                  value={selectedUniId}
                  onChange={(e) => setSelectedUniId(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/5 focus:border-[#2563EB] rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none transition-all"
                >
                  <option value="">All Universities</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>
                  ))}
                </select>
              </div>
            </div>

            {profile?.target_university_id && (
              <div className="bg-[#1E293B]/60 border border-white/5 rounded-xl p-3 text-xs leading-relaxed text-[#94A3B8] space-y-1">
                <span className="text-white font-bold text-[10px] uppercase block mb-1">Your Targets:</span>
                <div>
                  🎯 Target School: <strong className="text-white">
                    {universities.find(u => u.id === profile.target_university_id)?.short_name || "Custom"}
                  </strong>
                </div>
                <div>
                  📊 Avg Practice Score: <strong className="text-white">
                    {userStats?.avgPostUtme ? `${userStats.avgPostUtme.toFixed(1)}%` : "No sessions taken"}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="lg:col-span-8">
          <div className="bg-[#0F172A] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-[#64748B] text-xs">Loading Cutoff marks...</div>
            ) : filteredCutoffs.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Building2 className="mx-auto text-[#475569]" size={36} />
                <h3 className="text-white font-bold text-sm">No Results Found</h3>
                <p className="text-[#94A3B8] text-xs max-w-sm mx-auto">
                  We don't have cut-off records matching your filters. Admins populate these parameters dynamically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredCutoffs.map((item) => {
                  const comp = getComparison(item.cutoff_aggregate, item.university_id);
                  
                  return (
                    <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{item.department}</span>
                          <span className="bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/20 text-[9px] px-2 py-0.5 rounded font-bold">
                            {item.year}
                          </span>
                        </div>
                        <span className="text-[#64748B] text-xs flex items-center gap-1.5">
                          <Building2 size={12} />
                          {item.universities.name} ({item.universities.short_name})
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[#64748B] text-[10px] uppercase font-bold block">Merit Cutoff</span>
                          <span className="text-white font-extrabold text-base">{item.cutoff_aggregate.toFixed(2)}</span>
                        </div>

                        {comp && (
                          <div className="border-l border-white/5 pl-4 flex items-center gap-2 text-left">
                            <div>
                              <span className="text-[#64748B] text-[10px] uppercase font-bold block">My Gap</span>
                              <span className={`font-bold text-xs ${comp.passed ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                                {comp.passed ? "+" : ""}{comp.diff.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              {comp.passed ? (
                                <CheckCircle size={18} className="text-[#22C55E]" />
                              ) : (
                                <XCircle size={18} className="text-[#EF4444]" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
