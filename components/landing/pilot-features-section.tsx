"use client";

import { useEffect, useRef, useState } from "react";

const outputs = [
  {
    number: "01",
    title: "Smart Notes",
    description: "PilotAI reads your document and distills it into clear, concise study notes — highlighting key concepts, definitions, and relationships.",
    badge: "notes",
    stat: { value: "10x", label: "faster than manual notes" },
  },
  {
    number: "02",
    title: "Flashcards",
    description: "Automatically generated question-and-answer flashcards from your material. Perfect for spaced repetition and active recall practice.",
    badge: "flashcards",
    stat: { value: "∞", label: "cards, no manual work" },
  },
  {
    number: "03",
    title: "Multiple Choice Quizzes",
    description: "Test your knowledge with AI-written MCQ questions drawn directly from your document. Instant feedback and score tracking.",
    badge: "multiple_choice",
    stat: { value: "100%", label: "from your own material" },
  },
  {
    number: "04",
    title: "Tutor Lesson & More",
    description: "Get an interactive tutor lesson, fill-in-the-blank exercises, written test questions, and a study guide — all from a single upload.",
    badge: "5+ types",
    stat: { value: "8", label: "output types available" },
  },
];

export function PilotFeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="relative bg-background py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className={`mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-4">
            <span className="w-8 h-px bg-foreground/20" />
            What PilotAI generates
          </span>
          <h2 className="text-4xl lg:text-6xl font-display text-foreground leading-tight">
            Every output type<br />you need to study
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Feature list */}
          <div className="space-y-2">
            {outputs.map((feature, i) => (
              <button
                key={i}
                onClick={() => setActiveFeature(i)}
                className={`w-full text-left p-6 rounded-xl border transition-all duration-300 ${
                  activeFeature === i
                    ? "border-foreground/30 bg-foreground/5"
                    : "border-transparent hover:border-foreground/10"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-xs font-mono text-muted-foreground pt-1">{feature.number}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-display text-foreground">{feature.title}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-foreground/10 text-muted-foreground">
                        {feature.badge}
                      </span>
                    </div>
                    {activeFeature === i && (
                      <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Active feature stat panel */}
          <div className={`transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="sticky top-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-8 h-64 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-muted-foreground">{outputs[activeFeature].badge}</span>
                <h3 className="text-2xl font-display text-foreground mt-2">{outputs[activeFeature].title}</h3>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{outputs[activeFeature].description}</p>
              </div>
              <div className="pt-6 border-t border-foreground/10 flex items-end gap-3">
                <span className="text-5xl font-display text-foreground">{outputs[activeFeature].stat.value}</span>
                <span className="text-sm text-muted-foreground mb-1">{outputs[activeFeature].stat.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
