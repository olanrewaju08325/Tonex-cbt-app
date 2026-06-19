import { Outlet } from "react-router";
import { useState, useEffect } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { InstallPrompt } from "./InstallPrompt";
import { OfflineBanner } from "./OfflineBanner";
import { UniversityOnboardingModal } from "./UniversityOnboardingModal";
import { ReloadPrompt } from "./ReloadPrompt";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../lib/hooks/useSubscription";
import { syncOfflineSessions } from "../../lib/offlineCache";
import { toast } from "sonner";

export function AppLayout() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { data: subscription } = useSubscription();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (user) {
        try {
          const count = await syncOfflineSessions(user.id);
          if (count > 0) {
            toast.success(`Internet reconnected! Automatically synced ${count} offline practice session(s) to your stats.`);
          }
        } catch (e) {
          console.error("Auto-sync failed:", e);
        }
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user]);

  // Subscription expiry local notifications check
  useEffect(() => {
    if (!subscription || subscription.status !== 'active' || !subscription.expires_at) return;

    const expiresAt = new Date(subscription.expires_at).getTime();
    const now = Date.now();
    const diffTime = expiresAt - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= 3) {
      const todayStr = new Date().toDateString();
      const lastNotified = localStorage.getItem("tonex_expiry_notified");

      if (lastNotified !== todayStr) {
        if (typeof Notification !== 'undefined') {
          if (Notification.permission === 'default') {
            Notification.requestPermission();
          }
          if (Notification.permission === 'granted') {
            new Notification("Premium Subscription Expiring Soon!", {
              body: `Your Tonex CBT Premium subscription expires in ${diffDays} day(s). Renew now to maintain unlimited practice, offline access, and analytics!`,
              icon: "/logo.jpg"
            });
            localStorage.setItem("tonex_expiry_notified", todayStr);
          }
        }
      }
    }
  }, [subscription]);

  return (
    <div className="min-h-screen bg-[#08142D] flex flex-col md:flex-row">
      <OfflineBanner />
      
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0F172A]/90 backdrop-blur-md border-b border-white/6 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Tonex" className="w-6 h-6 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).classList.add('hidden'); }} />
          <span className="text-white text-sm font-extrabold font-['Manrope']">Tonex CBT</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#94A3B8]">
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-[#22C55E] animate-pulse" : "bg-[#F59E0B]"}`} />
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>
      </div>

      <SideNav />
      <main className="flex-1 pb-20 md:pb-0 md:pl-64 min-h-screen overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
      <ReloadPrompt />
      <UniversityOnboardingModal />
    </div>
  );
}
