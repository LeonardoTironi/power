import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "./useAuth";

/**
 * Exige login. Sem token válido, redireciona para /login?next=<caminho atual>.
 * Use como elemento de rota de layout (renderiza <Outlet/>) ou envolvendo `children`.
 */
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Carregando sua conta…" />
      </div>
    );
  }

  return children ?? <Outlet />;
}
