"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  adminGetUser, adminUpdateUser, adminGetUserBilling, adminGetUserCreditHistory,
  adminAdjustCredits, adminCancelSubscription, adminPortalSession, adminGetPlans,
  adminChangePlan, adminRefund,
  type AdminUser, type Subscription, type Invoice, type CreditLedgerEntry, type Plan,
} from "@/lib/api";
import { AlertCircle, ChevronLeft, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmt(n: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [changePlanId, setChangePlanId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, billingRes, histRes, plansRes] = await Promise.all([
        adminGetUser(id),
        adminGetUserBilling(id).catch(() => ({ subscription: null, invoices: [] })),
        adminGetUserCreditHistory(id, { limit: 20 }).catch(() => ({ data: [], next_cursor: null })),
        adminGetPlans().catch(() => ({ data: [] })),
      ]);
      setUser((userRes as { user: AdminUser }).user);
      setSub(billingRes.subscription ?? null);
      setInvoices(billingRes.invoices ?? []);
      setLedger(histRes.data ?? []);
      setPlans(plansRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const toggleActive = async () => {
    if (!user) return;
    setBusy("toggle");
    try {
      await adminUpdateUser(id, { is_active: !user.is_active });
      setUser({ ...user, is_active: !user.is_active });
      showMsg(`User ${!user.is_active ? "enabled" : "disabled"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setBusy(null);
    }
  };

  const handleAdjustCredits = async () => {
    const amount = parseInt(adjustAmount);
    if (!adjustReason || isNaN(amount)) return;
    setBusy("adjust");
    try {
      await adminAdjustCredits({ user_id: id, amount, reason: adjustReason });
      setAdjustAmount("");
      setAdjustReason("");
      showMsg("Credits adjusted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to adjust credits");
    } finally {
      setBusy(null);
    }
  };

  const handleChangePlan = async () => {
    if (!changePlanId) return;
    setBusy("changePlan");
    try {
      await adminChangePlan(id, { plan_id: changePlanId, billing_interval: "monthly" });
      showMsg("Plan changed.");
      setChangePlanId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change plan");
    } finally {
      setBusy(null);
    }
  };

  const handleCancelSub = async () => {
    setBusy("cancelSub");
    try {
      await adminCancelSubscription(id);
      showMsg("Subscription cancellation scheduled.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel subscription");
    } finally {
      setBusy(null);
    }
  };

  const handlePortalSession = async () => {
    setBusy("portal");
    try {
      const res = await adminPortalSession(id, window.location.href);
      if (res.url) window.open(res.url, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create portal session");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-foreground/10 animate-pulse bg-foreground/[0.02]" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display text-foreground">{user?.display_name || user?.email}</h1>
          <p className="text-sm text-muted-foreground">{user?.email} · {user?.role}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 text-xs underline">Dismiss</button>
        </div>
      )}
      {msg && (
        <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/5">
          <p className="text-sm text-green-400">{msg}</p>
        </div>
      )}

      {/* User info + actions */}
      {user && (
        <section className="p-5 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-4">
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Account</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">ID</p>
              <p className="font-mono text-foreground text-xs">{user.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Firebase UID</p>
              <p className="font-mono text-foreground text-xs truncate">{user.firebase_uid}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Last login</p>
              <p className="text-foreground">{fmtDateTime(user.last_login_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Email verified</p>
              <p className={user.is_email_verified ? "text-green-400" : "text-red-400"}>
                {user.is_email_verified ? "Yes" : "No"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={toggleActive}
              disabled={busy === "toggle"}
              className={`h-8 px-4 rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                user.is_active !== false
                  ? "border border-red-500/20 text-red-400 hover:bg-red-500/10"
                  : "border border-green-500/20 text-green-400 hover:bg-green-500/10"
              }`}
            >
              {busy === "toggle" && <Loader2 className="w-3 h-3 animate-spin" />}
              {user.is_active !== false ? "Disable account" : "Enable account"}
            </button>
            <button
              onClick={handlePortalSession}
              disabled={busy === "portal"}
              className="h-8 px-4 rounded-lg border border-foreground/10 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy === "portal" && <Loader2 className="w-3 h-3 animate-spin" />}
              <ExternalLink className="w-3 h-3" /> Stripe Portal
            </button>
          </div>
        </section>
      )}

      {/* Credits */}
      <section className="p-5 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-4">
        <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Adjust Credits</h2>
        <p className="text-sm text-muted-foreground">
          Current balance: <span className="text-foreground font-mono">{user?.token_balance?.toLocaleString() ?? "—"}</span>
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount (+ or -)"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            className="w-36 h-9 px-3 rounded-lg border border-foreground/10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
          />
          <input
            type="text"
            placeholder="Reason"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            className="flex-1 h-9 px-3 rounded-lg border border-foreground/10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
          />
          <button
            onClick={handleAdjustCredits}
            disabled={!adjustAmount || !adjustReason || busy === "adjust"}
            className="h-9 px-4 rounded-lg bg-foreground text-background text-sm hover:bg-foreground/90 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {busy === "adjust" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Adjust
          </button>
        </div>
      </section>

      {/* Subscription */}
      <section className="p-5 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-4">
        <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Subscription</h2>
        {sub ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Plan</p>
                <p className="text-foreground">{sub.plan.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <p className="text-foreground">{sub.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Period end</p>
                <p className="text-foreground">{fmtDate(sub.current_period_end)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Cancels at</p>
                <p className={sub.cancel_at ? "text-orange-400" : "text-muted-foreground"}>{fmtDate(sub.cancel_at)}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {plans.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={changePlanId}
                    onChange={(e) => setChangePlanId(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] text-sm text-foreground focus:outline-none focus:border-foreground/30"
                  >
                    <option value="">Select new plan…</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button
                    onClick={handleChangePlan}
                    disabled={!changePlanId || busy === "changePlan"}
                    className="h-9 px-4 rounded-lg border border-foreground/10 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {busy === "changePlan" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Change Plan
                  </button>
                </div>
              )}
              {!sub.cancel_at && (
                <button
                  onClick={handleCancelSub}
                  disabled={busy === "cancelSub"}
                  className="h-9 px-4 rounded-lg border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {busy === "cancelSub" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Cancel Subscription
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No active subscription.</p>
        )}
      </section>

      {/* Invoices */}
      {invoices.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Invoices</h2>
          <div className="rounded-xl border border-foreground/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-mono text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(inv.paid_at)}</td>
                    <td className="px-4 py-3 text-foreground capitalize">{inv.type?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                        inv.status === "paid" ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-muted-foreground bg-foreground/5 border-foreground/10"
                      }`}>{inv.status ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{fmt(inv.amount_paid, inv.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      {inv.hosted_invoice_url && (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Credit ledger */}
      {ledger.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Credit History</h2>
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
                {ledger.map((e) => (
                  <tr key={e.id} className="hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</td>
                    <td className="px-4 py-3 text-xs font-mono capitalize">{e.event_type?.replace(/_/g, " ") ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-mono text-sm ${e.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                      {e.amount > 0 ? "+" : ""}{e.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">{e.balance_after.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
