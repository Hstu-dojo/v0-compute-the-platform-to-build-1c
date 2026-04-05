"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    step: "01",
    title: "Upload your material",
    description: "Drag and drop a PDF or paste raw text — lecture notes, textbook chapters, research papers. Any document works.",
  },
  {
    step: "02",
    title: "Choose your outputs",
    description: "Select from notes, flashcards, multiple choice, fill-in-the-blank, written test, or tutor lesson. Pick one or all.",
  },
  {
    step: "03",
    title: "AI generates in seconds",
    description: "PilotAI processes your document and creates all selected study materials. Most documents complete in under 60 seconds.",
  },
  {
    step: "04",
    title: "Study and retain",
    description: "Flip through flashcards, take quizzes, read your notes. Everything is saved to your dashboard for later review.",
  },
];

export function PilotHowItWorksSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" ref={sectionRef} className="relative bg-black py-24 lg:py-32">
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute h-px bg-white/20" style={{ top: `${16.66 * (i + 1)}%`, left: 0, right: 0 }} />
        ))}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute w-px bg-white/20" style={{ left: `${12.5 * (i + 1)}%`, top: 0, bottom: 0 }} />
        ))}
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className={`mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <span className="inline-flex items-center gap-3 text-sm font-mono text-white/50 mb-4">
            <span className="w-8 h-px bg-white/20" />
            How PilotAI works
          </span>
          <h2 className="text-4xl lg:text-6xl font-display text-white leading-tight">
            From document<br />to study set
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="border border-white/10 rounded-xl p-6 h-full hover:border-white/20 transition-colors">
                <span className="text-xs font-mono text-white/30 mb-4 block">{step.step}</span>
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center mb-4">
                  <span className="text-white/60 text-lg font-display">{i + 1}</span>
                </div>
                <h3 className="text-xl font-display text-white mb-3">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
