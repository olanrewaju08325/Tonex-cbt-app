import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, BookOpen, GraduationCap, DollarSign, TrendingUp, BarChart2,
  Plus, Edit2, Trash2, Eye, EyeOff, Upload, Search,
  LayoutDashboard, FileQuestion, Building2, Tag, UserCheck, LogOut, X,
  AlertTriangle, Settings, Shield, Check, Clock, Globe, FileText, Megaphone, Layers, Mail
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAdminStats, useAdminUsers, useAdminQuestions } from "../../lib/hooks/useAdmin";
import { useUniversities } from "../../lib/hooks/useUniversities";
import { useSubjects } from "../../lib/hooks/useSubjects";
import { supabase, adminSupabase } from "../../lib/supabase";
import { Skeleton } from "../components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { SiteSettingsView } from "../components/admin/SiteSettingsView";
import { ExamConfigsView } from "../components/admin/ExamConfigsView";
import { ManualSubscriptionsView } from "../components/admin/ManualSubscriptionsView";
import { BulkUploadView } from "../components/admin/BulkUploadView";
import { MaterialUploadView } from "../components/admin/MaterialUploadView";
import { AnnouncementsView } from "../components/admin/AnnouncementsView";
import { RevenueAnalytics } from "../components/admin/RevenueAnalytics";
import { FlaggedQuestionsView } from "../components/admin/FlaggedQuestionsView";
import { AdminLogsView } from "../components/admin/AdminLogsView";
import { EmailBroadcastView } from "../components/admin/EmailBroadcastView";
import { FlashcardsView } from "../components/admin/FlashcardsView";

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_premium: boolean;
  is_blocked: boolean;
  created_at: string;
  streak_count: number | null;
  target_university_id: string | null;
  universities?: {
    short_name: string;
    name: string;
  } | null;
  subscription_plan?: string | null;
}

interface AdminQuestion {
  id: string;
  text: string;
  year: number | null;
  is_published: boolean;
  correct_answer: string;
  subjects?: {
    name: string;
  } | null;
  universities?: {
    short_name: string;
  } | null;
}

// Helper: log admin actions
async function logAdminAction(adminId: string, action: string, details?: object) {
  await supabase.from("admin_logs").insert({ admin_id: adminId, action, details });
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "revenue", label: "Revenue Analytics", icon: TrendingUp },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "questions", label: "Questions", icon: FileQuestion },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "flagged", label: "Flagged Questions", icon: AlertTriangle },
  { id: "bulk_upload", label: "Bulk Upload", icon: Upload },
  { id: "material_upload", label: "Material Upload", icon: FileText },
  { id: "universities", label: "Universities", icon: Building2 },
  { id: "subjects", label: "Subjects", icon: Tag },
  { id: "exam_configs", label: "Exam Configs", icon: Settings },
  { id: "users", label: "Users", icon: UserCheck },
  { id: "subscriptions", label: "Subscriptions", icon: DollarSign },
  { id: "activity_logs", label: "Activity Logs", icon: Shield },
  { id: "email_broadcast", label: "Email Broadcast", icon: Mail },
  { id: "site_settings", label: "Site Settings", icon: Globe },
];

const GROWTH_DATA = [
  { month: "Aug", users: 420, revenue: 850000 },
  { month: "Sep", users: 680, revenue: 1200000 },
  { month: "Oct", users: 950, revenue: 1750000 },
  { month: "Nov", users: 1240, revenue: 2300000 },
  { month: "Dec", users: 1800, revenue: 3100000 },
  { month: "Jan", users: 2340, revenue: 4200000 },
  { month: "Feb", users: 2900, revenue: 5500000 },
  { month: "Mar", users: 3600, revenue: 6800000 },
];

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
  change: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, color, change, loading }: StatCardProps) {
  if (loading) return <Skeleton className="h-24 rounded-xl bg-[#0F1F35]" />;
  return (
    <div className="bg-[#0F1F35] border border-white/5 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color === '#2563EB' ? 'bg-blue-600/10 text-blue-600' : color === '#22C55E' ? 'bg-green-500/10 text-green-500' : color === '#F59E0B' ? 'bg-amber-500/10 text-amber-500' : color === '#A855F7' ? 'bg-purple-500/10 text-purple-500' : 'bg-gray-500/10 text-gray-500'}`}>
          <Icon size={18} />
        </div>
        <span className="text-[#22C55E] text-xs font-semibold bg-[#22C55E]/10 px-2 py-1 rounded-lg">{change}</span>
      </div>
      <div className="text-white text-2xl font-extrabold font-['Manrope']">{value}</div>
      <div className="text-[#64748B] text-xs mt-1">{label}</div>
    </div>
  );
}

function DashboardView() {
  const { data: stats, isLoading } = useAdminStats();
  const { data: recentUsers, isLoading: usersLoading } = useAdminUsers();

  const displayUsers = recentUsers?.slice(0, 10) || [];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats?.totalUsers.toLocaleString() ?? "—"} icon={Users} color="#2563EB" change="Live" loading={isLoading} />
        <StatCard label="Premium Users" value={stats?.premiumUsers.toLocaleString() ?? "—"} icon={Shield} color="#F59E0B" change="Active" loading={isLoading} />
        <StatCard label="Questions" value={stats?.totalQuestions.toLocaleString() ?? "—"} icon={BookOpen} color="#7C3AED" change="Total" loading={isLoading} />
        <StatCard label="Revenue" value={stats ? `₦${(stats.revenue / 1000).toFixed(0)}K` : "—"} icon={DollarSign} color="#22C55E" change="Subscriptions" loading={isLoading} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Universities" value={stats?.universities ?? "—"} icon={GraduationCap} color="#0891B2" change="Active" loading={isLoading} />
        <StatCard label="New Today" value={stats?.newUsersToday ?? "—"} icon={TrendingUp} color="#EC4899" change="Today" loading={isLoading} />
      </div>

      {/* Chart */}
      <div className="bg-[#0F1F35] border border-white/5 rounded-2xl p-6 mb-6">
        <h3 className="text-white font-bold mb-6">User Growth Trend</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={GROWTH_DATA}>
              <defs>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0B1829", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} labelStyle={{ color: "#E2E8F0" }} />
              <Area yAxisId="left" type="monotone" dataKey="users" stroke="#2563EB" fill="url(#usersGrad)" strokeWidth={2} name="Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent users table */}
      <div className="bg-[#0F1F35] border border-white/5 rounded-2xl p-6">
        <h3 className="text-white font-bold mb-4">Recent Users</h3>
        {usersLoading ? (
          <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg bg-[#1E293B]" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Name", "Email", "Plan", "Joined"].map(h => (
                    <th key={h} className="text-left text-[#475569] text-xs font-semibold pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayUsers.map((u: AdminUser) => (
                  <tr key={u.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4 text-white font-medium">{u.full_name || "—"}</td>
                    <td className="py-3 pr-4 text-[#64748B]">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.is_premium ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "bg-[#1E293B] text-[#64748B]"
                      }`}>{u.is_premium ? "Premium" : "Free"}</span>
                    </td>
                    <td className="py-3 pr-4 text-[#64748B] text-xs">
                      {new Date(u.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionsView() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ subject: "", university: "", year: "", text: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "A", explanation: "" });
  const [submitting, setSubmitting] = useState(false);
  const { data: questions, isLoading } = useAdminQuestions();
  const { data: subjects } = useSubjects();
  const { data: universities } = useUniversities();
  const qc = useQueryClient();

  const filtered = (questions || []).filter((q: AdminQuestion) =>
    q.text.toLowerCase().includes(search.toLowerCase()) ||
    q.subjects?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject || !form.text) { toast.error("Subject and question text are required"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("questions").insert({
      subject_id: form.subject,
      university_id: form.university || null,
      year: form.year ? parseInt(form.year) : null,
      text: form.text,
      option_a: form.optionA,
      option_b: form.optionB,
      option_c: form.optionC,
      option_d: form.optionD,
      correct_option: form.correct,
      explanation: form.explanation,
      is_published: true,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Question created!");
    qc.invalidateQueries({ queryKey: ["adminQuestions"] });
    setShowCreate(false);
    setForm({ subject: "", university: "", year: "", text: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "A", explanation: "" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["adminQuestions"] }); }
  };

  const inputCls = "w-full bg-[#1E293B] border border-white/6 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <h2 className="text-white font-bold text-lg flex-1">Question Management</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..."
          className="w-full bg-[#0F1F35] border border-white/5 rounded-xl pl-9 pr-4 py-3 text-white placeholder-[#475569] text-sm focus:outline-none focus:border-[#2563EB]/40" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-[#0F1F35]" />)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q: AdminQuestion) => (
            <div key={q.id} className="bg-[#0F1F35] border border-white/5 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-[#2563EB]/20 text-[#60A5FA] text-xs font-semibold px-2 py-0.5 rounded">{q.subjects?.name}</span>
                  {q.universities?.short_name && <span className="bg-[#1E293B] text-[#64748B] text-xs px-2 py-0.5 rounded">{q.universities.short_name}</span>}
                  {q.year && <span className="text-[#475569] text-xs">{q.year}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${q.is_published ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-[#F59E0B]/15 text-[#F59E0B]"}`}>
                    {q.is_published ? "published" : "draft"}
                  </span>
                </div>
                <p className="text-[#94A3B8] text-sm truncate">{q.text}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => handleDelete(q.id)} title="Delete Question"
                  className="p-2 rounded-lg bg-[#1E293B] hover:bg-[#EF4444]/15 text-[#475569] hover:text-[#EF4444] transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-[#475569] text-center py-8">No questions found.</p>}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4">
              <div className="bg-[#0B1829] border border-white/10 rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-bold text-lg">Create Question</h3>
                  <button onClick={() => setShowCreate(false)} className="text-[#475569] hover:text-white" title="Close"><X size={18} /></button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="subject-select" className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Subject *</label>
                      <select id="subject-select" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required className={inputCls} title="Select Subject">
                        <option value="" className="bg-[#1E293B]">Choose…</option>
                        {subjects?.map(s => <option key={s.id} value={s.id} className="bg-[#1E293B]">{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="university-select" className="block text-[#94A3B8] text-xs font-semibold mb-1.5">University</label>
                      <select id="university-select" value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))} className={inputCls} title="Select University">
                        <option value="" className="bg-[#1E293B]">Any</option>
                        {universities?.map(u => <option key={u.id} value={u.id} className="bg-[#1E293B]">{u.short_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Year</label>
                    <input type="number" placeholder="e.g. 2023" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Question Text *</label>
                    <textarea rows={3} required placeholder="Enter the question..." value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} className={`${inputCls} resize-none`} />
                  </div>
                  {(["A", "B", "C", "D"] as const).map((letter, i) => {
                    const key = `option${letter}` as "optionA" | "optionB" | "optionC" | "optionD";
                    return (
                      <div key={letter}>
                        <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Option {letter}</label>
                        <input type="text" placeholder={`Option ${letter}...`} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inputCls} />
                      </div>
                    );
                  })}
                  <div>
                    <label htmlFor="correct-answer" className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Correct Answer</label>
                    <select id="correct-answer" value={form.correct} onChange={e => setForm(f => ({ ...f, correct: e.target.value }))} className={inputCls} title="Select Correct Answer">
                      {["A", "B", "C", "D"].map(l => <option key={l} value={l} className="bg-[#1E293B]">{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Explanation</label>
                    <textarea rows={3} placeholder="Explain the correct answer..." value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} className={`${inputCls} resize-none`} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-[#1E293B] text-[#94A3B8] font-semibold py-3 rounded-xl text-sm">Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center">
                      {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Create Question"}
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

function UsersView() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [grantModal, setGrantModal] = useState<{ userId: string; name: string } | null>(null);
  const [grantPlan, setGrantPlan] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [grantMonths, setGrantMonths] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const { data: users, isLoading, refetch } = useAdminUsers();
  const qc = useQueryClient();

  const filtered = (users || []).filter((u: AdminUser) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q);
    const matchPlan =
      planFilter === "all" ||
      (planFilter === "premium" && u.is_premium) ||
      (planFilter === "free" && !u.is_premium) ||
      (planFilter === "blocked" && u.is_blocked);
    return matchSearch && matchPlan;
  });

  const grantPremium = async () => {
    if (!grantModal) return;
    setSubmitting(true);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + grantMonths);
    // Insert a subscription record (triggers auto-sets is_premium)
    const { error } = await supabase.from("subscriptions").insert({
      user_id: grantModal.userId,
      plan: grantPlan,
      amount: grantPlan === "monthly" ? 2500 : grantPlan === "quarterly" ? 6500 : 25000,
      payment_reference: "admin-grant",
      status: "active",
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      admin_notes: "Manually granted by admin",
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`✅ Premium granted to ${grantModal.name}!`);
      setGrantModal(null);
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
    }
    setSubmitting(false);
  };

  const revokePremium = async (userId: string, name: string) => {
    if (!confirm(`Revoke premium from ${name}?`)) return;
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled", admin_notes: "Revoked by admin" })
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) toast.error(error.message);
    else { toast.success("Premium revoked"); qc.invalidateQueries({ queryKey: ["adminUsers"] }); }
  };

  const toggleBlock = async (userId: string, name: string, blocked: boolean) => {
    const action = blocked ? "unblock" : "block";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${name}?`)) return;
    const { error } = await supabase.from("profiles").update({ is_blocked: !blocked }).eq("id", userId);
    if (error) toast.error(error.message);
    else { toast.success(`User ${action}ed`); qc.invalidateQueries({ queryKey: ["adminUsers"] }); }
  };

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) toast.error(error.message);
    else { toast.success(`Role updated to ${newRole}`); qc.invalidateQueries({ queryKey: ["adminUsers"] }); }
  };

  const totalUsers = users?.length || 0;
  const premiumCount = (users || []).filter((u: AdminUser) => u.is_premium).length;
  const blockedCount = (users || []).filter((u: AdminUser) => u.is_blocked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <Users size={20} className="text-[#2563EB]" /> User Management
          </h2>
          <p className="text-[#64748B] text-xs mt-1">{totalUsers} total · {premiumCount} premium · {blockedCount} blocked</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 bg-[#1E293B] hover:bg-white/10 text-[#94A3B8] px-4 py-2 rounded-xl text-sm transition-colors">
          <Eye size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: "all", label: `All (${totalUsers})` },
          { key: "premium", label: `Premium (${premiumCount})` },
          { key: "free", label: `Free (${totalUsers - premiumCount})` },
          { key: "blocked", label: `Blocked (${blockedCount})` },
        ].map(f => (
          <button key={f.key} onClick={() => setPlanFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              planFilter === f.key ? "bg-[#2563EB] border-[#2563EB] text-white" : "bg-[#0F1F35] border-white/5 text-[#64748B] hover:text-white"
            }`}>
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="bg-[#0F1F35] border border-white/5 rounded-xl pl-8 pr-4 py-1.5 text-white placeholder-[#475569] text-xs focus:outline-none focus:border-[#2563EB]/40 w-52" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-[#0F1F35]" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u: AdminUser) => (
            <div key={u.id} className={`bg-[#0F1F35] border rounded-2xl p-4 flex items-center gap-4 transition-all ${u.is_blocked ? "border-red-500/20 opacity-60" : "border-white/5"}`}>
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                u.is_premium ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-[#2563EB]/30"
              }`}>
                {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{u.full_name || "—"}</span>
                  {u.is_premium ? (
                    <span className="bg-amber-500/15 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                      PREMIUM · {(u.subscription_plan || "active").toUpperCase()}
                    </span>
                  ) : (
                    <span className="bg-[#1E293B] text-[#64748B] text-[10px] font-bold px-2 py-0.5 rounded-full">FREE</span>
                  )}
                  {u.is_blocked && <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">BLOCKED</span>}
                  <span className="text-[#475569] text-[10px] border border-white/5 px-2 py-0.5 rounded-full capitalize">{u.role}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-[#64748B] text-xs">{u.email}</span>
                  {u.universities?.short_name && (
                    <span className="text-[#475569] text-xs">{u.universities.short_name}</span>
                  )}
                  <span className="text-[#475569] text-xs">🔥 {u.streak_count || 0} streak</span>
                  <span className="text-[#475569] text-xs">Joined {new Date(u.created_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"2-digit" })}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {u.is_premium ? (
                  <button onClick={() => revokePremium(u.id, u.full_name || u.email)}
                    title="Revoke Premium"
                    className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-bold">
                    <X size={13} />
                  </button>
                ) : (
                  <button onClick={() => setGrantModal({ userId: u.id, name: u.full_name || u.email })}
                    title="Grant Premium"
                    className="p-1.5 rounded-lg bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 transition-all">
                    <Check size={13} />
                  </button>
                )}
                <button onClick={() => toggleBlock(u.id, u.full_name || u.email, u.is_blocked)}
                  title={u.is_blocked ? "Unblock" : "Block"}
                  className={`p-1.5 rounded-lg transition-all ${u.is_blocked ? "bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20" : "bg-[#1E293B] text-[#475569] hover:text-[#EF4444]"}`}>
                  <EyeOff size={13} />
                </button>
                <select
                  value={u.role}
                  onChange={e => changeRole(u.id, e.target.value)}
                  title="Change role"
                  className="bg-[#1E293B] border border-white/5 text-[#64748B] text-xs rounded-lg px-2 py-1.5 focus:outline-none hover:text-white transition-all"
                >
                  <option value="user">user</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 bg-[#0F1F35] border border-white/5 rounded-2xl">
              <Users size={32} className="text-[#475569] mx-auto mb-3" />
              <p className="text-[#64748B] text-sm">No users found</p>
            </div>
          )}
        </div>
      )}

      {/* Grant Premium Modal */}
      <AnimatePresence>
        {grantModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50" onClick={() => setGrantModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-white font-bold text-lg mb-1">Grant Premium Access</h3>
                <p className="text-[#64748B] text-sm mb-5">Granting to: <span className="text-white">{grantModal.name}</span></p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[#94A3B8] text-xs font-semibold block mb-2">Select Plan</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["monthly", "quarterly", "yearly"] as const).map(p => (
                        <button key={p} onClick={() => { setGrantPlan(p); setGrantMonths(p === "monthly" ? 1 : p === "quarterly" ? 3 : 12); }}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all capitalize ${
                            grantPlan === p ? "bg-[#2563EB] border-[#2563EB] text-white" : "bg-[#1E293B] border-white/5 text-[#64748B] hover:text-white"
                          }`}>
                          {p}<br />
                          <span className="font-normal text-[10px]">
                            {p === "monthly" ? "₦2,500" : p === "quarterly" ? "₦6,500" : "₦25,000"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="grant-months" className="text-[#94A3B8] text-xs font-semibold block mb-2">Duration (months)</label>
                    <input id="grant-months" type="number" min={1} max={24} value={grantMonths}
                      onChange={e => setGrantMonths(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#1E293B] border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]/40" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setGrantModal(null)}
                      className="flex-1 bg-[#1E293B] text-[#94A3B8] font-semibold py-3 rounded-xl text-sm">Cancel</button>
                    <button onClick={grantPremium} disabled={submitting}
                      className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                      {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={15} /> Grant Access</>}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}




function UniversitiesView() {
  const { data: universities, isLoading } = useUniversities();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", short_name: "", state: "" });
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  const { profile: adminProfile } = useAuth();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.short_name) return toast.error("Name and short name are required");
    setSubmitting(true);
    // Bypassing RLS using adminSupabase (Service Role Key)
    const { error } = await adminSupabase.from("universities").insert({
      name: form.name,
      short_name: form.short_name,
      state: form.state || null,
      is_active: true
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("University added!");
    if (adminProfile) logAdminAction(adminProfile.id, "add_university", { target_name: form.short_name });
    qc.invalidateQueries({ queryKey: ["universities"] });
    setShowAdd(false);
    setForm({ name: "", short_name: "", state: "" });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    // Bypassing RLS using adminSupabase (Service Role Key)
    const { error } = await adminSupabase.from("universities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("University deleted");
      if (adminProfile) logAdminAction(adminProfile.id, "delete_university", { target_name: name });
      qc.invalidateQueries({ queryKey: ["universities"] });
    }
  };

  const exportCSV = () => {
    if (!universities?.length) return;
    const rows = ["id,name,short_name,state", ...universities.map(u => `${u.id},"${u.name}","${u.short_name}","${u.state || ""}"`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "universities.csv"; a.click();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-white font-bold text-lg flex-1">University Management</h2>
        <button onClick={exportCSV}
          className="flex items-center gap-2 bg-[#1E293B] hover:bg-white/10 text-[#94A3B8] hover:text-white px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-white/5"
          title="Export CSV">
          Export CSV
        </button>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
          <Plus size={14} /> Add University
        </button>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-[#0F1F35]" />)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {universities?.map(uni => (
            <div key={uni.id} className="bg-[#0F1F35] border border-white/5 rounded-xl p-4 flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 flex items-center justify-center text-white font-bold text-sm">
                {uni.short_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate">{uni.short_name}</div>
                <div className="text-[#475569] text-xs truncate">{uni.state} · {uni.name}</div>
              </div>
              <button onClick={() => handleDelete(uni.id, uni.short_name)} title="Delete University" className="opacity-0 group-hover:opacity-100 p-2 text-[#475569] hover:text-red-500 transition-all">
                <Trash2 size={16} />
              </button>
              <span className={`w-2 h-2 rounded-full ${uni.is_active ? "bg-[#22C55E]" : "bg-[#475569]"}`} />
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowAdd(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4">
              <div className="bg-[#0B1829] border border-white/10 rounded-2xl p-7 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-bold text-lg">Add University</h3>
                  <button onClick={() => setShowAdd(false)} className="text-[#475569] hover:text-white" title="Close"><X size={18} /></button>
                </div>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Full Name *</label>
                    <input type="text" required placeholder="e.g. University of Lagos" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40" />
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Short Name *</label>
                    <input type="text" required placeholder="e.g. UNILAG" value={form.short_name} onChange={e => setForm(f => ({ ...f, short_name: e.target.value }))} className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40" />
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">State</label>
                    <input type="text" placeholder="e.g. Lagos" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-[#1E293B] text-[#94A3B8] font-semibold py-3 rounded-xl text-sm">Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center">
                      {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Add"}
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

function SubjectsView() {
  const { data: subjects, isLoading } = useSubjects();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();
  const { profile: adminProfile } = useAuth();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) return toast.error("Name and slug are required");
    setSubmitting(true);
    // Bypassing RLS using adminSupabase (Service Role Key)
    const { error } = await adminSupabase.from("subjects").insert({
      name: form.name,
      slug: form.slug,
      is_active: true
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Subject added!");
    if (adminProfile) logAdminAction(adminProfile.id, "add_subject", { target_name: form.name });
    qc.invalidateQueries({ queryKey: ["subjects"] });
    setShowAdd(false);
    setForm({ name: "", slug: "" });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    // Bypassing RLS using adminSupabase (Service Role Key)
    const { error } = await adminSupabase.from("subjects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Subject deleted");
      if (adminProfile) logAdminAction(adminProfile.id, "delete_subject", { target_name: name });
      qc.invalidateQueries({ queryKey: ["subjects"] });
    }
  };

  const exportSubjectsCSV = () => {
    if (!subjects?.length) return;
    const rows = ["id,name,slug", ...subjects.map(s => `${s.id},"${s.name}","${s.slug}"`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "subjects.csv"; a.click();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-white font-bold text-lg flex-1">Subject Management</h2>
        <button onClick={exportSubjectsCSV}
          className="flex items-center gap-2 bg-[#1E293B] hover:bg-white/10 text-[#94A3B8] hover:text-white px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-white/5"
          title="Export CSV">
          Export CSV
        </button>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
          <Plus size={14} /> Add Subject
        </button>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-[#0F1F35]" />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {subjects?.map(s => (
            <div key={s.id} className="bg-[#0F1F35] border border-white/5 rounded-xl p-4 flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center">
                <Tag size={14} className="text-[#A78BFA]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{s.name}</div>
                <div className="text-[#475569] text-xs truncate">{s.slug}</div>
              </div>
              <button onClick={() => handleDelete(s.id, s.name)} title="Delete Subject" className="opacity-0 group-hover:opacity-100 p-2 text-[#475569] hover:text-red-500 transition-all">
                <Trash2 size={16} />
              </button>
              <span className={`w-2 h-2 rounded-full ${s.is_active ? "bg-[#22C55E]" : "bg-[#475569]"}`} />
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowAdd(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4">
              <div className="bg-[#0B1829] border border-white/10 rounded-2xl p-7 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-bold text-lg">Add Subject</h3>
                  <button onClick={() => setShowAdd(false)} className="text-[#475569] hover:text-white" title="Close"><X size={18} /></button>
                </div>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Subject Name *</label>
                    <input type="text" required placeholder="e.g. Mathematics" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40" />
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] text-xs font-semibold mb-1.5">Slug *</label>
                    <input type="text" required placeholder="e.g. mathematics" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))} className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]/40" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-[#1E293B] text-[#94A3B8] font-semibold py-3 rounded-xl text-sm">Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center">
                      {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Add"}
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

export function AdminPage() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":       return <DashboardView />;
      case "revenue":         return <RevenueAnalytics />;
      case "announcements":   return <AnnouncementsView />;
      case "questions":       return <QuestionsView />;
      case "flashcards":      return <FlashcardsView />;
      case "universities":    return <UniversitiesView />;
      case "subjects":        return <SubjectsView />;
      case "users":           return <UsersView />;
      case "subscriptions":   return <ManualSubscriptionsView />;
      case "exam_configs":    return <ExamConfigsView />;
      case "bulk_upload":     return <BulkUploadView />;
      case "material_upload": return <MaterialUploadView />;
      case "flagged":         return <FlaggedQuestionsView />;
      case "activity_logs":   return <AdminLogsView />;
      case "email_broadcast": return <EmailBroadcastView />;
      case "site_settings":   return <SiteSettingsView />;
      default:                return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050D1A] flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-[#080F1E] border-r border-white/5 z-40">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Tonex CBT" className="w-7 h-7 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === item.id ? "bg-[#EF4444]/15 text-[#EF4444]" : "text-[#64748B] hover:text-white hover:bg-white/5"
              }`}>
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="text-[#475569] text-xs mb-3">{profile?.email}</div>
          <button onClick={() => { signOut(); navigate("/"); }}
            className="w-full flex items-center gap-2 text-[#475569] hover:text-[#EF4444] text-sm py-2 transition-colors">
            <LogOut size={15} /> Exit Admin
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-56 min-h-screen">
        {/* Top bar */}
        <div className="bg-[#080F1E] border-b border-white/5 px-4 sm:px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
          <div className="lg:hidden">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="text-[#64748B] hover:text-white" title="Toggle Navigation">
              <Settings size={20} />
            </button>
          </div>
          <div className="flex-1">
            <span className="text-white font-bold text-sm capitalize">{activeSection}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} />
              Admin Mode
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="lg:hidden bg-[#080F1E] border-b border-white/5 overflow-hidden">
              <div className="p-4 flex flex-wrap gap-2">
                {NAV_ITEMS.map(item => (
                  <button key={item.id} onClick={() => { setActiveSection(item.id); setMobileNavOpen(false); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
                      activeSection === item.id ? "bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]" : "border-white/5 text-[#64748B]"
                    }`}>
                    <item.icon size={13} />
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 sm:px-6 py-6">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {renderContent()}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
