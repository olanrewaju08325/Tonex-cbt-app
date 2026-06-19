import { useState } from "react";
import { Mail, Send, Users, AlertCircle, CheckCircle, RefreshCw, Eye } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

export function EmailBroadcastView() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "premium" | "free" | "test">("test");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please enter both a subject and an email body");
      return;
    }

    if (audience === "test" && !testEmail.trim()) {
      toast.error("Please enter a test email address");
      return;
    }

    setSending(true);
    setLogs(["Initializing email broadcast service..."]);
    setProgress({ current: 0, total: 0 });

    try {
      // 1. Gather target recipients
      let recipients: { email: string; full_name: string }[] = [];

      if (audience === "test") {
        recipients = [{ email: testEmail.trim(), full_name: "Test Recipient" }];
      } else {
        setLogs((prev) => [...prev, "Querying user accounts from database..."]);
        let query = supabase.from("profiles").select("email, full_name");

        if (audience === "premium") {
          query = query.eq("is_premium", true);
        } else if (audience === "free") {
          query = query.eq("is_premium", false);
        }

        const { data, error } = await query;
        if (error) throw error;
        recipients = (data || []).filter((r) => r.email);
      }

      if (recipients.length === 0) {
        setLogs((prev) => [...prev, "❌ No recipients found for selected audience filter."]);
        toast.info("No recipients found for this audience");
        setSending(false);
        return;
      }

      setProgress({ current: 0, total: recipients.length });
      setLogs((prev) => [
        ...prev,
        `Ready to dispatch ${recipients.length} email(s) to ${audience} users.`,
      ]);

      // 2. Loop and send email via RPC helper
      let sentCount = 0;
      let failCount = 0;

      for (let i = 0; i < recipients.length; i++) {
        const item = recipients[i];
        try {
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; background-color: #08142D; color: #ffffff; padding: 30px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #60A5FA; margin-bottom: 5px;">Tonex CBT</h2>
              </div>
              <div style="background-color: #0F172A; padding: 25px; border-radius: 15px; border: 1px solid rgba(255, 255, 255, 0.05); line-height: 1.6;">
                <h3 style="color: #ffffff; margin-top: 0; font-size: 16px;">Hello ${item.full_name},</h3>
                <div style="color: #CBD5E1; font-size: 14px;">${body.replace(/\n/g, "<br />")}</div>
              </div>
              <div style="text-align: center; color: #64748B; font-size: 11px; margin-top: 25px;">
                <p>This is a transactional update from Tonex CBT. You are receiving this because you registered an account on our app.</p>
                <p>&copy; 2026 Tonex CBT. All rights reserved.</p>
              </div>
            </div>
          `;

          const { error } = await supabase.rpc("send_email_via_brevo", {
            recipient_email: item.email,
            recipient_name: item.full_name || "Student",
            subject: subject,
            html_content: htmlContent,
          });

          if (error) throw error;
          sentCount++;
          setLogs((prev) => [...prev, `✅ Sent successfully to ${item.email}`]);
        } catch (err: any) {
          failCount++;
          setLogs((prev) => [...prev, `❌ Failed sending to ${item.email}: ${err.message}`]);
        }

        setProgress((prev) => ({ ...prev, current: i + 1 }));

        // Pause 150ms between requests to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      setLogs((prev) => [
        ...prev,
        `Broadcast Completed. Sent: ${sentCount}, Failed: ${failCount}`,
      ]);
      toast.success(`Completed! Sent: ${sentCount}, Failed: ${failCount}`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred during broadcasting");
      setLogs((prev) => [...prev, `❌ Critical Error: ${err.message}`]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white font-['Manrope'] flex items-center gap-2">
            <Mail className="text-[#EF4444]" size={20} />
            Brevo Email Broadcast System
          </h2>
          <p className="text-[#64748B] text-xs mt-0.5">
            Deliver custom notifications and reports to registered student profiles
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer */}
        <div className="lg:col-span-7 bg-[#080F1E] border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-bold text-sm border-b border-white/5 pb-2">1. Compose Message</h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[#64748B] text-[10px] uppercase font-bold">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#EF4444]/30"
                  disabled={sending}
                >
                  <option value="test">Single Recipient (Test Email)</option>
                  <option value="all">All Registered Students</option>
                  <option value="premium">Premium Subscribers Only</option>
                  <option value="free">Free Users Only</option>
                </select>
              </div>

              {audience === "test" && (
                <div className="space-y-1 animate-in fade-in-50">
                  <label className="text-[#64748B] text-[10px] uppercase font-bold">Test Email Address</label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="e.g. test@gmail.com"
                    className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#EF4444]/30"
                    disabled={sending}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[#64748B] text-[10px] uppercase font-bold">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Important Update: Post-UTME Exam Registrations"
                className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#EF4444]/30"
                disabled={sending}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#64748B] text-[10px] uppercase font-bold">Message Body (Plain Text/HTML linebreaks)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email body message here..."
                rows={8}
                className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#EF4444]/30 resize-none"
                disabled={sending}
              />
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="w-full bg-gradient-to-r from-[#EF4444] to-[#B91C1C] hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-950/20"
          >
            {sending ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {sending ? "Broadcasting..." : "Dispatch Broadcast"}
          </button>
        </div>

        {/* Console / Logs */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Sending Status */}
          <div className="bg-[#080F1E] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-white font-bold text-sm border-b border-white/5 pb-2 flex items-center gap-2">
              <Users size={15} className="text-[#60A5FA]" />
              Transmission Progress
            </h3>

            {progress.total > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#94A3B8]">
                  <span>Progress</span>
                  <span className="font-bold text-white">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-[#0F172A] rounded-full h-2 overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-[#EF4444] to-[#B91C1C] h-2 rounded-full transition-all duration-150"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-[#64748B] text-xs">
                <Mail className="mx-auto opacity-30 mb-2" size={30} />
                No active broadcast in progress
              </div>
            )}
          </div>

          {/* Log Console */}
          <div className="bg-[#080F1E] border border-white/5 rounded-2xl p-5 flex-1 flex flex-col min-h-[220px]">
            <h3 className="text-white font-bold text-sm border-b border-white/5 pb-2 mb-3">Console Log</h3>
            <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[10px] text-[#22C55E] overflow-y-auto max-h-[200px] space-y-1 scrollbar-thin">
              {logs.map((log, index) => (
                <div key={index} className="leading-relaxed">{log}</div>
              ))}
              {logs.length === 0 && (
                <div className="text-[#475569] italic">Logger idle... waiting for broadcast.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
