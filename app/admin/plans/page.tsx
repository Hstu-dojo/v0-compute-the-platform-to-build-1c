"use client";

import { useState, useEffect, useCallback } from "react";
import { adminGetPlans, adminCreatePlan, type Plan } from "@/lib/api";
import { Plus, AlertCircle, Loader2, X, Check } from "lucide-react";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    code: "", name: "", monthly_credit_allotment: "", price_monthly: "", currency: "usd",
    credits_rollover: false, is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetPlans(showInactive);
      setPlans(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { load(); }, [load]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      await adminCreatePlan({
        code: form.code,
        name: form.name,
        monthly_credit_allotment: parseInt(form.monthly_credit_allotment),
        price_monthly: form.price_monthly ? parseFloat(form.price_monthly) : null,
        currency: form.currency,
        credits_rollover: form.credits_rollover,
        is_active: form.is_active,
      });
      showMsg("Plan created.");
      setShowForm(false);
      setForm({ code: "", name: "", monthly_credit_allotment: "", price_monthly: "", currency: "usd", credits_rollover: false, is_active: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground mb-1">Plans</h1>
          <p className="text-sm text-muted-foreground">Stripe-backed subscription packages.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
            Show inactive
          </label>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-sm hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}
      {msg && (
        <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/5">
          <p className="text-sm text-green-400">{msg}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="p-5 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-4">
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">New Plan</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "code", label: "Code", placeholder: "starter" },
              { key: "name", label: "Name", placeholder: "Starter" },
              { key: "monthly_credit_allotment", label: "Monthly Credits", placeholder: "2000", type: "number" },
              { key: "price_monthly", label: "Price / Month (blank = free)", placeholder: "9.99", type: "number" },
              { key: "currency", label: "Currency", placeholder: "usd" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <input
                  type={type ?? "text"}
                  required={key !== "price_monthly"}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-foreground/10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={form.credits_rollover} onChange={(e) => setForm({ ...form, credits_rollover: e.target.checked })} />
              Credits rollover
            </label>
            <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="h-9 px-5 rounded-lg bg-foreground text-background text-sm hover:bg-foreground/90 disabled:opacity-40 flex items-center gap-1.5">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="h-9 px-4 rounded-lg border border-foreground/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-foreground/10 animate-pulse bg-foreground/[0.02]" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-foreground/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">Credits/mo</th>
                <th className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">Price/mo</th>
                <th className="px-4 py-3 text-center text-xs font-mono text-muted-foreground">Rollover</th>
                <th className="px-4 py-3 text-center text-xs font-mono text-muted-foreground">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {plans.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No plans found.</td></tr>
              ) : plans.map((p) => (
                <tr key={p.id} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-foreground">{p.code}</td>
                  <td className="px-4 py-3 text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{p.monthly_credit_allotment.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{p.price_monthly != null ? `$${p.price_monthly}` : "Free"}</td>
                  <td className="px-4 py-3 text-center">{p.credits_rollover ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-center">{p.is_active !== false ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
