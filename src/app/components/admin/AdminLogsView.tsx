import { supabase } from "../../../lib/supabase";
import { Shield, User, Trash2, Crown, FileQuestion, Settings } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useQuery } from "@tanstack/react-query";

async function fetchLogs() {
  const { data, error } = await supabase
    .from("admin_logs")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

const ACTION_ICONS: Record<string, any> = {
  "grant_premium": Crown,
  "revoke_premium": Crown,
  "delete_question": FileQuestion,
  "add_university": Settings,
  "delete_university": Trash2,
  "add_subject": Settings,
  "delete_subject": Trash2,
  "block_user": User,
  "unblock_user": User,
  "change_role": Shield,
};

const ACTION_COLORS: Record<string, string> = {
  "grant_premium": "text-[#F59E0B] bg-[#F59E0B]/10",
  "revoke_premium": "text-[#EF4444] bg-[#EF4444]/10",
  "delete_question": "text-[#EF4444] bg-[#EF4444]/10",
  "add_university": "text-[#22C55E] bg-[#22C55E]/10",
  "delete_university": "text-[#EF4444] bg-[#EF4444]/10",
  "add_subject": "text-[#22C55E] bg-[#22C55E]/10",
  "delete_subject": "text-[#EF4444] bg-[#EF4444]/10",
  "block_user": "text-[#EF4444] bg-[#EF4444]/10",
  "unblock_user": "text-[#22C55E] bg-[#22C55E]/10",
  "change_role": "text-[#2563EB] bg-[#2563EB]/10",
};

function formatAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function AdminLogsView() {
  const { data: logs, isLoading } = useQuery({ queryKey: ["adminLogs"], queryFn: fetchLogs });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-white font-bold text-lg flex-1 flex items-center gap-2">
          <Shield size={20} className="text-[#2563EB]" /> Admin Activity Log
        </h2>
        <span className="text-[#475569] text-xs">{logs?.length || 0} entries</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl bg-[#0F1F35]" />)}</div>
      ) : logs?.length === 0 ? (
        <div className="bg-[#0F1F35] border border-white/5 rounded-2xl p-12 text-center">
          <Shield size={40} className="text-[#475569] mx-auto mb-3" />
          <p className="text-[#64748B] text-sm">No admin actions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs?.map((log: any) => {
            const Icon = ACTION_ICONS[log.action] || Shield;
            const colorCls = ACTION_COLORS[log.action] || "text-[#2563EB] bg-[#2563EB]/10";
            return (
              <div key={log.id} className="bg-[#0F1F35] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorCls}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-semibold">{formatAction(log.action)}</span>
                    {log.details?.target_name && (
                      <span className="text-[#64748B] text-xs">→ {log.details.target_name}</span>
                    )}
                  </div>
                  <div className="text-[#475569] text-xs mt-0.5">
                    by {log.profiles?.full_name || log.profiles?.email || "Unknown Admin"}
                  </div>
                </div>
                <div className="text-[#475569] text-xs shrink-0">
                  {new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
