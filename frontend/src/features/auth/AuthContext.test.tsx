import { describe, expect, it } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { criarJwtFake } from "@/test/jwt";
import { renderWithProviders } from "@/test/render";
import { apiFetch } from "@/lib/http";
import type { UsuarioPublico } from "@/types/api";
import { ProtectedRoute } from "./ProtectedRoute";
import { tokenStorage } from "./tokenStorage";
import { useAuth } from "./useAuth";

const usuario: UsuarioPublico = {
  id: "00000000-0000-0000-0000-000000000001",
  nome: "Ana Souza",
  email: "ana@exemplo.com",
  criado_em: "2026-11-01T10:00:00Z",
};

function usarMe(resposta: () => Response) {
  server.use(http.get(api("/usuarios/me"), resposta));
}

function Sonda() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <p>autenticado: {String(isAuthenticated)}</p>
      <p>carregando: {String(isLoading)}</p>
      <p>usuario: {user?.nome ?? "nenhum"}</p>
      <button onClick={() => login(criarJwtFake())}>entrar</button>
      <button onClick={() => logout()}>sair</button>
    </div>
  );
}

describe("AuthContext", () => {
  it("começa deslogado sem token", () => {
    renderWithProviders(<Sonda />);
    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
    expect(screen.getByText("usuario: nenhum")).toBeInTheDocument();
  });

  it("carrega /usuarios/me quando há token salvo", async () => {
    usarMe(() => HttpResponse.json(usuario));
    renderWithProviders(<Sonda />, { token: criarJwtFake() });
    expect(screen.getByText("autenticado: true")).toBeInTheDocument();
    expect(await screen.findByText("usuario: Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("carregando: false")).toBeInTheDocument();
  });

  it("descarta token expirado ao iniciar", () => {
    renderWithProviders(<Sonda />, { token: criarJwtFake({ expiraEmSegundos: -60 }) });
    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it("login guarda o token e logout apaga", async () => {
    usarMe(() => HttpResponse.json(usuario));
    const { user } = renderWithProviders(<Sonda />);
    await user.click(screen.getByRole("button", { name: "entrar" }));
    expect(await screen.findByText("usuario: Ana Souza")).toBeInTheDocument();
    expect(tokenStorage.get()).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "sair" }));
    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
    expect(screen.getByText("usuario: nenhum")).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it("desloga ao receber 401 de rota autenticada", async () => {
    usarMe(() => HttpResponse.json({ detail: "Não autenticado ou token inválido." }, { status: 401 }));
    renderWithProviders(<Sonda />, { token: criarJwtFake() });
    await waitFor(() => expect(screen.getByText("autenticado: false")).toBeInTheDocument());
    expect(tokenStorage.get()).toBeNull();
  });

  it("desloga quando outra chamada autenticada recebe 401", async () => {
    usarMe(() => HttpResponse.json(usuario));
    server.use(http.get(api("/avaliacoes/historico"), () => HttpResponse.json({ detail: "x" }, { status: 401 })));
    renderWithProviders(<Sonda />, { token: criarJwtFake() });
    await screen.findByText("usuario: Ana Souza");
    await act(async () => {
      await apiFetch("/avaliacoes/historico").catch(() => undefined);
    });
    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
  });

  it("desloga automaticamente quando o token expira", async () => {
    usarMe(() => HttpResponse.json(usuario));
    renderWithProviders(<Sonda />, { token: criarJwtFake({ expiraEmSegundos: 2 }) });
    expect(screen.getByText("autenticado: true")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("autenticado: false")).toBeInTheDocument(), { timeout: 3500 });
  });
});

describe("ProtectedRoute", () => {
  const rotas = [
    {
      path: "/login",
      Component: function Login() {
        return <p>tela de login</p>;
      },
    },
  ];

  it("redireciona para /login?next= sem login", async () => {
    const { router } = renderWithProviders(
      <ProtectedRoute>
        <p>conteúdo protegido</p>
      </ProtectedRoute>,
      { route: "/historico?exercicio=supino", path: "/historico", routes: rotas },
    );
    expect(await screen.findByText("tela de login")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(new URLSearchParams(router.state.location.search).get("next")).toBe("/historico?exercicio=supino");
  });

  it("renderiza o conteúdo com login", async () => {
    usarMe(() => HttpResponse.json(usuario));
    renderWithProviders(
      <ProtectedRoute>
        <p>conteúdo protegido</p>
      </ProtectedRoute>,
      { route: "/historico", path: "/historico", routes: rotas, token: criarJwtFake() },
    );
    expect(await screen.findByText("conteúdo protegido")).toBeInTheDocument();
  });
});
