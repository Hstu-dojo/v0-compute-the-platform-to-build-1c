"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DevTokenPanel } from "@/components/dev/token-panel";
import { DashNav } from "@/components/dashboard/dash-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex">
        <DashNav />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
      <DevTokenPanel />
    </ProtectedRoute>
  );
}
