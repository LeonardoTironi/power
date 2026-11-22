import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { usuarioPadrao } from "@/test/handlers/auth";
import { criarJwtFake } from "@/test/jwt";
import { renderWithProviders } from "@/test/render";
import { tokenStorage } from "@/features/auth/tokenStorage";
import { ContaPage } from "@/pages/ContaPage";
import { TermosPage } from "@/pages/TermosPage";

function renderConta() {
  return renderWithProviders(<ContaPage />, {
    route: "/conta",
    path: "/conta",
    routes: [{ path: "/", element: <p>página inicial</p> }],
    token: criarJwtFake(),
  });
}

describe("ContaPage", () => {
  it("mostra os dados do usuário e os atalhos", async () => {
    renderConta();
    expect(await screen.findByText(usuarioPadrao.nome)).toBeInTheDocument();
    expect(screen.getByText(usuarioPadrao.email)).toBeInTheDocument();
    expect(screen.getByText("01/11/2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver histórico" })).toHaveAttribute("href", "/historico");
    expect(screen.getByRole("link", { name: "Nova avaliação" })).toHaveAttribute("href", "/avaliar");
  });

  it("exclui a conta após confirmação, chama DELETE e desloga", async () => {
    let exclusoes = 0;
    server.use(
      http.delete(api("/usuarios/me"), () => {
        exclusoes += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, router } = renderConta();
    await screen.findByText(usuarioPadrao.email);

    await user.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    const dialogo = await screen.findByRole("dialog", { name: "Excluir conta?" });
    expect(dialogo).toHaveTextContent("todas as suas avaliações");

    // Sem digitar a confirmação, o botão fica desabilitado e não exclui.
    const confirmar = within(dialogo).getByRole("button", { name: "Excluir definitivamente" });
    expect(confirmar).toBeDisabled();
    const campo = within(dialogo).getByLabelText("Digite EXCLUIR para confirmar");

    // Texto parcial: continua desabilitado; Enter no campo valida e mostra a mensagem (defesa).
    await user.type(campo, "EXCL{Enter}");
    expect(confirmar).toBeDisabled();
    expect(within(dialogo).getByText(/Digite EXCLUIR ou o seu e-mail para confirmar\./)).toBeInTheDocument();
    expect(campo).toHaveFocus();
    expect(exclusoes).toBe(0);

    await user.type(campo, "UIR");
    expect(confirmar).toBeEnabled();
    await user.click(confirmar);

    expect(await screen.findByText("página inicial")).toBeInTheDocument();
    expect(exclusoes).toBe(1);
    expect(router.state.location.pathname).toBe("/");
    await waitFor(() => expect(tokenStorage.get()).toBeNull());
  });

  it("aceita o e-mail como confirmação e mostra erro da API no diálogo", async () => {
    server.use(
      http.delete(api("/usuarios/me"), () =>
        HttpResponse.json({ detail: "Erro interno do servidor." }, { status: 500 }),
      ),
    );
    const { user } = renderConta();
    await screen.findByText(usuarioPadrao.email);
    await user.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    const dialogo = await screen.findByRole("dialog", { name: "Excluir conta?" });
    await user.type(within(dialogo).getByLabelText("Digite EXCLUIR para confirmar"), usuarioPadrao.email.toUpperCase());
    await user.click(within(dialogo).getByRole("button", { name: "Excluir definitivamente" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("Erro interno do servidor.");
    expect(tokenStorage.get()).not.toBeNull();
  });

  it("cancelar fecha o diálogo sem excluir", async () => {
    const { user } = renderConta();
    await screen.findByText(usuarioPadrao.email);
    await user.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    const dialogo = await screen.findByRole("dialog", { name: "Excluir conta?" });
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(tokenStorage.get()).not.toBeNull();
  });
});

describe("TermosPage", () => {
  it("apresenta o termo v1.0 com as seções da LGPD", () => {
    renderWithProviders(<TermosPage />, { route: "/termos" });
    expect(screen.getByRole("heading", { level: 1, name: "Termo de Consentimento e Privacidade" })).toBeInTheDocument();
    expect(screen.getByText("Versão 1.0")).toBeInTheDocument();
    for (const secao of [/Dados coletados/, /Finalidade/, /Base legal/, /retenção/, /Seus direitos/, /Responsável e contato/]) {
      expect(screen.getByRole("heading", { level: 2, name: secao })).toBeInTheDocument();
    }
    expect(screen.getByText(/não substitui orientação profissional/i)).toBeInTheDocument();
  });
});
