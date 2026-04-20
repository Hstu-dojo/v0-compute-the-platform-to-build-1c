"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminRoute } from "@/components/admin/admin-route";
import { useAuth } from "@/lib/auth-context";
import { Users, Package, Coins, Activity, Cpu, Mail, LayoutDashboard, ChevronLeft, BookOpen, ExternalLink } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/plans", label: "Plans", icon: Package },
  { href: "/admin/credit-packs", label: "Credit Packs", icon: Coins },
  { href: "/admin/workers", label: "Workers", icon: Activity },
  { href: "/admin/model-configs", label: "Model Configs", icon: Cpu },
  { href: "/admin/dead-letter", label: "Dead Letters", icon: Mail },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { idToken } = useAuth();

  return (
    <AdminRoute>
      <div className="flex min-h-screen">
        <aside className="w-52 shrink-0 border-r border-foreground/10 flex flex-col sticky top-0 h-screen">
          <div className="h-14 px-4 flex items-center border-b border-foreground/10 gap-2">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <span className="text-sm font-display text-foreground">Admin</span>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
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
            <div className="pt-2 mt-2">
              <a
                href={`https://tutor-ai.up.railway.app/api/v1/docs/login?token=${idToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors mt-2"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                API Docs
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </a>
            </div>
          </nav>
        </aside>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </AdminRoute>
  );
}
