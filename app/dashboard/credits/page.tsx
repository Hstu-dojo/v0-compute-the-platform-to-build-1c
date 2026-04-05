"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getCredits, getCreditHistory, type CreditBalance, type CreditLedgerEntry } from "@/lib/api";
import { Zap, AlertCircle, ChevronDown } from "lucide-react";

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const EVENT_COLORS: Record<string, string> = {
  purchase: "text-green-400",
  subscription_renewal: "text-green-400",
  usage: "text-red-400",
  adjustment: "text-blue-400",
  refund: "text-yellow-400",
};

export default function CreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [entries, setEntries] = useState<CreditLedgerEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bal, hist] = await Promise.all([
        getCredits(),
        getCreditHistory({ limit: 30 }),
      ]);
      setBalance(bal);
      setEntries(hist.data ?? []);
      setCursor(hist.next_cursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load credit history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const hist = await getCreditHistory({ limit: 30, cursor });
      setEntries((prev) => [...prev, ...(hist.data ?? [])]);
      setCursor(hist.next_cursor ?? null);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-display text-foreground mb-1">Credit History</h1>
        <p className="text-sm text-muted-foreground">Your credit balance and transaction ledger.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Balance card */}
      <div className="p-6 rounded-xl border border-foreground/10 bg-foreground/[0.02] flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Current Balance</p>
          {loading ? (
            <div className="h-9 w-28 rounded bg-foreground/10 animate-pulse" />
          ) : (
            <p className="text-4xl font-display text-foreground">
              {balance?.balance.toLocaleString() ?? "—"}
              <span className="text-lg text-muted-foreground ml-2">credits</span>
            </p>
          )}
        </div>
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-foreground/20 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Buy credits
        </Link>
      </div>

      {/* Ledger */}
      <section>
        <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">Transactions</h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl border border-foreground/10 animate-pulse bg-foreground/[0.02]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-foreground/10 border-dashed">
            <p className="text-muted-foreground text-sm">No transactions yet.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-foreground/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Event</th>
                    <th className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {entries.map((entry) => {
                    const color = EVENT_COLORS[entry.event_type] ?? "text-foreground";
                    const isPositive = entry.amount > 0;
                    return (
                      <tr key={entry.id} className="hover:bg-foreground/[0.02] transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(entry.created_at)}</td>
                        <td className="px-4 py-3">
                          <p className={`text-xs font-mono capitalize ${color}`}>
                            {entry.event_type?.replace(/_/g, " ") ?? "—"}
                          </p>
                          {entry.description && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5">{entry.description}</p>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                          {isPositive ? "+" : ""}{entry.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                          {entry.balance_after.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {cursor && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 h-9 px-5 rounded-lg border border-foreground/10 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40"
                >
                  {loadingMore ? "Loading…" : <><ChevronDown className="w-4 h-4" /> Load more</>}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
