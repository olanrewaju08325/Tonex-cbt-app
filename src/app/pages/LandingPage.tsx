import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, useInView } from "motion/react";
import {
  ArrowRight, CheckCircle, ChevronDown, ChevronUp, Star, Zap, Shield,
  Users, BookOpen, BarChart2, Trophy, Play, Menu, X, Crown
} from "lucide-react";
import {
  FEATURES, UNIVERSITIES, HOW_IT_WORKS, TESTIMONIALS, FAQ_ITEMS
} from "../data/mockData";

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-[#08142D]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Tonex CBT" className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-blue-500/25" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-white font-extrabold text-lg font-['Manrope']">
                Tonex CBT
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {["Features", "Universities", "How It Works", "Pricing"].map(item => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-[#94A3B8] hover:text-white text-sm font-medium transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="text-[#94A3B8] hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/register")}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
              >
                Get Started Free
              </button>
            </div>
            <button
              className="md:hidden text-white p-2"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-[#0F172A]/95 backdrop-blur-xl border-b border-white/8 px-4 py-4"
        >
          <div className="flex flex-col gap-3">
            {["Features", "Universities", "How It Works", "Pricing"].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-[#94A3B8] text-sm font-medium py-2"
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate("/login")}
                className="flex-1 text-[#94A3B8] text-sm font-medium py-2.5 rounded-lg border border-white/10"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/register")}
                className="flex-1 bg-[#2563EB] text-white text-sm font-semibold py-2.5 rounded-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}

function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#08142D] via-[#0B1829] to-[#08142D]" />
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#0B3D91]/15 rounded-full blur-3xl" />
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#60A5FA]/40 rounded-full"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 20}%`,
          }}
          animate={{ y: [-10, 10, -10], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-full px-4 py-2 mb-8"
        >
          <Zap size={14} className="text-[#60A5FA]" />
          <span className="text-[#60A5FA] text-sm font-semibold">Nigeria's #1 Post-UTME Platform</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-[1.1] mb-6 font-['Manrope']"
        >
          Pass Your{" "}
          <span className="relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] to-[#2563EB]">
              Post-UTME
            </span>
          </span>
          {" "}With{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-white to-[#60A5FA]">
            Confidence
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-[#94A3B8] text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Practice real university past questions, take realistic CBT exams, track your progress and gain admission faster.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <button
            onClick={() => navigate("/register")}
            className="group bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] hover:to-[#0B3D91] text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-1"
          >
            Start Practicing
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate("/register")}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
          >
            <BookOpen size={18} />
            View Universities
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-8 mb-16"
        >
          {[
            { value: "15,000+", label: "Past Questions" },
            { value: "50+", label: "Universities" },
            { value: "12,800+", label: "Students" },
            { value: "89%", label: "Pass Rate" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-extrabold text-white font-['Manrope']">
                {stat.value}
              </div>
              <div className="text-[#64748B] text-sm">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#08142D] z-10 pointer-events-none" style={{ top: '60%' }} />
          <div className="hidden sm:block bg-[#0F172A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/50">
            {/* Mock exam UI */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]/70" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]/70" />
              <div className="w-3 h-3 rounded-full bg-[#22C55E]/70" />
              <div className="flex-1 bg-[#1E293B] rounded-full h-5 mx-4 flex items-center px-3">
                <span className="text-[#475569] text-xs">tonexcbt.ng/exam</span>
              </div>
              <div className="bg-[#EF4444]/20 text-[#EF4444] text-xs font-mono font-bold px-3 py-1 rounded-lg">
                23:47
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 bg-[#1E293B]/50 rounded-xl p-4">
                <div className="text-[#60A5FA] text-xs font-semibold mb-2">Question 12 of 40</div>
                <div className="bg-[#2563EB]/10 rounded-lg h-2 mb-4">
                  <div className="bg-[#2563EB] h-2 rounded-lg w-[30%]" />
                </div>
                <div className="text-white text-sm font-medium mb-4">
                  Which of the following is a vector quantity?
                </div>
                {["A. Mass", "B. Temperature", "C. Speed", "D. Velocity"].map((opt, i) => (
                  <div
                    key={i}
                    className={`text-xs py-2 px-3 rounded-lg mb-2 border ${
                      i === 3
                        ? "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#60A5FA]"
                        : "border-white/5 text-[#94A3B8]"
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
              <div className="bg-[#1E293B]/50 rounded-xl p-3">
                <div className="text-[#64748B] text-xs mb-2">Questions</div>
                <div className="grid grid-cols-4 gap-1">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-full aspect-square rounded text-[8px] flex items-center justify-center font-bold ${
                        i < 11
                          ? i % 4 === 3
                            ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                            : "bg-[#22C55E]/20 text-[#22C55E]"
                          : i === 11
                          ? "bg-[#2563EB] text-white"
                          : "bg-[#1E293B] text-[#475569]"
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1">
                  {[
                    { label: "Answered", color: "bg-[#22C55E]", count: 10 },
                    { label: "Flagged", color: "bg-[#F59E0B]", count: 2 },
                    { label: "Left", color: "bg-[#1E293B]", count: 28 },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-sm ${s.color}`} />
                      <span className="text-[#64748B] text-[9px]">{s.label}</span>
                      <span className="text-white text-[9px] ml-auto">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 bg-[#08142D]">
      <div className="max-w-7xl mx-auto">
        <FadeInSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-full px-4 py-2 mb-4">
              <Zap size={14} className="text-[#60A5FA]" />
              <span className="text-[#60A5FA] text-sm font-semibold">Everything You Need</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 font-['Manrope']">
              Built for Nigerian Aspirants
            </h2>
            <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto">
              Every feature is designed to help you prepare smarter, practice harder, and perform better.
            </p>
          </div>
        </FadeInSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <FadeInSection key={i} delay={i * 0.08}>
              <div className="group bg-[#0F172A] border border-white/6 rounded-2xl p-6 hover:border-[#2563EB]/30 hover:bg-[#0F172A]/80 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-[#2563EB]/5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 font-black text-lg"
                  style={{ background: `${feature.color}18`, color: feature.color }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{feature.description}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function UniversitiesSection() {
  return (
    <section id="universities" className="py-24 px-4 sm:px-6 bg-gradient-to-b from-[#08142D] to-[#0B1829]">
      <div className="max-w-7xl mx-auto">
        <FadeInSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 font-['Manrope']">
              50+ Universities Covered
            </h2>
            <p className="text-[#94A3B8] text-lg">
              From UNILAG to ABU, we've got your target university covered.
            </p>
          </div>
        </FadeInSection>
        <FadeInSection delay={0.2}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {UNIVERSITIES.map((uni, i) => (
              <motion.div
                key={uni.id}
                whileHover={{ scale: 1.05, y: -2 }}
                className="bg-[#0F172A] border border-white/6 rounded-xl p-4 text-center cursor-pointer hover:border-[#2563EB]/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB]/30 to-[#0B3D91]/30 flex items-center justify-center text-[#60A5FA] text-xs font-black mx-auto mb-2">
                  {uni.shortName.slice(0, 2)}
                </div>
                <div className="text-white text-xs font-bold">{uni.shortName}</div>
                <div className="text-[#475569] text-xs">{uni.state}</div>
              </motion.div>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 bg-[#0B1829]">
      <div className="max-w-7xl mx-auto">
        <FadeInSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 font-['Manrope']">
              How It Works
            </h2>
            <p className="text-[#94A3B8] text-lg max-w-xl mx-auto">
              Get from zero to exam-ready in four simple steps.
            </p>
          </div>
        </FadeInSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {HOW_IT_WORKS.map((step, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <div className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-[#2563EB]/30 to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0B3D91] flex items-center justify-center text-white font-black text-sm mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-[#64748B] text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#08142D]">
      <div className="max-w-7xl mx-auto">
        <FadeInSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 font-['Manrope']">
              Students Love Tonex CBT
            </h2>
            <p className="text-[#94A3B8] text-lg">
              Real stories from real students who gained admission.
            </p>
          </div>
        </FadeInSection>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <div className="bg-[#0F172A] border border-white/6 rounded-2xl p-6 hover:border-white/10 transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className="text-[#F59E0B] fill-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-[#94A3B8] text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0B3D91] flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-[#64748B] text-xs">{t.university}</div>
                  </div>
                  <div className="ml-auto bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-bold px-3 py-1 rounded-full">
                    {t.score}
                  </div>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const navigate = useNavigate();
  const plans = [
    {
      name: "Free",
      price: "₦0",
      period: "forever",
      description: "Get started with basic practice",
      features: ["5 questions/day per subject", "4 subjects", "Basic analytics", "Mobile access"],
      cta: "Start Free",
      highlight: false,
      badge: null,
      onClick: () => navigate("/register"),
    },
    {
      name: "Monthly",
      price: "₦2,500",
      period: "/ month",
      description: "Full access for serious preparation",
      features: ["Unlimited questions", "All 12 subjects", "Full CBT exams", "Detailed analytics", "Leaderboards", "Bookmarks"],
      cta: "Get Monthly",
      highlight: false,
      badge: null,
      onClick: () => navigate("/premium", { state: { plan: "monthly" } }),
    },
    {
      name: "Quarterly",
      price: "₦6,500",
      period: "/ 3 months",
      description: "Most popular — save ₦1,000",
      features: ["Everything in Monthly", "Priority support", "Unlimited practice", "Full analytics", "Leaderboards", "Bookmarks"],
      cta: "Get Quarterly",
      highlight: true,
      badge: "MOST POPULAR",
      onClick: () => navigate("/premium", { state: { plan: "quarterly" } }),
    },
    {
      name: "Yearly",
      price: "₦25,000",
      period: "/ year",
      description: "Best value — save ₦5,000",
      features: ["Everything in Quarterly", "Early access features", "Performance coaching", "Download questions"],
      cta: "Get Yearly",
      highlight: false,
      badge: "SAVE 17%",
      onClick: () => navigate("/premium", { state: { plan: "yearly" } }),
    },
  ];

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 bg-gradient-to-b from-[#0B1829] to-[#08142D]">
      <div className="max-w-7xl mx-auto">
        <FadeInSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 font-['Manrope']">
              Simple, Transparent Pricing
            </h2>
            <p className="text-[#94A3B8] text-lg">
              Invest in your future. Start free, upgrade when you're ready.
            </p>
          </div>
        </FadeInSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <div className={`relative rounded-2xl p-6 flex flex-col h-full ${
                plan.highlight
                  ? "bg-gradient-to-b from-[#0B3D91]/40 to-[#2563EB]/10 border-2 border-[#2563EB]/50"
                  : "bg-[#0F172A] border border-white/6"
              }`}>
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-black px-4 py-1 rounded-full whitespace-nowrap ${
                    plan.highlight
                      ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#08142D]"
                      : "bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/30"
                  }`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-[#94A3B8] text-sm font-semibold mb-1">{plan.name}</div>
                  <div className="text-white text-3xl font-extrabold font-['Manrope']">
                    {plan.price}
                    <span className="text-[#64748B] text-sm font-normal"> {plan.period}</span>
                  </div>
                  <div className="text-[#64748B] text-xs mt-1">{plan.description}</div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <CheckCircle size={15} className={plan.highlight ? "text-[#60A5FA]" : "text-[#22C55E]"} />
                      <span className="text-[#94A3B8] text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={plan.onClick}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-[#2563EB] to-[#0B3D91] text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                      : "bg-[#1E293B] text-[#94A3B8] hover:text-white hover:bg-[#2563EB]/20"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 bg-[#08142D]">
      <div className="max-w-3xl mx-auto">
        <FadeInSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 font-['Manrope']">
              Frequently Asked Questions
            </h2>
          </div>
        </FadeInSection>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <FadeInSection key={i} delay={i * 0.06}>
              <div className="bg-[#0F172A] border border-white/6 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                >
                  <span className="text-white font-semibold text-sm pr-4">{item.question}</span>
                  {openIndex === i ? (
                    <ChevronUp size={18} className="text-[#60A5FA] shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-[#475569] shrink-0" />
                  )}
                </button>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    className="px-5 pb-5"
                  >
                    <p className="text-[#64748B] text-sm leading-relaxed">{item.answer}</p>
                  </motion.div>
                )}
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-[#08142D] to-[#0B1829]">
      <div className="max-w-4xl mx-auto text-center">
        <FadeInSection>
          <div className="bg-gradient-to-br from-[#0B3D91]/30 to-[#2563EB]/10 border border-[#2563EB]/20 rounded-3xl p-12">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 font-['Manrope']">
              Your Dream University is One Step Away
            </h2>
            <p className="text-[#94A3B8] text-lg mb-8 max-w-2xl mx-auto">
              Join 12,800+ Nigerian students already practicing smarter with Tonex CBT. Start for free today.
            </p>
            <button
              onClick={() => navigate("/register")}
              className="bg-gradient-to-r from-[#2563EB] to-[#0B3D91] hover:from-[#1D4ED8] hover:to-[#0B3D91] text-white font-bold px-10 py-4 rounded-xl inline-flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-1"
            >
              Start Practicing Free
              <ArrowRight size={18} />
            </button>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0B1829] border-t border-white/5 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.jpg" alt="Tonex CBT" className="w-7 h-7 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-white font-extrabold font-['Manrope']">Tonex CBT</span>
            </div>
            <p className="text-[#475569] text-sm leading-relaxed">
              Nigeria's most trusted Post-UTME preparation platform.
            </p>
          </div>
          {[
            { title: "Platform", links: ["Features", "Universities", "Pricing", "Leaderboard"] },
            { title: "Support", links: ["Help Center", "Contact Us", "Privacy Policy", "Terms"] },
            { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-white font-semibold text-sm mb-4">{col.title}</div>
              <ul className="space-y-2">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-[#475569] hover:text-white text-sm transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[#475569] text-xs">
            © 2024 Tonex CBT. All rights reserved. Built for Nigerian university aspirants.
          </div>
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-[#22C55E]" />
            <span className="text-[#475569] text-xs">Secure & Trusted</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="bg-[#08142D] min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <UniversitiesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
