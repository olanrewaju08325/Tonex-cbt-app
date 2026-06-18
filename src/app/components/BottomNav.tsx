import { useNavigate, useLocation } from "react-router";
import { Home, BookOpen, BarChart2, User, FileText } from "lucide-react";
import { motion } from "motion/react";

const NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: BookOpen, label: "Practice", path: "/practice" },
  { icon: BarChart2, label: "Full Exam", path: "/full-exam" },
  { icon: FileText, label: "Materials", path: "/materials" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-[#0F172A]/95 backdrop-blur-xl border-t border-white/8 px-2 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around max-w-sm mx-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl relative"
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-[#2563EB]/15 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon
                  size={22}
                  className={active ? "text-[#60A5FA]" : "text-[#475569]"}
                />
                <span className={`text-[10px] font-semibold ${active ? "text-[#60A5FA]" : "text-[#475569]"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
