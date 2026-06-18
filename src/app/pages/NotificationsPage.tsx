import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bell, Check, CheckCircle2, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase.rpc("mark_all_notifications_read", { p_user_id: user?.id });
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted");
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 mt-4 md:mt-0">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-['Manrope']">Notifications</h1>
          <p className="text-[#94A3B8] text-sm mt-1">You have {unreadCount} unread message{unreadCount !== 1 && 's'}</p>
        </div>
        
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 bg-[#1E293B] hover:bg-[#2563EB]/20 text-[#60A5FA] px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <CheckCircle2 size={16} />
            <span className="hidden sm:inline">Mark all as read</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="w-full h-24 bg-[#1E293B] rounded-2xl" />
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 bg-[#0F172A] border border-white/5 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-[#475569]" />
            </div>
            <h3 className="text-white font-bold mb-1">No notifications yet</h3>
            <p className="text-[#64748B] text-sm">We'll let you know when there's something new.</p>
          </div>
        ) : (
          notifications.map((notif, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={notif.id}
              className={`p-4 md:p-5 rounded-2xl border transition-all ${
                notif.is_read 
                  ? "bg-[#0F172A] border-white/5" 
                  : "bg-[#1E293B]/50 border-[#2563EB]/30 shadow-[0_0_15px_rgba(37,99,235,0.05)]"
              }`}
            >
              <div className="flex gap-4">
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center mt-1 ${
                  notif.type === 'success' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                  notif.type === 'warning' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                  notif.type === 'promo' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' :
                  'bg-[#3B82F6]/10 text-[#3B82F6]'
                }`}>
                  <Bell size={18} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-bold ${notif.is_read ? 'text-[#CBD5E1]' : 'text-white'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-xs text-[#475569] shrink-0">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${notif.is_read ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>
                    {notif.body}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-4">
                    {!notif.is_read && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="text-xs font-semibold text-[#2563EB] hover:text-[#3B82F6] flex items-center gap-1"
                      >
                        <Check size={14} /> Mark read
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(notif.id)}
                      className="text-xs font-semibold text-[#EF4444]/70 hover:text-[#EF4444] flex items-center gap-1 ml-auto"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
