import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QueryClient } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { Providers } from "@/app/providers";
import { criarQueryClient } from "@/app/queryClient";
import { tokenStorage } from "@/features/auth/tokenStorage";

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper" | "queries"> {
  /** Rota inicial (padrão "/"). */
  route?: string;
  /** Padrão de caminho da rota que renderiza `ui` (padrão "*"; use "/historico/:id" para ter params). */
  path?: string;
  /** Rotas extras (ex.: { path: "/login", element: <p>login</p> } para checar redirecionamento). */
  routes?: RouteObject[];
  /** Árvore completa de rotas (ex.: `routes` de src/app/routes.tsx); ignora `ui`, `path` e `routes`. */
  routerRoutes?: RouteObject[];
  /** Token salvo antes de renderizar (simula usuário logado). Use criarJwtFake(). */
  token?: string;
  queryClient?: QueryClient;
}

/**
 * Renderiza com QueryClient novo (sem retry), AuthProvider, Toaster e um data router em memória.
 * Retorna também `user` (userEvent), `router` e `queryClient`.
 */
export function renderWithProviders(ui: ReactElement | null, opcoes: RenderWithProvidersOptions = {}) {
  const {
    route = "/",
    path = "*",
    routes = [],
    routerRoutes,
    token,
    queryClient = criarQueryClientDeTeste(),
    ...renderOptions
  } = opcoes;

  if (token) tokenStorage.set(token);

  const arvore: RouteObject[] = routerRoutes ?? [{ path, element: ui }, ...routes];
  const router = createMemoryRouter(arvore, { initialEntries: [route] });

  const resultado = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
    renderOptions,
  );

  return { ...resultado, user: userEvent.setup(), router, queryClient };
}

export function criarQueryClientDeTeste(): QueryClient {
  const qc = criarQueryClient();
  qc.setDefaultOptions({
    queries: { retry: false, staleTime: 0, gcTime: Infinity },
    mutations: { retry: false },
  });
  return qc;
}
