import { useState } from "react";
import { Mail, Send, Users, RefreshCw, MessageSquare } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

export function EmailBroadcastView() {
  const [mode, setMode] = useState<"email" | "sms">("email");
  
  // Email states
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  
  // SMS states
  const [smsBody, setSmsBody] = useState("");
  const [testPhone, setTestPhone] = useState("");
  
  // Common states
  const [audience, setAudience] = useState<"all" | "premium" | "free" | "test">("test");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  // Phone number formatter helper for Nigerian numbers
  const formatPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, ""); // remove all non-digits
    if (cleaned.startsWith("0")) {
      cleaned = "234" + cleaned.substring(1);
    }
    if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
    return cleaned;
  };

  const handleSend = async () => {
    if (mode === "email") {
      if (!subject.trim() || !body.trim()) {
        toast.error("Please enter both a subject and an email body");
        return;
      }
      if (audience === "test" && !testEmail.trim()) {
        toast.error("Please enter a test email address");
        return;
      }
    } else {
      if (!smsBody.trim()) {
        toast.error("Please enter an SMS body message");
        return;
      }
      if (audience === "test" && !testPhone.trim()) {
        toast.error("Please enter a test phone number");
        return;
      }
    }

    setSending(true);
    setLogs([`Initializing Brevo ${mode === "email" ? "Email" : "SMS"} broadcast service...`]);
    setProgress({ current: 0, total: 0 });

    try {
      // 1. Gather target recipients
      let recipients: any[] = [];

      if (audience === "test") {
        if (mode === "email") {
          recipients = [{ email: testEmail.trim(), full_name: "Test Recipient" }];
        } else {
          recipients = [{ phone: testPhone.trim(), full_name: "Test Recipient" }];
        }
      } else {
        setLogs((prev) => [...prev, "Querying user accounts from database..."]);
        
        let selectFields = "full_name";
        if (mode === "email") selectFields += ", email";
        else selectFields += ", phone";

        let query = supabase.from("profiles").select(selectFields);

        if (audience === "premium") {
          query = query.eq("is_premium", true);
        } else if (audience === "free") {
          query = query.eq("is_premium", false);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (mode === "email") {
          recipients = (data || []).filter((r) => r.email);
        } else {
          recipients = (data || []).filter((r) => r.phone && r.phone.trim());
        }
      }

      if (recipients.length === 0) {
        setLogs((prev) => [...prev, `❌ No recipients found with a valid ${mode === "email" ? "email" : "phone number"} for selected filter.`]);
        toast.info("No recipients found for this audience");
        setSending(false);
        return;
      }

      setProgress({ current: 0, total: recipients.length });
      setLogs((prev) => [
        ...prev,
        `Ready to dispatch ${recipients.length} ${mode === "email" ? "email(s)" : "SMS message(s)"} to ${audience} users.`,
      ]);

      // 2. Loop and send messages
      let sentCount = 0;
      let failCount = 0;

      for (let i = 0; i < recipients.length; i++) {
        const item = recipients[i];
        try {
          if (mode === "email") {
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
            setLogs((prev) => [...prev, `✅ Email sent successfully to ${item.email}`]);
          } else {
            const formattedPhone = formatPhoneNumber(item.phone);
            const { error } = await supabase.rpc("send_sms_via_brevo", {
              recipient_phone: formattedPhone,
              message_content: smsBody,
            });

            if (error) throw error;
            sentCount++;
            setLogs((prev) => [...prev, `✅ SMS sent successfully to ${formattedPhone} (${item.full_name || "User"})`]);
          }
        } catch (err: any) {
          failCount++;
          const targetStr = mode === "email" ? item.email : item.phone;
          setLogs((prev) => [...prev, `❌ Failed sending to ${targetStr}: ${err.message}`]);
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

  // SMS part calculation details
  const smsCharCount = smsBody.length;
  const smsPartsCount = Math.ceil(smsCharCount / 160) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white font-['Manrope'] flex items-center gap-2">
            <Mail className="text-[#EF4444]" size={20} />
            Brevo Broadcast & Communication
          </h2>
          <p className="text-[#64748B] text-xs mt-0.5">
            Deliver custom notifications, announcements, emails, or SMS alerts to registered student profiles
          </p>
        </div>
        
        {/* Toggle Mode */}
        <div className="flex bg-[#0F172A] border border-white/5 p-1 rounded-xl shrink-0 self-start md:self-center">
          <button
            onClick={() => { setMode("email"); setLogs([]); setProgress({ current: 0, total: 0 }); }}
            disabled={sending}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === "email" 
                ? "bg-[#EF4444] text-white" 
                : "text-[#64748B] hover:text-white disabled:opacity-50"
            }`}
          >
            <Mail size={13} />
            Email Mode
          </button>
          <button
            onClick={() => { setMode("sms"); setLogs([]); setProgress({ current: 0, total: 0 }); }}
            disabled={sending}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === "sms" 
                ? "bg-[#F59E0B] text-white" 
                : "text-[#64748B] hover:text-white disabled:opacity-50"
            }`}
          >
            <MessageSquare size={13} />
            SMS Mode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer */}
        <div className="lg:col-span-7 bg-[#080F1E] border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-bold text-sm border-b border-white/5 pb-2">
            1. Compose {mode === "email" ? "Email" : "SMS"}
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[#64748B] text-[10px] uppercase font-bold">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#EF4444]/30"
                  disabled={sending}
                >
                  <option value="test">Single Recipient (Test Mode)</option>
                  <option value="all">All Registered Students</option>
                  <option value="premium">Premium Subscribers Only</option>
                  <option value="free">Free Users Only</option>
                </select>
              </div>

              {audience === "test" && (
                <div className="space-y-1 animate-in fade-in-50">
                  <label className="text-[#64748B] text-[10px] uppercase font-bold">
                    {mode === "email" ? "Test Email Address" : "Test Phone Number"}
                  </label>
                  <input
                    type={mode === "email" ? "email" : "text"}
                    value={mode === "email" ? testEmail : testPhone}
                    onChange={(e) => mode === "email" ? setTestEmail(e.target.value) : setTestPhone(e.target.value)}
                    placeholder={mode === "email" ? "e.g. student@gmail.com" : "e.g. +2348030000000"}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#EF4444]/30"
                    disabled={sending}
                  />
                </div>
              )}
            </div>

            {mode === "email" ? (
              // EMAIL COMPOSER FIELDS
              <>
                <div className="space-y-1">
                  <label className="text-[#64748B] text-[10px] uppercase font-bold">Email Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Important Update: Post-UTME CBT Portal Open"
                    className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#EF4444]/30"
                    disabled={sending}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#64748B] text-[10px] uppercase font-bold">Message Body</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your email body message here..."
                    rows={8}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#EF4444]/30 resize-none"
                    disabled={sending}
                  />
                </div>
              </>
            ) : (
              // SMS COMPOSER FIELDS
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[#64748B] text-[10px] uppercase font-bold">SMS Content</label>
                  <span className={`text-[9px] font-bold ${smsCharCount > 160 ? "text-[#F59E0B]" : "text-[#64748B]"}`}>
                    {smsCharCount} chars · {smsPartsCount} {smsPartsCount === 1 ? "part" : "parts"}
                  </span>
                </div>
                <textarea
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  placeholder="Write your transactional SMS message here... Keep under 160 chars to use 1 SMS credit."
                  rows={6}
                  maxLength={500}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#F59E0B]/30 resize-none font-sans"
                  disabled={sending}
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={
              sending || 
              (mode === "email" ? (!subject.trim() || !body.trim()) : !smsBody.trim())
            }
            className={`w-full hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
              mode === "email" 
                ? "bg-gradient-to-r from-[#EF4444] to-[#B91C1C] shadow-red-950/20" 
                : "bg-gradient-to-r from-[#F59E0B] to-[#D97706] shadow-amber-950/20"
            }`}
          >
            {sending ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {sending ? "Broadcasting..." : `Dispatch ${mode === "email" ? "Email" : "SMS"} Broadcast`}
          </button>
        </div>

        {/* Console / Progress */}
        <div className="lg:col-span-5 flex flex-col gap-4">
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
                    className={`h-2 rounded-full transition-all duration-150 ${
                      mode === "email" 
                        ? "bg-gradient-to-r from-[#EF4444] to-[#B91C1C]" 
                        : "bg-gradient-to-r from-[#F59E0B] to-[#D97706]"
                    }`}
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-[#64748B] text-xs">
                {mode === "email" ? (
                  <Mail className="mx-auto opacity-30 mb-2" size={30} />
                ) : (
                  <MessageSquare className="mx-auto opacity-30 mb-2" size={30} />
                )}
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
