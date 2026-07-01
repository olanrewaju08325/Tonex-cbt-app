import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Check, X, TrendingUp, Award } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUniversities } from "../../../lib/hooks/useUniversities";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface CutOffMark {
  id: string;
  university_id: string;
  department: string;
  year: number;
  cutoff_aggregate: number;
  universities?: {
    name: string;
    short_name: string;
  };
}

export function HistoricalCutOffsView() {
  const qc = useQueryClient();
  const { data: universities } = useUniversities();
  
  const [selectedUni, setSelectedUni] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newAggregate, setNewAggregate] = useState("");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editAggregate, setEditAggregate] = useState("");

  // Fetch all cut-offs
  const { data: cutoffs = [], isLoading } = useQuery<CutOffMark[]>({
    queryKey: ["admin-cutoffs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("university_cut_off_marks")
        .select(`
          id,
          university_id,
          department,
          year,
          cutoff_aggregate,
          universities:university_id (name, short_name)
        `)
        .order("department")
        .order("year", { ascending: true });
      if (error) throw error;
      return data as any[];
    }
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUni) return toast.error("Please select a university.");
    if (!selectedDept.trim()) return toast.error("Please enter a department name.");
    if (!newAggregate || isNaN(parseFloat(newAggregate))) return toast.error("Please enter a valid aggregate score.");

    const { error } = await supabase
      .from("university_cut_off_marks")
      .insert({
        university_id: selectedUni,
        department: selectedDept.trim(),
        year: newYear,
        cutoff_aggregate: parseFloat(newAggregate)
      });

    if (error) {
      toast.error(`Failed to add cutoff: ${error.message}`);
      return;
    }

    toast.success("Cut-off mark added successfully!");
    setNewAggregate("");
    qc.invalidateQueries({ queryKey: ["admin-cutoffs"] });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editAggregate || isNaN(parseFloat(editAggregate))) {
      return toast.error("Please enter a valid aggregate score.");
    }

    const { error } = await supabase
      .from("university_cut_off_marks")
      .update({ cutoff_aggregate: parseFloat(editAggregate) })
      .eq("id", id);

    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }

    toast.success("Cut-off mark updated successfully!");
    setIsEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-cutoffs"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cut-off mark?")) return;

    const { error } = await supabase
      .from("university_cut_off_marks")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }

    toast.success("Cut-off mark deleted.");
    qc.invalidateQueries({ queryKey: ["admin-cutoffs"] });
  };

  // Group cut-offs by Department to render Trend Chart preview
  const departmentsList = Array.from(new Set(cutoffs.map(c => c.department)));
  const [previewDept, setPreviewDept] = useState(departmentsList[0] || "");
  const [previewUni, setPreviewUni] = useState("");

  const chartData = cutoffs
    .filter(c => c.department === previewDept && (!previewUni || c.university_id === previewUni))
    .map(c => ({
      year: String(c.year),
      aggregate: c.cutoff_aggregate,
      school: c.universities?.short_name || "School"
    }))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-white font-bold text-lg flex-1 flex items-center gap-2">
          <Award size={20} className="text-[#22C55E]" /> Historical Cut-Off Marks
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form + Graph preview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Add Form */}
          <div className="bg-[#0F1F35] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-white font-bold text-sm">Add Historical Cut-Off</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">University</label>
                <select
                  value={selectedUni}
                  onChange={e => setSelectedUni(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none"
                >
                  <option value="">Select University</option>
                  {universities?.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Medicine & Surgery"
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Year</label>
                  <select
                    value={newYear}
                    onChange={e => setNewYear(parseInt(e.target.value))}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    {[2022, 2023, 2024, 2025, 2026].map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#64748B] text-[10px] font-bold uppercase block mb-1">Cut-Off Aggregate</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 78.50"
                    value={newAggregate}
                    onChange={e => setNewAggregate(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-2.5 rounded-xl text-xs transition-all mt-4"
              >
                <Plus size={14} /> Add Cut-Off Record
              </button>
            </form>
          </div>

          {/* Trend Preview Graph */}
          <div className="bg-[#0F1F35] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                <TrendingUp size={16} className="text-[#60A5FA]" /> Trend Preview
              </h3>
              <div className="flex gap-2">
                <select
                  value={previewDept}
                  onChange={e => setPreviewDept(e.target.value)}
                  className="bg-[#1E293B] border border-white/5 rounded-lg px-2 py-1 text-white text-[10px] focus:outline-none max-w-[150px]"
                >
                  <option value="">Choose Department</option>
                  {departmentsList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {chartData.length > 1 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="year" stroke="#475569" fontSize={10} />
                    <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="aggregate" stroke="#60A5FA" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center text-[#64748B] border border-dashed border-white/5 rounded-xl text-xs p-4">
                <TrendingUp size={24} className="mb-2 opacity-50" />
                Select a department with at least 2 years of cut-off marks to view trend.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: List of Cut-offs */}
        <div className="lg:col-span-7 bg-[#0F1F35] border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-bold text-sm">Cut-Off Mark Registry</h3>
          
          {isLoading ? (
            <div className="text-[#64748B] text-center py-8 text-xs">Loading cutoff marks...</div>
          ) : cutoffs.length === 0 ? (
            <div className="text-center py-12 text-[#64748B] text-xs">No records found. Enter cutoff scores on the left.</div>
          ) : (
            <div className="overflow-y-auto max-h-[500px] pr-1 space-y-2">
              {cutoffs.map((item) => (
                <div key={item.id} className="bg-[#1E293B]/40 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-xs">{item.department}</span>
                      <span className="bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/20 text-[9px] px-1.5 py-0.5 rounded font-black">
                        {item.year}
                      </span>
                    </div>
                    <span className="text-[#64748B] text-[10px] block mt-0.5">
                      {item.universities?.name} ({item.universities?.short_name})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isEditing === item.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={editAggregate}
                          onChange={e => setEditAggregate(e.target.value)}
                          className="w-16 bg-[#0F172A] border border-white/10 rounded px-2 py-1 text-white text-xs text-center focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="p-1 bg-[#22C55E]/20 text-[#22C55E] rounded hover:bg-[#22C55E]/30"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setIsEditing(null)}
                          className="p-1 bg-white/5 text-[#64748B] rounded hover:bg-white/10"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-white font-black text-sm">{item.cutoff_aggregate.toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setIsEditing(item.id);
                              setEditAggregate(String(item.cutoff_aggregate));
                            }}
                            className="p-1.5 bg-[#1E293B] text-[#94A3B8] hover:text-white rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
