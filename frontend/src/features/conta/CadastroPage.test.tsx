import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { credenciaisPadrao, EMAIL_JA_CADASTRADO } from "@/test/handlers/auth";
import { renderWithProviders } from "@/test/render";
import { tokenStorage } from "@/features/auth/tokenStorage";
import { CadastroPage } from "@/pages/CadastroPage";
import { LoginPage } from "@/pages/LoginPage";
import type { CadastroEntrada } from "@/types/api";

const rotas = [
  { path: "/avaliar", element: <p>página avaliar</p> },
  { path: "/historico", element: <p>página histórico</p> },
  { path: "/login", element: <LoginPage /> },
];

function renderCadastro(route = "/cadastro") {
  return renderWithProviders(<CadastroPage />, { route, path: "/cadastro", routes: rotas });
}

type Usuario = ReturnType<typeof renderCadastro>["user"];

async function preencher(
  user: Usuario,
  { email = credenciaisPadrao.email, senha = credenciaisPadrao.senha, consentir = true } = {},
) {
  await user.type(screen.getByLabelText(/^Nome/), "Ana Souza");
  await user.type(screen.getByLabelText(/^E-mail/), email);
  await user.type(screen.getByLabelText(/^Senha/), senha);
  await user.type(screen.getByLabelText(/^Confirmar senha/), senha);
  if (consentir) await user.click(screen.getByRole("checkbox", { name: /Li e aceito/ }));
}

const enviar = (user: Usuario) => user.click(screen.getByRole("button", { name: "Criar conta" }));

describe("CadastroPage", () => {
  it("bloqueia o envio sem consentimento LGPD", async () => {
    let chamadas = 0;
    server.use(
      http.post(api("/auth/cadastro"), () => {
        chamadas += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const { user } = renderCadastro();
    await preencher(user, { consentir: false });
    await enviar(user);
    expect(await screen.findByText("É necessário aceitar os termos de uso e privacidade.")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox", { name: /Li e aceito/ });
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveFocus();
    expect(chamadas).toBe(0);
  });

  it("mostra erro no e-mail quando já cadastrado (409)", async () => {
    const { user } = renderCadastro();
    await preencher(user, { email: EMAIL_JA_CADASTRADO });
    await enviar(user);
    expect(await screen.findByText("E-mail já cadastrado.")).toBeInTheDocument();
    const email = screen.getByLabelText(/^E-mail/);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveFocus();
  });

  it("aplica os erros de campo do 422", async () => {
    server.use(
      http.post(api("/auth/cadastro"), () =>
        HttpResponse.json(
          { detail: [{ loc: ["body", "nome"], msg: "String should have at most 120 characters", type: "string_too_long", ctx: { max_length: 120 } }] },
          { status: 422 },
        ),
      ),
    );
    const { user } = renderCadastro();
    await preencher(user);
    await enviar(user);
    expect(await screen.findByText("Deve ter no máximo 120 caracteres.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nome/)).toHaveFocus();
  });

  it("cria a conta, entra automaticamente e redireciona para o next", async () => {
    let corpo: CadastroEntrada | null = null;
    server.use(
      http.post(api("/auth/cadastro"), async ({ request }) => {
        corpo = (await request.json()) as CadastroEntrada;
        return HttpResponse.json(
          { id: "2", nome: corpo.nome, email: corpo.email, criado_em: "2026-11-22T10:00:00Z" },
          { status: 201 },
        );
      }),
    );
    const { user, router } = renderCadastro("/cadastro?next=%2Fhistorico");
    await preencher(user);
    await enviar(user);
    expect(await screen.findByText("página histórico")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/historico");
    expect(tokenStorage.get()).not.toBeNull();
    expect(corpo).toEqual({
      nome: "Ana Souza",
      email: credenciaisPadrao.email,
      senha: credenciaisPadrao.senha,
      consentimento_lgpd: true,
    });
  });

  it("manda para o login com aviso se o login automático falhar", async () => {
    server.use(http.post(api("/auth/login"), () => HttpResponse.json({ detail: "x" }, { status: 503 })));
    const { user, router } = renderCadastro();
    await preencher(user);
    await enviar(user);
    expect(await screen.findByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(screen.getByText(/Conta criada com sucesso/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^E-mail/)).toHaveValue(credenciaisPadrao.email);
    expect(tokenStorage.get()).toBeNull();
  });

  it("exige senhas iguais e usa autocomplete de nova senha", async () => {
    const { user } = renderCadastro();
    await user.type(screen.getByLabelText(/^Nome/), "Ana");
    await user.type(screen.getByLabelText(/^E-mail/), "ana@exemplo.com");
    await user.type(screen.getByLabelText(/^Senha/), "senha-segura-123");
    await user.type(screen.getByLabelText(/^Confirmar senha/), "outra-senha-123");
    await user.click(screen.getByRole("checkbox", { name: /Li e aceito/ }));
    await enviar(user);
    expect(await screen.findByText("As senhas não conferem.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nome/)).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText(/^Senha/)).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByRole("link", { name: /Termo de Consentimento e Privacidade/ })).toHaveAttribute("href", "/termos");
  });
});
