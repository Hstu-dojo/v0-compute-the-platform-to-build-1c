"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminGetUsers, type AdminUser } from "@/lib/api";
import { Search, ChevronDown, AlertCircle } from "lucide-react";

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const load = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const res = await adminGetUsers({
        limit: 30,
        cursor: reset ? undefined : cursor ?? undefined,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      const data = (res as { data: AdminUser[]; next_cursor: string | null }).data ?? [];
      const next = (res as { data: AdminUser[]; next_cursor: string | null }).next_cursor ?? null;
      if (reset) setUsers(data);
      else setUsers((prev) => [...prev, ...data]);
      setCursor(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, roleFilter, cursor]);

  useEffect(() => { load(true); }, [search, roleFilter]); // eslint-disable-line

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground mb-1">Users</h1>
        <p className="text-sm text-muted-foreground">All registered users.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] text-sm text-foreground focus:outline-none focus:border-foreground/30 transition-colors"
        >
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl border border-foreground/10 animate-pulse bg-foreground/[0.02]" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-foreground/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Credits</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No users found.</td>
                  </tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{u.display_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                        u.role === "admin"
                          ? "text-violet-400 bg-violet-500/10 border-violet-500/20"
                          : "text-muted-foreground bg-foreground/5 border-foreground/10"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs capitalize">
                      {u.subscription?.plan ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">
                      {u.token_balance?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {fmtDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                        u.is_active !== false
                          ? "text-green-400 bg-green-500/10 border-green-500/20"
                          : "text-red-400 bg-red-500/10 border-red-500/20"
                      }`}>
                        {u.is_active !== false ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cursor && (
            <div className="flex justify-center">
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="flex items-center gap-2 h-9 px-5 rounded-lg border border-foreground/10 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40"
              >
                {loadingMore ? "Loading…" : <><ChevronDown className="w-4 h-4" /> Load more</>}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
