import { useState } from "react";
import { motion } from "motion/react";
import { X, Delete, GripHorizontal } from "lucide-react";

interface CbtCalculatorProps {
  onClose: () => void;
}

export function CbtCalculator({ onClose }: CbtCalculatorProps) {
  const [display, setDisplay] = useState("");
  const [history, setHistory] = useState("");

  const handleKeyPress = (val: string) => {
    if (val === "C") {
      setDisplay("");
      setHistory("");
    } else if (val === "DEL") {
      setDisplay((prev) => prev.slice(0, -1));
    } else if (val === "=") {
      try {
        if (!display) return;
        // Clean the display string before execution
        let sanitized = display
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/π/g, "3.14159265");

        // Safe evaluation of simple math expression
        // eslint-disable-next-line no-eval
        const result = eval(sanitized);
        setHistory(display + " =");
        setDisplay(Number(result.toFixed(6)).toString());
      } catch (err) {
        setDisplay("Error");
      }
    } else if (val === "√") {
      try {
        if (!display) return;
        const res = Math.sqrt(parseFloat(display));
        setHistory(`√(${display})`);
        setDisplay(res.toString());
      } catch {
        setDisplay("Error");
      }
    } else if (val === "x²") {
      try {
        if (!display) return;
        const res = Math.pow(parseFloat(display), 2);
        setHistory(`(${display})²`);
        setDisplay(res.toString());
      } catch {
        setDisplay("Error");
      }
    } else {
      // Append number or operator
      if (display === "Error") {
        setDisplay(val);
      } else {
        setDisplay((prev) => prev + val);
      }
    }
  };

  const BUTTONS = [
    ["√", "x²", "π", "C"],
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "-"],
    ["0", ".", "DEL", "+"],
    ["%", "="]
  ];

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.05}
      initial={{ opacity: 0, scale: 0.9, y: 100, x: 50 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-50 bottom-16 right-4 sm:right-10 w-72 bg-[#0F172A]/90 border border-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden shadow-blue-500/10 cursor-default select-none"
    >
      {/* Header / Grip */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5 cursor-grab active:cursor-grabbing text-white">
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-[#64748B]" />
          <span className="text-xs font-bold text-slate-300">CBT Calculator</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all"
          title="Close Calculator"
        >
          <X size={14} />
        </button>
      </div>

      {/* Screen Display */}
      <div className="p-4 bg-black/25 flex flex-col items-end justify-center min-h-[70px] border-b border-white/5 font-mono">
        <div className="text-[#64748B] text-xs h-4 truncate max-w-full">
          {history}
        </div>
        <div className="text-white text-xl font-bold truncate max-w-full mt-1">
          {display || "0"}
        </div>
      </div>

      {/* Keyboard Grid */}
      <div className="p-3 bg-white/5 grid grid-cols-4 gap-2">
        {BUTTONS.map((row, rIdx) => {
          // Double width for "=" and "%" buttons on the last row
          const isLastRow = rIdx === 5;
          return row.map((btn) => {
            const isOperator = ["÷", "×", "-", "+", "="].includes(btn);
            const isSpecial = ["C", "DEL", "√", "x²", "π"].includes(btn);
            
            return (
              <button
                key={btn}
                onClick={() => handleKeyPress(btn)}
                className={`py-3 text-sm font-bold rounded-xl transition-all active:scale-95 ${
                  isLastRow ? "col-span-2" : ""
                } ${
                  isOperator
                    ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                    : isSpecial
                    ? "bg-[#1E293B] hover:bg-white/10 text-[#60A5FA]"
                    : "bg-[#1E293B]/60 hover:bg-[#1E293B] text-slate-200"
                }`}
              >
                {btn}
              </button>
            );
          });
        })}
      </div>
    </motion.div>
  );
}
