"use client";

import { useState, useEffect } from "react";
import { adminGetWorkers, type WorkerInfo } from "@/lib/api";
import { AlertCircle, RefreshCw, Activity } from "lucide-react";

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function WorkerRow({ w }: { w: WorkerInfo }) {
  return (
    <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] font-mono text-xs space-y-1">
      <p className="text-foreground">{(w.id as string) ?? "unknown"}</p>
      {w.type && <p className="text-muted-foreground">type: {String(w.type)}</p>}
      {w.last_heartbeat && <p className="text-muted-foreground">heartbeat: {fmtDate(w.last_heartbeat as string)}</p>}
    </div>
  );
}

export default function AdminWorkersPage() {
  const [data, setData] = useState<{ active: WorkerInfo[]; stale: WorkerInfo[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetWorkers();
      setData(res.workers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground mb-1">Workers</h1>
          <p className="text-sm text-muted-foreground">Background job worker health status.</p>
        </div>
        <button
          onClick={load}
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
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-foreground/10 animate-pulse bg-foreground/[0.02]" />
          ))}
        </div>
      ) : data ? (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
                Active ({data.active.length})
              </h2>
            </div>
            {data.active.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active workers.</p>
            ) : (
              <div className="space-y-2">
                {data.active.map((w, i) => <WorkerRow key={i} w={w} />)}
              </div>
            )}
          </section>

          {data.stale.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
                  Stale ({data.stale.length})
                </h2>
              </div>
              <div className="space-y-2">
                {data.stale.map((w, i) => <WorkerRow key={i} w={w} />)}
              </div>
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}
