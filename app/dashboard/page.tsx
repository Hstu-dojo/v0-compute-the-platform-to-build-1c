"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getDocuments, type Document } from "@/lib/api";
import { Upload, FileText, AlertCircle, RefreshCw } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ready: { label: "Ready", cls: "text-green-400 bg-green-500/10 border-green-500/20" },
  pending_embedding: { label: "Processing", cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  failed: { label: "Failed", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await getDocuments();
      setDocs(res.documents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasPending = docs.some((d) => d.status === "pending_embedding");
  useEffect(() => {
    if (!hasPending) return;
    const id = setInterval(() => load(true), 5000);
    return () => clearInterval(id);
  }, [hasPending, load]);

  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-3xl font-display text-foreground mb-1">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Your documents and study sets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-foreground/10 text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-sm hover:bg-foreground/90 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-6">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => load()} className="ml-auto text-xs text-red-400 underline">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.02] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && docs.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-foreground/10 border-dashed">
          <div className="w-12 h-12 rounded-full border border-foreground/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-display text-foreground mb-2">No documents yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Upload a PDF or paste text to generate notes, flashcards, and quizzes.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 h-9 px-5 rounded-full border border-foreground/20 text-sm text-foreground hover:border-foreground/40 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload first document
          </Link>
        </div>
      )}

      {/* Document list */}
      {!loading && docs.length > 0 && (
        <div className="space-y-3">
          {docs.map((doc) => {
            const statusInfo = STATUS_LABELS[doc.status] ?? {
              label: doc.status,
              cls: "text-muted-foreground bg-foreground/5 border-foreground/10",
            };
            const isReady = doc.status === "ready";
            const isPending = doc.status === "pending_embedding";

            return (
              <div
                key={doc.id}
                className="group flex items-center gap-4 p-4 rounded-xl border border-foreground/10 hover:border-foreground/20 transition-colors bg-foreground/[0.01] hover:bg-foreground/[0.03]"
              >
                <div className="w-9 h-9 rounded-lg border border-foreground/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(doc.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {doc.page_count ? ` · ${doc.page_count} pages` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${statusInfo.cls} flex items-center gap-1.5`}>
                    {isPending && (
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    )}
                    {statusInfo.label}
                  </span>
                  {isReady && (
                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="h-8 px-3 rounded-lg border border-foreground/10 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors flex items-center"
                    >
                      Open →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
