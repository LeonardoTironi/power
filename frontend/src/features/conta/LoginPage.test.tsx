import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { credenciaisPadrao } from "@/test/handlers/auth";
import { criarJwtFake } from "@/test/jwt";
import { renderWithProviders } from "@/test/render";
import { tokenStorage } from "@/features/auth/tokenStorage";
import { LoginPage } from "@/pages/LoginPage";

const rotas = [
  { path: "/avaliar", element: <p>página avaliar</p> },
  { path: "/historico", element: <p>página histórico</p> },
  { path: "/cadastro", element: <p>página cadastro</p> },
];

function renderLogin(route = "/login", token?: string) {
  return renderWithProviders(<LoginPage />, { route, path: "/login", routes: rotas, token });
}

async function preencherEEnviar(user: ReturnType<typeof renderLogin>["user"], email: string, senha: string) {
  await user.type(screen.getByLabelText(/^E-mail/), email);
  await user.type(screen.getByLabelText(/^Senha/), senha);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginPage", () => {
  it("entra e redireciona para o next", async () => {
    const { user, router } = renderLogin(`/login?next=${encodeURIComponent("/historico?exercicio=supino")}`);
    await preencherEEnviar(user, credenciaisPadrao.email, credenciaisPadrao.senha);
    expect(await screen.findByText("página histórico")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?exercicio=supino");
    expect(tokenStorage.get()).not.toBeNull();
  });

  it("mostra erro genérico com credenciais inválidas (401)", async () => {
    const { user } = renderLogin();
    await preencherEEnviar(user, credenciaisPadrao.email, "senha-errada");
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
    expect(tokenStorage.get()).toBeNull();
  });

  it("ignora next externo e vai para /avaliar", async () => {
    const { user, router } = renderLogin(`/login?next=${encodeURIComponent("//evil.com")}`);
    await preencherEEnviar(user, credenciaisPadrao.email, credenciaisPadrao.senha);
    expect(await screen.findByText("página avaliar")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/avaliar");
  });

  it("redireciona quem já está logado", async () => {
    renderLogin("/login?next=%2Fhistorico", criarJwtFake());
    expect(await screen.findByText("página histórico")).toBeInTheDocument();
  });

  it("valida os campos e foca o primeiro erro", async () => {
    const { user } = renderLogin();
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Informe seu e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha.")).toBeInTheDocument();
    const email = screen.getByLabelText(/^E-mail/);
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText(/^Senha/)).toHaveAttribute("autocomplete", "current-password");
  });

  it("mostra indisponibilidade em erro de rede", async () => {
    server.use(http.post(api("/auth/login"), () => HttpResponse.error()));
    const { user } = renderLogin();
    await preencherEEnviar(user, credenciaisPadrao.email, credenciaisPadrao.senha);
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Serviço indisponível");
    expect(alerta).toHaveTextContent("Não foi possível conectar ao servidor");
  });

  it("mostra e oculta a senha", async () => {
    const { user } = renderLogin();
    const senha = screen.getByLabelText(/^Senha/);
    const alternar = screen.getByRole("button", { name: "Mostrar senha" });
    expect(senha).toHaveAttribute("type", "password");
    expect(alternar).toHaveAttribute("aria-pressed", "false");
    await user.click(alternar);
    expect(senha).toHaveAttribute("type", "text");
    expect(alternar).toHaveAttribute("aria-pressed", "true");
  });

  it("link de cadastro preserva o next", () => {
    renderLogin("/login?next=%2Fhistorico");
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro?next=%2Fhistorico");
  });
});
