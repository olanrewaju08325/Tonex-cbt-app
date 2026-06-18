import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Building2, ArrowRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useUniversities } from "../../lib/hooks/useUniversities";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";

export function UniversityOnboardingModal() {
  const { profile, updateProfile } = useAuth();
  const { data: universities, isLoading } = useUniversities();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUni, setSelectedUni] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If we have a profile, and it has no target university, open the modal
    if (profile && !profile.target_university_id) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!selectedUni) {
      toast.error("Please select a university to continue");
      return;
    }
    
    setSaving(true);
    const { error } = await updateProfile({ target_university_id: selectedUni });
    setSaving(false);
    
    if (error) {
      toast.error("Failed to save university preference");
    } else {
      toast.success("University preference saved!");
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#08142D]/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2563EB] to-[#0B3D91]" />
          
          <div className="text-center mb-6 mt-2">
            <div className="w-16 h-16 rounded-full bg-[#2563EB]/10 flex items-center justify-center mx-auto mb-4">
              <Building2 size={32} className="text-[#60A5FA]" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2 font-['Manrope']">Welcome to Tonex CBT!</h2>
            <p className="text-[#94A3B8] text-sm">
              To give you the best practice experience, please select your target university. You can always change this later in your profile.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-[#94A3B8] text-xs font-semibold mb-2 uppercase tracking-wide">
              Target University
            </label>
            {isLoading ? (
              <Skeleton className="h-12 w-full bg-[#1E293B] rounded-xl" />
            ) : (
              <select
                value={selectedUni}
                onChange={(e) => setSelectedUni(e.target.value)}
                className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all appearance-none"
                title="Select Target University"
              >
                <option value="" className="bg-[#1E293B]">Select your university...</option>
                {universities?.map(uni => (
                  <option key={uni.id} value={uni.id} className="bg-[#1E293B]">
                    {uni.name} ({uni.short_name})
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="w-full bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Start Practicing"}
            {!saving && <ArrowRight size={18} />}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
