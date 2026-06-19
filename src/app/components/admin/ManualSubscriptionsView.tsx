import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, XCircle, Search, CreditCard, Activity, Ban,
  RefreshCw, User, Calendar, DollarSign, Clock, ChevronDown, ChevronUp,
  Filter, ArrowUpRight
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "../../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";

const PLAN_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const PLAN_COLORS: Record<string, string> = {
  monthly:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  quarterly: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  yearly:    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  manual:    "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-500/10 text-green-400",
  pending:   "bg-amber-500/10 text-amber-400",
  cancelled: "bg-red-500/10 text-red-400",
  expired:   "bg-gray-500/10 text-gray-400",
};

interface Subscription {
  id: string;
  plan: string;
  amount: number;
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  starts_at: string | null;
  expires_at: string | null;
  approved_at: string | null;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  user_premium: boolean;
}

export function ManualSubscriptionsView() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_admin_subscriptions");
    if (error) {
      toast.error(`Failed to load subscriptions: ${error.message}`);
    } else {
      setSubscriptions(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const logAction = async (action: string, sub: Subscription) => {
    if (!user) return;
    await supabase.from("admin_logs").insert({
      admin_id: user.id,
      action,
      target_type: "subscription",
      target_id: sub.id,
      details: {
        user_email: sub.user_email,
        user_name: sub.user_name,
        plan: sub.plan,
        amount: sub.amount,
        admin_notes: adminNote || null
      }
    });
  };

  const handleApprove = async (sub: Subscription) => {
    if (sub.status === "active") {
      toast.info("This subscription is already active.");
      return;
    }
    setProcessingId(sub.id);
    const months = PLAN_MONTHS[sub.plan] ?? 1;
    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        admin_notes: adminNote || null,
      })
      .eq("id", sub.id);

    if (error) {
      toast.error(`Failed to approve: ${error.message}`);
    } else {
      await logAction("APPROVE_SUBSCRIPTION", sub);
      toast.success(`✅ Approved! ${sub.user_name || sub.user_email} now has ${sub.plan} access for ${months} month${months > 1 ? "s" : ""}.`);
      setExpandedId(null);
      setAdminNote("");
      fetchSubs();
    }
    setProcessingId(null);
  };

  const handleDeny = async (sub: Subscription) => {
    setProcessingId(sub.id);
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled", admin_notes: adminNote || "Denied by admin" })
      .eq("id", sub.id);

    if (error) {
      toast.error(error.message);
    } else {
      await logAction("DENY_SUBSCRIPTION", sub);
      toast.success("Subscription denied.");
      setExpandedId(null);
      setAdminNote("");
      fetchSubs();
    }
    setProcessingId(null);
  };

  const handleRevoke = async (sub: Subscription) => {
    if (!confirm(`Revoke premium access for ${sub.user_name || sub.user_email}?`)) return;
    setProcessingId(sub.id);
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled", admin_notes: adminNote || "Revoked by admin" })
      .eq("id", sub.id);

    if (error) {
      toast.error(error.message);
    } else {
      await logAction("REVOKE_SUBSCRIPTION", sub);
      toast.success("Premium access revoked.");
      fetchSubs();
    }
    setProcessingId(null);
  };

  const handleReactivate = async (sub: Subscription) => {
    setProcessingId(sub.id);
    const months = PLAN_MONTHS[sub.plan] ?? 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        admin_notes: "Reactivated by admin",
      })
      .eq("id", sub.id);

    if (error) {
      toast.error(error.message);
    } else {
      await logAction("REACTIVATE_SUBSCRIPTION", sub);
      toast.success("Subscription reactivated!");
      fetchSubs();
    }
    setProcessingId(null);
  };

  const filteredSubs = subscriptions.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    const q = search.toLowerCase();
    if (q && !(s.user_email?.toLowerCase().includes(q) ||
               s.user_name?.toLowerCase().includes(q) ||
               s.payment_reference?.toLowerCase().includes(q))) return false;
    return true;
  });

  const counts = {
    all: subscriptions.length,
    pending: subscriptions.filter(s => s.status === "pending").length,
    active: subscriptions.filter(s => s.status === "active").length,
    cancelled: subscriptions.filter(s => s.status === "cancelled").length,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <CreditCard className="text-[#3B82F6]" size={22} /> Subscription Requests
          </h2>
          <p className="text-[#64748B] text-xs mt-1">Approve, deny or revoke student subscriptions</p>
        </div>
        <button onClick={fetchSubs} className="flex items-center gap-2 bg-[#1E293B] hover:bg-white/10 text-[#94A3B8] px-4 py-2 rounded-xl text-sm transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["all", "pending", "active", "cancelled"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all border capitalize ${
              filter === f
                ? "bg-[#2563EB] border-[#2563EB] text-white"
                : "bg-[#0F1F35] border-white/5 text-[#64748B] hover:text-white"
            }`}
          >
            {f} ({counts[f as keyof typeof counts] ?? counts.all})
          </button>
        ))}

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={14} />
          <input
            type="text"
            placeholder="Search name, email or ref..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#0F1F35] border border-white/5 rounded-xl pl-8 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-[#2563EB]/40 w-56"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl bg-[#0F1F35]" />
          ))
        ) : filteredSubs.length === 0 ? (
          <div className="text-center py-16 bg-[#0F1F35] border border-white/5 rounded-2xl">
            <CreditCard size={32} className="text-[#475569] mx-auto mb-3" />
            <p className="text-[#64748B] text-sm">No subscriptions found</p>
          </div>
        ) : (
          filteredSubs.map((sub) => {
            const isExpanded = expandedId === sub.id;
            const isProcessing = processingId === sub.id;

            return (
              <motion.div
                key={sub.id}
                layout
                className="bg-[#0F1F35] border border-white/5 rounded-2xl overflow-hidden"
              >
                {/* Row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#2563EB]/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(sub.user_name || sub.user_email || "?").charAt(0).toUpperCase()}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm truncate">
                        {sub.user_name || "Unknown"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PLAN_COLORS[sub.plan] || PLAN_COLORS.manual}`}>
                        {sub.plan} • ₦{(sub.amount || 0).toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[sub.status] || STATUS_COLORS.cancelled}`}>
                        {sub.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[#64748B] text-xs">{sub.user_email}</span>
                      <span className="text-[#475569] text-xs">
                        {new Date(sub.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Quick actions for pending */}
                  {sub.status === "pending" && (
                    <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        disabled={isProcessing}
                        onClick={() => handleApprove(sub)}
                        className="bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/25 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => handleDeny(sub)}
                        className="bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/25 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <XCircle size={13} /> Deny
                      </button>
                    </div>
                  )}

                  <button className="text-[#475569] shrink-0">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/5 overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        {/* Detail grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { icon: DollarSign, label: "Amount", value: `₦${(sub.amount || 0).toLocaleString()}` },
                            { icon: ArrowUpRight, label: "Reference", value: sub.payment_reference || "None" },
                            { icon: Calendar, label: "Starts", value: sub.starts_at ? new Date(sub.starts_at).toLocaleDateString() : "—" },
                            { icon: Clock, label: "Expires", value: sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "—" },
                          ].map(item => (
                            <div key={item.label} className="bg-[#1E293B] rounded-xl p-3">
                              <div className="flex items-center gap-1.5 text-[#64748B] text-xs mb-1">
                                <item.icon size={11} /> {item.label}
                              </div>
                              <div className="text-white text-sm font-semibold truncate">{item.value}</div>
                            </div>
                          ))}
                        </div>

                        {sub.payment_proof_url && (
                          <div className="bg-[#1E293B]/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#60A5FA]">
                                <FileText size={18} />
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-sm">Payment Receipt Attached</h4>
                                <p className="text-[#64748B] text-xs">Verify receipt proof from storage</p>
                              </div>
                            </div>
                            <a
                              href={sub.payment_proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1"
                            >
                              <ArrowUpRight size={14} /> View Receipt
                            </a>
                          </div>
                        )}

                        {/* Admin notes */}
                        <div>
                          <label className="text-[#64748B] text-xs mb-1 block">Admin Notes (optional)</label>
                          <textarea
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            placeholder="Add a note visible in audit log..."
                            rows={2}
                            className="w-full bg-[#1E293B] border border-white/5 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2563EB]/40 resize-none"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {sub.status === "pending" && (
                            <>
                              <button
                                disabled={isProcessing}
                                onClick={() => handleApprove(sub)}
                                className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                              >
                                <CheckCircle size={15} />
                                Approve {sub.plan} ({PLAN_MONTHS[sub.plan] ?? 1}mo)
                              </button>
                              <button
                                disabled={isProcessing}
                                onClick={() => handleDeny(sub)}
                                className="flex items-center gap-2 bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/25 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                              >
                                <XCircle size={15} /> Deny
                              </button>
                            </>
                          )}
                          {sub.status === "active" && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleRevoke(sub)}
                              className="flex items-center gap-2 bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/25 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            >
                              <Ban size={15} /> Revoke Access
                            </button>
                          )}
                          {(sub.status === "cancelled" || sub.status === "expired") && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleReactivate(sub)}
                              className="flex items-center gap-2 bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            >
                              <Activity size={15} /> Reactivate
                            </button>
                          )}
                        </div>

                        {sub.admin_notes && (
                          <div className="bg-[#1E293B] rounded-xl p-3 text-[#64748B] text-xs">
                            <span className="text-[#94A3B8] font-semibold">Previous note: </span>
                            {sub.admin_notes}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
