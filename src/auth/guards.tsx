import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { FullSpinner } from "../components/ui";
import type { Role } from "../lib/types";

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading || (session && !profile)) return <FullSpinner />;
  if (!session) return <Navigate to={`/login/${role}`} replace />;
  if (!profile || !profile.active || profile.role !== role) return <Navigate to={`/login/${role}`} replace />;
  return <>{children}</>;
}

/** New members (e.g. phone OTP sign-ups) must complete their name and basics first. */
export function NeedsOnboarding({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (profile && !profile.full_name.trim()) return <Navigate to="/member/onboarding" replace />;
  return <>{children}</>;
}
