import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Send, Megaphone, Trash2 } from "lucide-react";
import { Announcement } from "../../../lib/hooks/useAnnouncements";

export function AnnouncementsView() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setAnnouncements(data);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePost = async () => {
    if (!title || !message) return toast.error("Please fill all fields");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('announcements').insert({
      title,
      message,
      created_by: user?.id,
      priority: 10
    });
    
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Announcement posted!");
      setTitle("");
      setMessage("");
      fetchAnnouncements();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Deleted successfully");
      fetchAnnouncements();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Megaphone size={20} className="text-[#2563EB]" /> Post New Announcement
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Announcement Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#2563EB]"
          />
          <textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-32 bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#2563EB] resize-none"
          />
          <button
            onClick={handlePost}
            disabled={loading}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Send size={18} />
            {loading ? "Posting..." : "Broadcast to All Students"}
          </button>
        </div>
      </div>

      <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-bold mb-4">Recent Announcements</h3>
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="bg-[#1E293B] p-4 rounded-xl flex items-start justify-between group">
              <div>
                <h4 className="text-white font-semibold">{a.title}</h4>
                <p className="text-[#94A3B8] text-sm mt-1">{a.message}</p>
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-[#64748B] hover:text-red-500 transition-colors p-2" title="Delete Announcement">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-[#64748B] text-sm">No announcements yet.</p>}
        </div>
      </div>
    </div>
  );
}
