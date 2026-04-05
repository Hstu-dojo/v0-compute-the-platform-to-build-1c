import { ProtectedRoute } from "@/components/auth/protected-route";
import { DevTokenPanel } from "@/components/dev/token-panel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {children}
      <DevTokenPanel />
    </ProtectedRoute>
  );
}
