"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { adminGetUsers, adminGetPlans, adminGetCreditPacks, adminGetWorkers } from "@/lib/api";
import { Users, Package, Coins, Activity } from "lucide-react";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<{
    users: number | null;
    plans: number | null;
    packs: number | null;
    workers: { active: number; stale: number } | null;
  }>({ users: null, plans: null, packs: null, workers: null });

  useEffect(() => {
    Promise.all([
      adminGetUsers({ limit: 1 }).catch(() => null),
      adminGetPlans(true).catch(() => null),
      adminGetCreditPacks(true).catch(() => null),
      adminGetWorkers().catch(() => null),
    ]).then(([u, p, cp, w]) => {
      setStats({
        users: u ? (u as { data: unknown[] }).data?.length ?? null : null,
        plans: p ? (p as { data: unknown[] }).data?.length ?? null : null,
        packs: cp ? (cp as { data: unknown[] }).data?.length ?? null : null,
        workers: w ? { active: w.workers.active.length, stale: w.workers.stale.length } : null,
      });
    });
  }, []);

  const cards = [
    { href: "/admin/users", label: "Users", icon: Users, value: stats.users },
    { href: "/admin/plans", label: "Plans", icon: Package, value: stats.plans },
    { href: "/admin/credit-packs", label: "Credit Packs", icon: Coins, value: stats.packs },
    {
      href: "/admin/workers",
      label: "Workers",
      icon: Activity,
      value: stats.workers !== null ? `${stats.workers.active} active` : null,
      sub: stats.workers?.stale ? `${stats.workers.stale} stale` : undefined,
    },
  ];

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-display text-foreground mb-1">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">System management and configuration.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ href, label, icon: Icon, value, sub }) => (
          <Link
            key={href}
            href={href}
            className="p-5 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:border-foreground/20 hover:bg-foreground/[0.04] transition-colors"
          >
            <Icon className="w-5 h-5 text-muted-foreground mb-3" />
            <p className="text-xs font-mono text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-display text-foreground">
              {value ?? <span className="text-muted-foreground text-base">—</span>}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </Link>
        ))}
      </div>
    </main>
  );
}
