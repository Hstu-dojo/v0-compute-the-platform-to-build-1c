"use client";

import { useState, useEffect, useCallback } from "react";
import { adminGetModelConfigs, adminCreateModelConfig, adminUpdateModelConfig, type ModelConfig } from "@/lib/api";
import { Plus, AlertCircle, Loader2, X, Check, Pencil } from "lucide-react";

export default function AdminModelConfigsPage() {
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editForm, setEditForm] = useState({ rollout_percentage: "", is_active: true, fallback_model_name: "", fallback_provider: "" });

  const [form, setForm] = useState({
    task_type: "", provider: "", model_name: "", model_version: "", fallback_model_name: "",
    fallback_provider: "", token_multiplier: "", rollout_percentage: "100", is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetModelConfigs();
      setConfigs((res as { data: ModelConfig[] }).data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load model configs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      await adminCreateModelConfig({
        task_type: form.task_type,
        provider: form.provider,
        model_name: form.model_name,
        model_version: form.model_version || null,
        fallback_model_name: form.fallback_model_name || null,
        fallback_provider: form.fallback_provider || null,
        token_multiplier: form.token_multiplier ? parseFloat(form.token_multiplier) : null,
        rollout_percentage: form.rollout_percentage ? parseInt(form.rollout_percentage) : null,
        is_active: form.is_active,
      });
      showMsg("Config created.");
      setShowForm(false);
      setForm({ task_type: "", provider: "", model_name: "", model_version: "", fallback_model_name: "", fallback_provider: "", token_multiplier: "", rollout_percentage: "100", is_active: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create config");
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (c: ModelConfig) => {
    setEditId(c.id);
    setEditForm({
      rollout_percentage: String(c.rollout_percentage ?? 100),
      is_active: c.is_active ?? true,
      fallback_model_name: c.fallback_model_name ?? "",
      fallback_provider: c.fallback_provider ?? "",
    });
  };

  const handleSaveEdit = async (id: string) => {
    setEditBusy(true);
    try {
      await adminUpdateModelConfig(id, {
        rollout_percentage: editForm.rollout_percentage ? parseInt(editForm.rollout_percentage) : undefined,
        is_active: editForm.is_active,
        fallback_model_name: editForm.fallback_model_name || undefined,
        fallback_provider: editForm.fallback_provider || undefined,
      });
      showMsg("Config updated.");
      setEditId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update config");
    } finally {
      setEditBusy(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground mb-1">Model Configs</h1>
          <p className="text-sm text-muted-foreground">AI model configuration and routing.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-sm hover:bg-foreground/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Config
        </button>
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
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">New Model Config</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "task_type", label: "Task Type", placeholder: "notes" },
              { key: "provider", label: "Provider", placeholder: "openai" },
              { key: "model_name", label: "Model Name", placeholder: "gpt-4o" },
              { key: "model_version", label: "Model Version (optional)", placeholder: "" },
              { key: "fallback_model_name", label: "Fallback Model (optional)", placeholder: "" },
              { key: "fallback_provider", label: "Fallback Provider (optional)", placeholder: "" },
              { key: "token_multiplier", label: "Token Multiplier (optional)", placeholder: "1.0", type: "number" },
              { key: "rollout_percentage", label: "Rollout %", placeholder: "100", type: "number" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <input
                  type={type ?? "text"}
                  required={["task_type", "provider", "model_name"].includes(key)}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-foreground/10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
                />
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
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
                <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Task Type</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Provider / Model</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Fallback</th>
                <th className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">Rollout</th>
                <th className="px-4 py-3 text-center text-xs font-mono text-muted-foreground">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {configs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No configs found.</td></tr>
              ) : configs.map((c) => (
                <>
                  <tr key={c.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-foreground text-xs">{c.task_type}</td>
                    <td className="px-4 py-3">
                      <p className="text-foreground text-xs">{c.provider}</p>
                      <p className="text-muted-foreground text-xs">{c.model_name}{c.model_version ? ` (${c.model_version})` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.fallback_provider ? `${c.fallback_provider} / ${c.fallback_model_name}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{c.rollout_percentage ?? 100}%</td>
                    <td className="px-4 py-3 text-center">{c.is_active !== false ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground mx-auto" />}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => editId === c.id ? setEditId(null) : handleEdit(c)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  {editId === c.id && (
                    <tr key={`${c.id}-edit`}>
                      <td colSpan={6} className="px-4 py-4 bg-foreground/[0.03]">
                        <div className="flex gap-2 flex-wrap items-end">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Rollout %</label>
                            <input type="number" min={0} max={100} value={editForm.rollout_percentage} onChange={(e) => setEditForm({ ...editForm, rollout_percentage: e.target.value })} className="w-24 h-8 px-2 rounded border border-foreground/10 bg-transparent text-sm text-foreground focus:outline-none focus:border-foreground/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Fallback Model</label>
                            <input type="text" value={editForm.fallback_model_name} onChange={(e) => setEditForm({ ...editForm, fallback_model_name: e.target.value })} className="h-8 px-2 rounded border border-foreground/10 bg-transparent text-sm text-foreground focus:outline-none focus:border-foreground/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Fallback Provider</label>
                            <input type="text" value={editForm.fallback_provider} onChange={(e) => setEditForm({ ...editForm, fallback_provider: e.target.value })} className="h-8 px-2 rounded border border-foreground/10 bg-transparent text-sm text-foreground focus:outline-none focus:border-foreground/30" />
                          </div>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pb-1">
                            <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                            Active
                          </label>
                          <button onClick={() => handleSaveEdit(c.id)} disabled={editBusy} className="h-8 px-3 rounded bg-foreground text-background text-xs hover:bg-foreground/90 disabled:opacity-40 flex items-center gap-1">
                            {editBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                            Save
                          </button>
                          <button onClick={() => setEditId(null)} className="h-8 px-3 rounded border border-foreground/10 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
