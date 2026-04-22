"use client";

import { useState } from "react";
import { type MCQQuestion, type MCQOption } from "@/lib/api";

interface MCQViewerProps {
  questions: MCQQuestion[];
}

function getOptionText(opt: string | MCQOption): string {
  return typeof opt === "string" ? opt : opt.text;
}

function isCorrect(q: MCQQuestion, idx: number): boolean {
  const opt = q.options[idx];
  if (typeof opt === "object" && 'id' in opt && q.correct_option) {
    return opt.id === q.correct_option;
  }
  if (q.correct_index !== undefined) return idx === q.correct_index;
  if (typeof opt === "object" && "is_correct" in opt) return !!(opt as any).is_correct;
  if (q.correct_answer !== undefined) {
    return getOptionText(q.options[idx]).trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
  }
  return false;
}

export function MCQViewer({ questions }: MCQViewerProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) {
    return <p className="text-muted-foreground text-sm">No questions found.</p>;
  }

  const score = Object.entries(answers).filter(([qi, ai]) =>
    isCorrect(questions[Number(qi)], ai)
  ).length;

  const handleAnswer = (qi: number, ai: number) => {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qi]: ai }));
  };

  const allAnswered = Object.keys(answers).length === questions.length;

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="space-y-8">
      {questions.map((q, qi) => {
        const selected = answers[qi];
        const hasAnswered = selected !== undefined;

        return (
          <div key={qi} className="space-y-3">
            <p className="text-foreground font-medium leading-relaxed">
              <span className="text-muted-foreground font-mono text-sm mr-2">{qi + 1}.</span>
              {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, ai) => {
                const text = getOptionText(opt);
                const isSelected = selected === ai;
                const correct = isCorrect(q, ai);

                let cls = "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ";

                if (!submitted) {
                  cls += isSelected
                    ? "border-foreground/40 bg-foreground/8 text-foreground"
                    : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground";
                } else {
                  if (correct) {
                    cls += "border-green-500/40 bg-green-500/10 text-green-400";
                  } else if (isSelected && !correct) {
                    cls += "border-red-500/40 bg-red-500/10 text-red-400";
                  } else {
                    cls += "border-foreground/10 text-muted-foreground/50";
                  }
                }

                return (
                  <button
                    key={ai}
                    onClick={() => handleAnswer(qi, ai)}
                    className={cls}
                    disabled={submitted}
                  >
                    <span className="font-mono text-xs mr-2 opacity-60">
                      {String.fromCharCode(65 + ai)}.
                    </span>
                    {text}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <p className="text-xs text-muted-foreground bg-foreground/3 border border-foreground/8 rounded-lg px-3 py-2">
                {q.explanation}
              </p>
            )}
          </div>
        );
      })}

      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!allAnswered}
          className="h-10 px-6 rounded-lg bg-foreground text-background text-sm disabled:opacity-40 hover:bg-foreground/90 transition-colors"
        >
          Submit answers
        </button>
      ) : (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-foreground/10 bg-foreground/2">
          <div>
            <p className="text-2xl font-display text-foreground">
              {score} / {questions.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {Math.round((score / questions.length) * 100)}% correct
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
