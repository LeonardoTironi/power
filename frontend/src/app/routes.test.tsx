import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { criarJwtFake } from "@/test/jwt";
import { renderWithProviders } from "@/test/render";
import { tokenStorage } from "@/features/auth/tokenStorage";
import { routes } from "./routes";

describe("rotas", () => {
  it("renderiza a página inicial com layout e link de pular conteúdo", async () => {
    renderWithProviders(null, { routerRoutes: routes, route: "/" });
    expect(await screen.findByRole("heading", { level: 1, name: "Scouter Power" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveAttribute("href", "#conteudo");
    expect(screen.getByRole("main")).toHaveAttribute("id", "conteudo");
    expect(screen.queryByText(/SYNC_DATA/)).not.toBeInTheDocument();
    expect(document.title).toBe("Scouter Power · Descubra seu nível de força");
  });

  it("mostra a página 404 em rota desconhecida", async () => {
    renderWithProviders(null, { routerRoutes: routes, route: "/nao-existe" });
    expect(await screen.findByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
    expect(document.title).toBe("Página não encontrada · Scouter Power");
  });

  it("redireciona rota protegida para o login com next", async () => {
    const { router } = renderWithProviders(null, { routerRoutes: routes, route: "/historico/abc" });
    expect(await screen.findByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent("/historico/abc")}`);
  });

  it("mostra Histórico, Conta e Sair quando logado", async () => {
    server.use(
      http.get(api("/usuarios/me"), () =>
        HttpResponse.json({ id: "1", nome: "Ana Souza", email: "ana@exemplo.com", criado_em: "2026-11-01T10:00:00Z" }),
      ),
    );
    renderWithProviders(null, { routerRoutes: routes, route: "/conta", token: criarJwtFake() });
    expect(await screen.findByRole("heading", { level: 1, name: "Minha conta" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Histórico" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Conta" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Sair" })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("abre e fecha o menu mobile com Esc", async () => {
    const { user } = renderWithProviders(null, { routerRoutes: routes, route: "/" });
    const botao = await screen.findByRole("button", { name: "Abrir menu" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    await user.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("menu-mobile")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveFocus();
  });

  it.each([
    ["desktop", "Principal"],
    ["celular", "Principal (celular)"],
  ])("Sair numa rota protegida (menu %s) volta para a página inicial, não para o login", async (_menu, nomeNav) => {
    const { user, router } = renderWithProviders(null, { routerRoutes: routes, route: "/conta", token: criarJwtFake() });
    expect(await screen.findByRole("heading", { level: 1, name: "Minha conta" })).toBeInTheDocument();
    expect(document.title).toBe("Minha conta · Scouter Power");

    if (nomeNav === "Principal (celular)") await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const nav = screen.getByRole("navigation", { name: nomeNav });
    await user.click(within(nav).getByRole("button", { name: "Sair" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Scouter Power" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(router.state.location.search).toBe("");
    await waitFor(() => expect(tokenStorage.get()).toBeNull());
    expect(screen.queryByRole("heading", { level: 1, name: "Entrar" })).not.toBeInTheDocument();
  });

  it("'Sair da conta' na página da conta também volta para a página inicial", async () => {
    const { user, router } = renderWithProviders(null, { routerRoutes: routes, route: "/conta", token: criarJwtFake() });
    await user.click(await screen.findByRole("button", { name: "Sair da conta" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Scouter Power" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    await waitFor(() => expect(tokenStorage.get()).toBeNull());
  });
});
