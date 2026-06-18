import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (in standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay showing prompt slightly
      setTimeout(() => {
        if (!localStorage.getItem("pwa-dismissed")) setShow(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-dismissed", "1");
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80"
        >
          <div className="bg-[#0F172A] border border-[#2563EB]/30 rounded-2xl p-4 shadow-2xl shadow-blue-500/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 flex items-center justify-center shrink-0">
                <Download size={18} className="text-[#60A5FA]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm mb-0.5">Install Tonex CBT</p>
                <p className="text-[#64748B] text-xs">Add to your home screen for faster access and offline practice.</p>
              </div>
              <button onClick={handleDismiss} className="text-[#475569] hover:text-white shrink-0" title="Close">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleDismiss}
                className="flex-1 text-[#64748B] text-xs font-semibold py-2 rounded-xl bg-[#1E293B] hover:text-white transition-colors">
                Not now
              </button>
              <button onClick={handleInstall}
                className="flex-[2] bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white text-xs font-bold py-2 rounded-xl">
                Install App
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
