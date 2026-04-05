"use client";

import { useState, useEffect } from "react";
import { adminGetDeadLetterJobs } from "@/lib/api";
import { AlertCircle, RefreshCw } from "lucide-react";

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface DLJob {
  id?: string;
  job_type?: string;
  error?: string;
  created_at?: string;
  [key: string]: unknown;
}

export default function AdminDeadLetterPage() {
  const [jobs, setJobs] = useState<DLJob[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (reset = true) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetDeadLetterJobs({ limit: 20, cursor: reset ? undefined : cursor ?? undefined });
      const data = (res as { data: DLJob[]; next_cursor: string | null }).data ?? [];
      if (reset) setJobs(data);
      else setJobs((prev) => [...prev, ...data]);
      setCursor((res as { data: DLJob[]; next_cursor: string | null }).next_cursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dead-letter jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground mb-1">Dead-Letter Jobs</h1>
          <p className="text-sm text-muted-foreground">Failed background jobs that need attention.</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-foreground/10 text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-foreground/10 animate-pulse bg-foreground/[0.02]" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-foreground/10 border-dashed">
          <p className="text-muted-foreground text-sm">No dead-letter jobs. Queue is healthy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <div key={job.id ?? i} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <p className="text-sm font-mono text-foreground">{job.job_type ?? job.id ?? "Unknown job"}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(job.created_at)}</p>
              </div>
              {job.error && (
                <p className="text-xs text-red-400 font-mono">{String(job.error)}</p>
              )}
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Raw data</summary>
                <pre className="text-[10px] text-muted-foreground mt-1 overflow-x-auto">{JSON.stringify(job, null, 2)}</pre>
              </details>
            </div>
          ))}
          {cursor && (
            <div className="flex justify-center">
              <button
                onClick={() => load(false)}
                disabled={loading}
                className="h-9 px-5 rounded-lg border border-foreground/10 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
