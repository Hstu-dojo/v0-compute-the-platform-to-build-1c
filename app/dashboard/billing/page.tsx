"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPlans, getCreditPacks, getSubscription, createCheckout, buyTopup, cancelSubscription,
  type Plan, type CreditPack, type Subscription, type Invoice,
} from "@/lib/api";
import { CreditCard, Zap, Check, ExternalLink, AlertCircle, Loader2, X } from "lucide-react";

function fmt(n: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, packsRes, subRes] = await Promise.all([
        getPlans().catch(() => ({ data: [] })),
        getCreditPacks().catch(() => ({ data: [] })),
        getSubscription().catch(() => ({ subscription: null, invoices: [] })),
      ]);
      setPlans(plansRes.data ?? []);
      setPacks(packsRes.data ?? []);
      setSub(subRes.subscription ?? null);
      setInvoices(subRes.invoices ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubscribe = async (plan: Plan) => {
    setBusy(`plan-${plan.id}`);
    try {
      const res = await createCheckout({ plan_id: plan.id, billing_interval: "monthly" });
      if (res.checkout_url) window.location.href = res.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create checkout");
    } finally {
      setBusy(null);
    }
  };

  const handleBuyPack = async (pack: CreditPack) => {
    setBusy(`pack-${pack.id}`);
    try {
      const res = await buyTopup({ topup_pack_id: pack.id });
      if (res.checkout_url) window.location.href = res.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create checkout");
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    setBusy("cancel");
    try {
      await cancelSubscription();
      setCancelConfirm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel subscription");
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

  const currentPlanCode = sub?.plan?.tier ?? "free";

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
      <div>
        <h1 className="text-3xl font-display text-foreground mb-1">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and credit top-ups.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {/* Current subscription */}
      {sub && (
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">Current Subscription</h2>
          <div className="p-5 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-display text-foreground">{sub.plan.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sub.plan.monthly_credit_allotment.toLocaleString()} credits / month
                  {sub.plan.price_monthly != null ? ` · ${fmt(sub.plan.price_monthly)} / mo` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Period ends {fmtDate(sub.current_period_end)}
                  {sub.cancel_at && <span className="text-orange-400 ml-2">· Cancels {fmtDate(sub.cancel_at)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  sub.status === "active"
                    ? "text-green-400 bg-green-500/10 border-green-500/20"
                    : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                }`}>
                  {sub.status}
                </span>
                {!sub.cancel_at && (
                  <button
                    onClick={() => setCancelConfirm(true)}
                    className="text-xs text-muted-foreground hover:text-red-400 transition-colors underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {cancelConfirm && (
            <div className="mt-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-4">
              <p className="text-sm text-red-400 flex-1">Cancel at end of billing period?</p>
              <button
                onClick={handleCancel}
                disabled={busy === "cancel"}
                className="h-8 px-4 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {busy === "cancel" && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm
              </button>
              <button onClick={() => setCancelConfirm(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Dismiss
              </button>
            </div>
          )}
        </section>
      )}

      {/* Plans */}
      {plans.length > 0 && (
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">Subscription Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.code === currentPlanCode;
              const isBusy = busy === `plan-${plan.id}`;
              return (
                <div
                  key={plan.id}
                  className={`p-5 rounded-xl border flex flex-col gap-4 transition-colors ${
                    isCurrent
                      ? "border-foreground/30 bg-foreground/[0.04]"
                      : "border-foreground/10 bg-foreground/[0.02] hover:border-foreground/20"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-display text-foreground">{plan.name}</p>
                      {isCurrent && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-foreground/20 text-muted-foreground">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-display text-foreground">
                      {plan.price_monthly != null ? fmt(plan.price_monthly) : "Free"}
                      {plan.price_monthly != null && <span className="text-sm text-muted-foreground font-sans"> / mo</span>}
                    </p>
                  </div>
                  <div className="flex-1 space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
                      {plan.monthly_credit_allotment.toLocaleString()} credits / month
                    </div>
                    {plan.credits_rollover && (
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
                        Credits roll over
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrent || isBusy}
                    className="w-full h-9 rounded-lg border text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed bg-foreground text-background hover:bg-foreground/90 disabled:bg-foreground/20 disabled:text-muted-foreground"
                  >
                    {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isCurrent ? "Current plan" : "Subscribe"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Credit packs */}
      {packs.length > 0 && (
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">Buy Credits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((pack) => {
              const isBusy = busy === `pack-${pack.id}`;
              return (
                <div
                  key={pack.id}
                  className="p-5 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:border-foreground/20 transition-colors flex flex-col gap-4"
                >
                  <div>
                    <p className="font-display text-foreground mb-1">{pack.name}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-display text-foreground">{fmt(pack.price, pack.currency)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      {pack.credits.toLocaleString()} credits
                    </p>
                  </div>
                  <button
                    onClick={() => handleBuyPack(pack)}
                    disabled={isBusy}
                    className="w-full h-9 rounded-lg border border-foreground/20 text-sm text-foreground hover:border-foreground/40 hover:bg-foreground/5 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Buy now
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">Invoice History</h2>
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
                  <tr key={inv.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.paid_at)}</td>
                    <td className="px-4 py-3 text-foreground capitalize">{inv.type?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                        inv.status === "paid"
                          ? "text-green-400 bg-green-500/10 border-green-500/20"
                          : "text-muted-foreground bg-foreground/5 border-foreground/10"
                      }`}>
                        {inv.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{fmt(inv.amount_paid, inv.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      {inv.hosted_invoice_url && (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                        >
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

      {!loading && plans.length === 0 && packs.length === 0 && !sub && (
        <div className="text-center py-20 rounded-2xl border border-foreground/10 border-dashed">
          <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No billing options available yet.</p>
        </div>
      )}
    </main>
  );
}
