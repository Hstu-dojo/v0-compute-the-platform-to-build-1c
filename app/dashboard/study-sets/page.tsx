"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, RefreshCw } from "lucide-react";
import {
  getDocuments,
  getDocumentBatches,
  type Document,
  type StudySetBatchStatusResponse,
} from "@/lib/api";

type StudySetListRow = {
  document: Document;
  latestBatch: StudySetBatchStatusResponse | null;
};

export default function StudySetsIndexPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StudySetListRow[]>([]);

  const load = async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const docs = await getDocuments();
      const items = docs.data ?? [];

      const withBatches = await Promise.all(
        items.map(async (doc) => {
          try {
            const batchRes = await getDocumentBatches(doc.id);
            return {
              document: doc,
              latestBatch: (batchRes.batches ?? [])[0] ?? null,
            };
          } catch {
            return {
              document: doc,
              latestBatch: null,
            };
          }
        })
      );

      setRows(withBatches);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load study sets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-foreground mb-1">Study Sets</h1>
          <p className="text-muted-foreground text-sm">Workspace-first access using study_set_id routes.</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-foreground/10 text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-6">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.02] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-foreground/10 border-dashed">
          <div className="w-12 h-12 rounded-full border border-foreground/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-display text-foreground mb-2">No study sets yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Upload a source and generate your first study set.
          </p>
          <Link href="/dashboard/upload" className="inline-flex items-center gap-2 h-9 px-5 rounded-full border border-foreground/20 text-sm text-foreground hover:border-foreground/40 transition-colors">
            Go to upload
          </Link>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row) => {
            const batch = row.latestBatch;
            const status = batch?.batch.status ?? "not-generated";
            return (
              <div key={row.document.id} className="group flex items-center gap-4 p-4 rounded-xl border border-foreground/10 hover:border-foreground/20 transition-colors bg-foreground/[0.01]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{row.document.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    status: {status}
                    {batch ? ` · jobs: ${batch.jobs.length}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {batch && (
                    <Link href={`/dashboard/study-sets/${batch.batch.id}`} className="h-8 px-3 rounded-lg border border-foreground/10 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors flex items-center">
                      Open workspace
                    </Link>
                  )}
                  <Link href={`/dashboard/documents/${row.document.id}`} className="h-8 px-3 rounded-lg border border-foreground/10 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors flex items-center">
                    Open source
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
