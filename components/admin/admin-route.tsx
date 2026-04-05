"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, user, sessionData } = useAuth();
  const router = useRouter();

  const isAdmin = sessionData?.user?.role === "admin";

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/dashboard");
    }
  }, [loading, user, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;
  return <>{children}</>;
}
