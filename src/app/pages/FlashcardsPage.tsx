import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useSubjects } from "../../lib/hooks/useSubjects";

interface Flashcard {
  id: string;
  subject_id: string | null;
  front: string;
  back: string;
}

// Fallback high-quality flashcards if DB query fails or table doesn't exist yet
const LOCAL_FALLBACK_FLASHCARDS: Record<string, Flashcard[]> = {
  physics: [
    {
      id: "f1",
      subject_id: "physics",
      front: "Newton's Second Law of Motion",
      back: "Force equals mass times acceleration (F = ma). The acceleration of an object is directly proportional to the net force acting on it."
    },
    {
      id: "f2",
      subject_id: "physics",
      front: "Ohm's Law",
      back: "The current through a conductor between two points is directly proportional to the voltage across the two points. V = IR (Voltage = Current x Resistance)."
    },
    {
      id: "f3",
      subject_id: "physics",
      front: "Work-Energy Theorem",
      back: "The net work done on an object is equal to the change in its kinetic energy (W = ΔKE)."
    },
    {
      id: "f4",
      subject_id: "physics",
      front: "Coulomb's Law",
      back: "The force of attraction or repulsion between two charged bodies is directly proportional to the product of their charges and inversely proportional to the square of the distance between them."
    }
  ],
  chemistry: [
    {
      id: "f5",
      subject_id: "chemistry",
      front: "Avogadro's Number",
      back: "The number of constituent particles (atoms or molecules) in one mole of a given substance: 6.022 × 10²³."
    },
    {
      id: "f6",
      subject_id: "chemistry",
      front: "Boyle's Law",
      back: "At constant temperature, the volume of a given mass of gas is inversely proportional to its pressure: P₁V₁ = P₂V₂."
    },
    {
      id: "f7",
      subject_id: "chemistry",
      front: "Charles's Law",
      back: "At constant pressure, the volume of a given mass of gas is directly proportional to its absolute temperature in Kelvin: V₁/T₁ = V₂/T₂."
    }
  ],
  mathematics: [
    {
      id: "f8",
      subject_id: "mathematics",
      front: "Quadratic Formula",
      back: "x = (-b ± √(b² - 4ac)) / 2a. Used to find the roots of a quadratic equation ax² + bx + c = 0."
    },
    {
      id: "f9",
      subject_id: "mathematics",
      front: "Derivative of sin(x)",
      back: "The derivative of sin(x) with respect to x is cos(x)."
    },
    {
      id: "f10",
      subject_id: "mathematics",
      front: "Pythagorean Theorem",
      back: "In a right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides: a² + b² = c²."
    }
  ],
  english: [
    {
      id: "f11",
      subject_id: "english",
      front: "Active vs Passive Voice",
      back: "Active: The subject performs the action (e.g., 'The cat chased the mouse'). Passive: The subject receives the action (e.g., 'The mouse was chased by the cat')."
    },
    {
      id: "f12",
      subject_id: "english",
      front: "Noun Clause",
      back: "A dependent clause that functions as a noun. It can be a subject, object, or complement in a sentence (e.g., 'What she said was interesting')."
    }
  ]
};

export function FlashcardsPage() {
  const { data: subjects } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadFlashcards() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("flashcards")
          .select("*");
        
        if (error || !data || data.length === 0) {
          loadLocalFlashcards();
        } else {
          setFlashcards(data);
        }
      } catch (err) {
        loadLocalFlashcards();
      } finally {
        setLoading(false);
      }
    }

    if (subjects && subjects.length > 0) {
      loadFlashcards();
    }
  }, [subjects]);

  const loadLocalFlashcards = () => {
    const allList: Flashcard[] = [];
    Object.entries(LOCAL_FALLBACK_FLASHCARDS).forEach(([slug, list]) => {
      const dbSubject = subjects?.find(s => s.slug === slug);
      const subId = dbSubject ? dbSubject.id : slug;
      list.forEach(card => {
        allList.push({
          ...card,
          subject_id: subId
        });
      });
    });
    setFlashcards(allList);
  };

  // Filter flashcards by subject
  const filteredCards = flashcards.filter(card => {
    if (selectedSubject === "all") return true;
    return card.subject_id === selectedSubject;
  });

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedSubject]);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % filteredCards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + filteredCards.length) % filteredCards.length);
    }, 150);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const toggleKnown = (id: string) => {
    const updated = new Set(knownCards);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setKnownCards(updated);
  };

  const resetDeck = () => {
    setKnownCards(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const currentCard = filteredCards[currentIndex];
  const progress = filteredCards.length > 0 ? ((currentIndex + 1) / filteredCards.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#08142D] px-4 py-6 sm:px-6 md:px-8 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-['Manrope'] flex items-center gap-3">
              <BookOpen className="text-[#3B82F6]" size={28} /> Study Flashcards
            </h1>
            <p className="text-[#64748B] text-sm">Quickly review terms, formulas, and concepts.</p>
          </div>
          
          {/* Subject Filter */}
          <div className="relative">
            <select
              title="Subject Filter"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]/40 min-w-[160px] cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {subjects?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress & Info */}
        {filteredCards.length > 0 && (
          <div className="mb-6 flex items-center justify-between text-xs text-[#64748B]">
            <span>Card {currentIndex + 1} of {filteredCards.length}</span>
            <span>{knownCards.size} mastered</span>
          </div>
        )}

        {/* Card Arena */}
        {loading ? (
          <div className="h-64 sm:h-80 bg-[#0F172A] border border-white/6 rounded-2xl flex items-center justify-center text-[#64748B]">
            Loading deck...
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="h-64 sm:h-80 bg-[#0F172A] border border-white/6 rounded-2xl flex flex-col items-center justify-center text-center p-6">
            <AlertCircle size={40} className="text-[#475569] mb-3" />
            <p className="text-white font-semibold mb-1">No flashcards found</p>
            <p className="text-[#64748B] text-sm">Try choosing another subject category.</p>
          </div>
        ) : (
          <div className="perspective-1000 relative h-64 sm:h-80 w-full mb-8 cursor-pointer" onClick={handleFlip}>
            <motion.div
              className={`w-full h-full relative duration-500 preserve-3d`}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Front side */}
              <div className={`absolute inset-0 backface-hidden bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-white/10 rounded-2xl p-8 flex flex-col justify-between shadow-2xl ${isFlipped ? 'pointer-events-none' : ''}`}>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold tracking-wider text-[#3B82F6] uppercase">
                    {subjects?.find(s => s.id === currentCard.subject_id)?.name || "General"}
                  </span>
                  {knownCards.has(currentCard.id) && (
                    <span className="bg-[#22C55E]/15 text-[#22C55E] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Mastered
                    </span>
                  )}
                </div>
                <div className="text-center my-auto">
                  <h2 className="text-lg sm:text-2xl font-bold text-white leading-snug">
                    {currentCard.front}
                  </h2>
                </div>
                <div className="text-center text-xs text-[#475569]">
                  Click to Flip
                </div>
              </div>

              {/* Back side */}
              <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#3B82F6]/30 rounded-2xl p-8 flex flex-col justify-between shadow-2xl">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold tracking-wider text-[#60A5FA] uppercase">Answer</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleKnown(currentCard.id);
                    }}
                    className={`text-xs font-bold px-3 py-1 rounded-xl border transition-all ${
                      knownCards.has(currentCard.id) 
                        ? "bg-[#22C55E]/20 border-[#22C55E]/40 text-[#22C55E]"
                        : "border-white/10 text-[#64748B] hover:text-[#22C55E] hover:border-[#22C55E]"
                    }`}
                  >
                    {knownCards.has(currentCard.id) ? "Mastered!" : "Mark as Mastered"}
                  </button>
                </div>
                <div className="text-center my-auto">
                  <p className="text-sm sm:text-lg text-[#E2E8F0] leading-relaxed">
                    {currentCard.back}
                  </p>
                </div>
                <div className="text-center text-xs text-[#475569]">
                  Click to Flip back
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Deck Navigation Controls */}
        {filteredCards.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              className="flex items-center gap-2 bg-[#0F172A] border border-white/6 hover:border-white/12 text-[#94A3B8] hover:text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all"
            >
              <ChevronLeft size={16} /> Prev
            </button>

            <button
              onClick={resetDeck}
              className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94A3B8] transition-all"
              title="Reset Deck progress"
            >
              <RefreshCw size={12} /> Reset Deck
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Progress Bar Line */}
        {filteredCards.length > 0 && (
          <div className="mt-8 bg-[#0F172A] rounded-full h-1 w-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] h-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
