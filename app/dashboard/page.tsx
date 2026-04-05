"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="border-b border-border/40 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-display text-foreground">PilotAI</span>
          <span className="text-[10px] text-muted-foreground font-mono">TM</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-display text-foreground mb-3">
            Welcome{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Your AI-powered study workspace. Upload documents to get started.
          </p>
        </div>

        {/* Placeholder for Task #2 */}
        <div className="rounded-xl border border-border/40 p-12 text-center">
          <div className="w-12 h-12 rounded-full border border-border/40 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-xl font-display text-foreground mb-2">No documents yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload a PDF or paste text to generate notes, flashcards, and quizzes.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/5 border border-foreground/10 text-sm text-muted-foreground font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            Upload coming soon
          </div>
        </div>
      </main>
    </div>
  );
}
