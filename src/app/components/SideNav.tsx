import { useNavigate, useLocation } from "react-router";
import { Home, BookOpen, BarChart2, User, Crown, Trophy, FileText, Users, Calendar, Layers, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../lib/hooks/useSubscription";

const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: BookOpen, label: "Practice", path: "/practice" },
  { icon: BarChart2, label: "Full Exam", path: "/full-exam" },
  { icon: Users, label: "Challenges", path: "/challenges" },
  { icon: Calendar, label: "Timetable", path: "/scheduler" },
  { icon: FileText, label: "Materials", path: "/materials" },
  { icon: Layers, label: "Flashcards", path: "/flashcards" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: Crown, label: "Go Premium", path: "/premium" },
  { icon: BarChart2, label: "Analytics", path: "/analytics" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { data: subscription } = useSubscription();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-[#0B1829] border-r border-white/6 z-40">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.jpg" alt="Tonex CBT" className="w-8 h-8 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).classList.add('hidden'); }} />
          <span className="text-white font-bold text-lg font-['Manrope']">
            Tonex CBT
          </span>
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  active
                    ? "text-white"
                    : "text-[#64748B] hover:text-[#94A3B8] hover:bg-white/5"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidenav-pill"
                    className="absolute inset-0 bg-[#2563EB]/20 rounded-xl border border-[#2563EB]/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon size={18} className={active ? "text-[#60A5FA]" : ""} />
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-6 space-y-4">
        {profile?.is_premium ? (
          <div className="bg-gradient-to-br from-[#F59E0B]/10 to-[#D97706]/10 border border-[#F59E0B]/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={20} className="text-[#F59E0B]" />
              <span className="text-[#F59E0B] text-xs font-bold uppercase tracking-wider">Premium Active</span>
            </div>
            <p className="text-white text-sm font-bold capitalize">
              {subscription?.plan ? `${subscription.plan} Plan` : "Active Plan"}
            </p>
            {subscription?.expires_at && (
              <p className="text-[#64748B] text-[10px] mt-1">
                Expires: {new Date(subscription.expires_at).toLocaleDateString()}
              </p>
            )}
            
            {subscription?.plan === "quarterly" && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <a
                  href="https://wa.me/2349043554038?text=Hello%20Tonex%20CBT%20Support%2C%20I%20am%20a%20Quarterly%20subscriber%20and%20need%20Priority%20Support."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#60A5FA] text-xs font-bold py-1.5 rounded-lg border border-[#2563EB]/30 transition-all"
                >
                  <MessageCircle size={12} />
                  Priority Support
                </a>
              </div>
            )}
            {subscription?.plan === "yearly" && (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                <a
                  href="https://wa.me/2349043554038?text=Hello%20Tonex%20CBT%20Support%2C%20I%20am%20a%20Yearly%20subscriber%20and%20need%20Priority%20Support."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#60A5FA] text-xs font-bold py-1.5 rounded-lg border border-[#2563EB]/30 transition-all"
                >
                  <MessageCircle size={12} />
                  Priority Support
                </a>
                <a
                  href="https://wa.me/2349043554038?text=Hello%20Tonex%20Coach%2C%20I%20am%20a%20Yearly%20subscriber%20and%20would%20like%20to%20schedule%20a%20Performance%20Coaching%20session."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] text-xs font-bold py-1.5 rounded-lg border border-[#F59E0B]/30 transition-all"
                >
                  <Crown size={12} />
                  Performance Coaching
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#0B3D91]/40 to-[#2563EB]/20 border border-[#2563EB]/20 rounded-2xl p-4">
            <Crown size={20} className="text-[#F59E0B] mb-2" />
            <p className="text-white text-sm font-semibold mb-1">Go Premium</p>
            <p className="text-[#64748B] text-xs mb-3">Unlock unlimited practice & analytics</p>
            <button
              onClick={() => navigate("/premium")}
              className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white text-xs font-semibold py-2 rounded-lg"
            >
              Upgrade Now
            </button>
          </div>
        )}
        
        <button
          onClick={() => {
            const el = document.getElementById('qr-modal');
            if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
          }}
          className="w-full flex items-center justify-center gap-2 bg-[#0F1F35] border border-white/10 hover:bg-white/5 text-[#94A3B8] hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
          Get Mobile App
        </button>
      </div>

      {/* QR Code Modal (Global-ish) */}
      <div id="qr-modal" className="fixed inset-0 bg-black/80 z-50 hidden items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => {
        if (e.target === e.currentTarget) { e.currentTarget.classList.add('hidden'); e.currentTarget.classList.remove('flex'); }
      }}>
        <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative">
          <button onClick={() => {
            const m = document.getElementById('qr-modal');
            if(m) { m.classList.add('hidden'); m.classList.remove('flex'); }
          }} className="absolute top-4 right-4 text-[#64748B] hover:text-white" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <h3 className="text-white font-bold text-xl mb-2">Tonex CBT Mobile</h3>
          <p className="text-[#64748B] text-sm mb-6">Scan with your phone's camera to install the app instantly.</p>
          <div className="bg-white p-3 rounded-2xl inline-block shadow-lg mx-auto mb-6">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://tonex-five.vercel.app" alt="QR Code" className="w-48 h-48 rounded-xl" />
          </div>
          <p className="text-[#94A3B8] text-xs">Supports iOS (Safari) and Android (Chrome). Just "Add to Home Screen".</p>
        </div>
      </div>
    </aside>
  );
}
