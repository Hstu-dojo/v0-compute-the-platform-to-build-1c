"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getCredits, type CreditBalance } from "@/lib/api";
import { LayoutDashboard, Upload, LogOut, Zap } from "lucide-react";

export function DashNav() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [credits, setCredits] = useState<CreditBalance | null>(null);

  useEffect(() => {
    getCredits()
      .then(setCredits)
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const navItems = [
    { href: "/dashboard", label: "Documents", icon: LayoutDashboard },
    { href: "/dashboard/upload", label: "Upload", icon: Upload },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-foreground/10 flex flex-col min-h-screen sticky top-0">
      {/* Logo */}
      <div className="h-14 px-5 flex items-center border-b border-foreground/10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-display text-foreground">PilotAI</span>
          <span className="text-[9px] text-muted-foreground font-mono">TM</span>
        </Link>
      </div>

      {/* Credits */}
      <div className="px-4 py-3 border-b border-foreground/10">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-foreground/[0.03] border border-foreground/8">
          <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-muted-foreground">Credits</p>
            <p className="text-sm font-display text-foreground leading-none mt-0.5">
              {credits !== null ? credits.balance.toLocaleString() : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-foreground/8 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="p-3 border-t border-foreground/10">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-muted-foreground truncate">
            {user?.displayName ?? user?.email?.split("@")[0] ?? "User"}
          </p>
          <p className="text-[11px] text-muted-foreground/60 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
