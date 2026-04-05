"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for trying PilotAI and light studying.",
    features: [
      "Upload up to 5 documents/month",
      "Notes & flashcards generation",
      "Basic multiple choice quizzes",
      "Dashboard document storage",
    ],
    cta: "Get started free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "For serious students who want every output type.",
    features: [
      "Unlimited document uploads",
      "All 8 output types",
      "Fill-in-the-blank & written tests",
      "Tutor lesson & study guide",
      "Priority AI generation",
      "Credit top-ups available",
    ],
    cta: "Start Pro",
    href: "/signup",
    highlighted: true,
  },
];

export function PilotPricingSection() {
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
    <section id="pricing" ref={sectionRef} className="relative bg-background py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className={`mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-4">
            <span className="w-8 h-px bg-foreground/20" />
            Pricing
          </span>
          <h2 className="text-4xl lg:text-6xl font-display text-foreground leading-tight">
            Start free,<br />upgrade when ready
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`transition-all duration-700 rounded-2xl border p-8 flex flex-col ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              } ${plan.highlighted
                ? "border-foreground/30 bg-foreground/[0.04]"
                : "border-foreground/10"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {plan.highlighted && (
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-foreground/60 border border-foreground/10 rounded-full px-3 py-1 mb-4 w-fit">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-display text-foreground mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-display text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground mb-1">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <svg className="w-4 h-4 text-foreground/50 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full h-11 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                  plan.highlighted
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "border border-foreground/20 text-foreground hover:border-foreground/40"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
