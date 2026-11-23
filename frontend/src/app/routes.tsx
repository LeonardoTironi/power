import type { RouteObject } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { CarregandoPagina } from "./CarregandoPagina";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

/**
 * Árvore de rotas (usada pelo createBrowserRouter e pelos testes com createMemoryRouter).
 * Cada página é carregada sob demanda (lazy) e exporta o componente nomeado.
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    HydrateFallback: CarregandoPagina,
    children: [
      {
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, lazy: () => import("@/pages/HomePage").then((m) => ({ Component: m.HomePage })) },
          { path: "avaliar", lazy: () => import("@/pages/AvaliacaoPage").then((m) => ({ Component: m.AvaliacaoPage })) },
          { path: "login", lazy: () => import("@/pages/LoginPage").then((m) => ({ Component: m.LoginPage })) },
          { path: "cadastro", lazy: () => import("@/pages/CadastroPage").then((m) => ({ Component: m.CadastroPage })) },
          { path: "termos", lazy: () => import("@/pages/TermosPage").then((m) => ({ Component: m.TermosPage })) },
          {
            element: <ProtectedRoute />,
            children: [
              { path: "conta", lazy: () => import("@/pages/ContaPage").then((m) => ({ Component: m.ContaPage })) },
              { path: "historico", lazy: () => import("@/pages/HistoricoPage").then((m) => ({ Component: m.HistoricoPage })) },
              {
                path: "historico/:id",
                lazy: () => import("@/pages/AvaliacaoDetalhePage").then((m) => ({ Component: m.AvaliacaoDetalhePage })),
              },
            ],
          },
          { path: "*", lazy: () => import("@/pages/NotFoundPage").then((m) => ({ Component: m.NotFoundPage })) },
        ],
      },
    ],
  },
];
