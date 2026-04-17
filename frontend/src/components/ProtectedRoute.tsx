import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/authContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="rounded-2xl border border-border/60 bg-card px-5 py-4 text-sm text-muted-foreground">
          Checking your session...
        </div>
      </div>
    );
  }

  if (!user) {
    const loginPath = location.pathname.startsWith("/hospital") ? "/hospital/login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
