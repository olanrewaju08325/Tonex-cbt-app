import { Outlet } from "react-router";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { InstallPrompt } from "./InstallPrompt";
import { OfflineBanner } from "./OfflineBanner";
import { UniversityOnboardingModal } from "./UniversityOnboardingModal";
import { ReloadPrompt } from "./ReloadPrompt";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#08142D] flex">
      <OfflineBanner />
      <SideNav />
      <main className="flex-1 pb-20 md:pb-0 md:pl-64 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
      <ReloadPrompt />
      <UniversityOnboardingModal />
    </div>
  );
}
