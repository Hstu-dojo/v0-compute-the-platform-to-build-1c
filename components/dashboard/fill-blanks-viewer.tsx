"use client";

import { useState } from "react";
import { type FillBlankItem } from "@/lib/api";

interface FillBlanksViewerProps {
  items: FillBlankItem[];
}

export function FillBlanksViewer({ items }: FillBlanksViewerProps) {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No exercises found.</p>;
  }

  const setAnswer = (i: number, val: string) => {
    if (submitted) return;
    setUserAnswers((a) => ({ ...a, [i]: val }));
  };

  const checkAnswer = (i: number) => {
    setChecked((c) => ({ ...c, [i]: true }));
  };

  const correct = (i: number): boolean => {
    const item = items[i];
    const answerStr = item.blanks && item.blanks.length > 0 ? item.blanks[0].answer : (item as any).answer;
    return (userAnswers[i] ?? "").trim().toLowerCase() === (answerStr || "").trim().toLowerCase();
  };

  const score = items.filter((_, i) => checked[i] && correct(i)).length;
  const allChecked = Object.keys(checked).length === items.length;

  const reset = () => {
    setUserAnswers({});
    setChecked({});
    setSubmitted(false);
  };

  const renderSentence = (item: FillBlankItem, idx: number) => {
    const sentence = item.sentence;
    const placeholder = (item as any).blank ?? "____";
    const parts = sentence.split(placeholder);

    if (parts.length < 2) {
      // Maybe the backend uses something else like ____ (4 underscores instead of 5)?
      // Let's try splitting by different underscores
      const altParts = sentence.split(/____+/);
      if (altParts.length < 2) {
        return (
          <span>
            {sentence}{" "}
            <input
              type="text"
              value={userAnswers[idx] ?? ""}
              onChange={(e) => setAnswer(idx, e.target.value)}
              placeholder="your answer"
              className="inline-block border border-foreground/30 rounded bg-transparent text-foreground text-sm px-2 focus:outline-none focus:border-foreground w-32"
            />
          </span>
        );
      }
      return (
        <span>
          {altParts[0]}
          <input
            type="text"
            value={userAnswers[idx] ?? ""}
            onChange={(e) => setAnswer(idx, e.target.value)}
            placeholder="your answer"
            className="inline-block border-b border-foreground/30 bg-transparent text-foreground text-sm px-1 focus:outline-none focus:border-foreground w-32 mx-1 text-center"
            disabled={submitted || !!checked[idx]}
          />
          {altParts.slice(1).join("____")}
        </span>
      );
    }

    return (
      <span>
        {parts[0]}
        <input
          type="text"
          value={userAnswers[idx] ?? ""}
          onChange={(e) => setAnswer(idx, e.target.value)}
          placeholder="your answer"
          className="inline-block border-b border-foreground/30 bg-transparent text-foreground text-sm px-1 focus:outline-none focus:border-foreground w-32 mx-1 text-center"
          disabled={submitted || !!checked[idx]}
        />
        {parts.slice(1).join(placeholder)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {items.map((item, i) => {
        const isChecked = checked[i];
        const isCorrect = isChecked && correct(i);
        const isWrong = isChecked && !correct(i);

        return (
          <div key={i} className={`p-4 rounded-xl border transition-colors ${
            isCorrect ? "border-green-500/30 bg-green-500/5" :
            isWrong ? "border-red-500/30 bg-red-500/5" :
            "border-foreground/10"
          }`}>
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground pt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-sm text-foreground leading-relaxed flex-1">
                {renderSentence(item, i)}
              </p>
            </div>
            {item.context && (
              <p className="text-xs text-muted-foreground ml-6 mb-2 italic">{(item as any).context}</p>
            )}
            {!isChecked ? (
              <button
                onClick={() => checkAnswer(i)}
                disabled={!userAnswers[i]?.trim()}
                className="ml-6 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 underline"
              >
                Check
              </button>
            ) : (
              <div className="ml-6 text-xs mt-3">
                {isCorrect ? (
                  <span className="text-green-500 font-medium">✓ Correct!</span>
                ) : (
                  <span className="text-red-400">
                    Expected answer: <strong className="ml-1 opacity-90">{item.blanks && item.blanks.length > 0 ? item.blanks[0].answer : (item as any).answer}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {allChecked && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-foreground/10 bg-foreground/2">
          <div>
            <p className="text-2xl font-display text-foreground">{score} / {items.length}</p>
            <p className="text-sm text-muted-foreground">
              {Math.round((score / items.length) * 100)}% correct
            </p>
          </div>
          <button
            onClick={reset}
            className="ml-auto h-9 px-4 rounded-lg border border-foreground/10 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
