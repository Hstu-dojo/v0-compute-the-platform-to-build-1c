"use client";

import { useState } from "react";
import { type Flashcard } from "@/lib/api";

interface FlashcardViewerProps {
  flashcards: Flashcard[];
}

export function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  if (flashcards.length === 0) {
    return <p className="text-muted-foreground text-sm">No flashcards found.</p>;
  }

  const card = flashcards[current];
  const total = flashcards.length;
  const knownCount = known.size;

  const next = () => {
    setFlipped(false);
    setCurrent((c) => (c + 1) % total);
  };

  const prev = () => {
    setFlipped(false);
    setCurrent((c) => (c - 1 + total) % total);
  };

  const markKnown = () => {
    setKnown((k) => new Set([...k, current]));
    next();
  };

  const reset = () => {
    setCurrent(0);
    setFlipped(false);
    setKnown(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
        <span>{current + 1} / {total}</span>
        <span className="text-green-500/80">{knownCount} known</span>
      </div>
      <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground/30 rounded-full transition-all duration-300"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Flip card */}
      <div
        className="relative cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
        style={{ perspective: 1000 }}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: 220,
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl border border-foreground/10 bg-foreground/[0.02] flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="text-[10px] font-mono text-muted-foreground mb-4">QUESTION — tap to reveal</span>
            <p className="text-xl font-display text-foreground text-center leading-relaxed">{card.term || (card as any).front}</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border border-foreground/20 bg-foreground/[0.04] flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <span className="text-[10px] font-mono text-muted-foreground mb-4">ANSWER</span>
            <p className="text-lg text-foreground text-center leading-relaxed">{card.definition || (card as any).back}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={prev}
          className="h-9 px-4 rounded-lg border border-foreground/10 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          ← Prev
        </button>
        <div className="flex gap-2">
          <button
            onClick={next}
            className="h-9 px-4 rounded-lg border border-foreground/10 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Skip
          </button>
          {flipped && (
            <button
              onClick={markKnown}
              className="h-9 px-4 rounded-lg bg-foreground text-background text-sm hover:bg-foreground/90 transition-colors"
            >
              Got it ✓
            </button>
          )}
        </div>
        <button
          onClick={next}
          className="h-9 px-4 rounded-lg border border-foreground/10 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          Next →
        </button>
      </div>

      {knownCount === total && (
        <div className="text-center py-6 border border-foreground/10 rounded-xl">
          <p className="text-foreground font-display text-lg mb-3">All cards completed!</p>
          <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground underline">
            Study again
          </button>
        </div>
      )}
    </div>
  );
}
