"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PilotCtaSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-black py-24 lg:py-32 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[400px] rounded-full bg-white/[0.03] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 text-center">
        <div className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-flex items-center gap-3 text-sm font-mono text-white/40 mb-6">
            <span className="w-8 h-px bg-white/20" />
            Get started today
            <span className="w-8 h-px bg-white/20" />
          </span>

          <h2 className="text-5xl lg:text-7xl font-display text-white leading-tight mb-6">
            Study smarter,<br />not harder
          </h2>

          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10">
            Upload your first document and see AI-generated notes, flashcards, and quizzes in under a minute. No credit card required.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 h-12 px-8 bg-white hover:bg-white/90 text-black rounded-full font-medium text-sm transition-colors"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 h-12 px-8 border border-white/20 hover:border-white/40 text-white rounded-full text-sm transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
