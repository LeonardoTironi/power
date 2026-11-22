import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { AvaliacaoDetalhePage } from "@/pages/AvaliacaoDetalhePage";
import { HistoricoPage } from "@/pages/HistoricoPage";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { criarAvaliacaoFake, historicoPadrao } from "@/test/handlers/historico";
import { criarJwtFake } from "@/test/jwt";
import { renderWithProviders } from "@/test/render";
import { MENSAGEM_UMA_AVALIACAO } from "./HistoricoGrupoCard";

beforeEach(() => {
  server.use(
    http.get(api("/usuarios/me"), () =>
      HttpResponse.json({ id: "1", nome: "Ana", email: "ana@exemplo.com", criado_em: "2026-11-01T10:00:00Z" }),
    ),
  );
});

function renderHistorico(route = "/historico") {
  return renderWithProviders(<HistoricoPage />, {
    route,
    path: "/historico",
    token: criarJwtFake(),
    routes: [
      { path: "/historico/:id", element: <p>detalhe</p> },
      { path: "/avaliar", element: <p>página de avaliação</p> },
    ],
  });
}

describe("HistoricoPage", () => {
  it("lista os grupos por exercício com variação, gráfico e itens linkando ao detalhe", async () => {
    renderHistorico();
    const supino = await screen.findByRole("region", { name: "Supino" });
    expect(document.title).toBe("Histórico · Scouter Power");

    expect(within(supino).getByText("2 avaliações")).toBeInTheDocument();
    expect(within(supino).getByText("105 kg")).toBeInTheDocument();
    expect(within(supino).getByText("+5 kg")).toBeInTheDocument();
    expect(within(supino).getByText("(aumento desde a primeira avaliação)")).toBeInTheDocument();
    expect(within(supino).getByRole("img", { name: /Evolução do 1RM estimado — Supino/ })).toBeInTheDocument();

    const itens = within(supino).getAllByRole("link");
    expect(itens).toHaveLength(2);
    // Mais recente primeiro.
    // Sem aria-label: o nome acessível é o texto visível (WCAG 2.5.3), com "repetições" por extenso.
    expect(itens[0]).not.toHaveAttribute("aria-label");
    expect(itens[0]).toHaveAccessibleName("15/11/2026, 90 kg × 6 repetições, 1RM 105 kg, nível Intermediário");
    expect(within(itens[0]).getByText("90 kg × 6 repetições")).toBeVisible();
    expect(itens[0]).toHaveAttribute("href", "/historico/a2");
    expect(itens[1]).toHaveAttribute("href", "/historico/a1");
  });

  it("mostra variação negativa e zero com texto", async () => {
    server.use(
      http.get(api("/avaliacoes/historico"), () =>
        HttpResponse.json([
          {
            exercicio: "supino",
            avaliacoes: [criarAvaliacaoFake({ id: "x1" }), criarAvaliacaoFake({ id: "x2", rm1_estimado_kg: 114.2 })],
            variacao_rm1_kg: -2.5,
          },
          {
            exercicio: "deadlift",
            avaliacoes: [
              criarAvaliacaoFake({ id: "y1", exercicio: "deadlift" }),
              criarAvaliacaoFake({ id: "y2", exercicio: "deadlift" }),
            ],
            variacao_rm1_kg: 0,
          },
        ]),
      ),
    );
    renderHistorico();
    const supino = await screen.findByRole("region", { name: "Supino" });
    expect(within(supino).getByText("−2,5 kg")).toBeInTheDocument();
    expect(within(supino).getByText("(queda desde a primeira avaliação)")).toBeInTheDocument();
    const deadlift = screen.getByRole("region", { name: "Levantamento terra" });
    expect(within(deadlift).getByText("0 kg")).toBeInTheDocument();
    expect(within(deadlift).getByText("(sem variação desde a primeira avaliação)")).toBeInTheDocument();
  });

  it("com uma avaliação mostra a mensagem de evolução e não mostra gráfico", async () => {
    renderHistorico();
    const agachamento = await screen.findByRole("region", { name: "Agachamento" });
    expect(within(agachamento).getByText("1 avaliação")).toBeInTheDocument();
    expect(within(agachamento).getByText(MENSAGEM_UMA_AVALIACAO)).toBeInTheDocument();
    expect(within(agachamento).queryByRole("img")).not.toBeInTheDocument();
  });

  it("mostra estado vazio com CTA para avaliar", async () => {
    server.use(http.get(api("/avaliacoes/historico"), () => HttpResponse.json([])));
    const { user, router } = renderHistorico();
    expect(await screen.findByRole("heading", { name: "Nenhuma avaliação ainda" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Fazer avaliação" }));
    expect(router.state.location.pathname).toBe("/avaliar");
  });

  it("filtro por exercício altera a query string e a requisição", async () => {
    const consultas: (string | null)[] = [];
    server.use(
      http.get(api("/avaliacoes/historico"), ({ request }) => {
        const exercicio = new URL(request.url).searchParams.get("exercicio");
        consultas.push(exercicio);
        return HttpResponse.json(historicoPadrao.filter((g) => !exercicio || g.exercicio === exercicio));
      }),
    );
    const { user, router } = renderHistorico();
    await screen.findByRole("region", { name: "Agachamento" });

    const filtro = screen.getByRole("combobox", { name: "Exercício" });
    expect(within(filtro).getByRole("option", { name: "Todos" })).toBeInTheDocument();
    // Rótulos de lib/format, não o `rotulo` do catálogo da API ("Deadlift").
    await waitFor(() =>
      expect(within(filtro).getAllByRole("option").map((o) => o.textContent)).toEqual([
        "Todos",
        "Supino",
        "Agachamento",
        "Levantamento terra",
      ]),
    );
    await user.selectOptions(filtro, "supino");

    await waitFor(() => expect(screen.queryByRole("region", { name: "Agachamento" })).not.toBeInTheDocument());
    expect(router.state.location.search).toBe("?exercicio=supino");
    expect(consultas).toEqual([null, "supino"]);
    expect(filtro).toHaveValue("supino");

    await user.selectOptions(filtro, "");
    expect(router.state.location.search).toBe("");
  });

  it("lê o filtro inicial da URL", async () => {
    renderHistorico("/historico?exercicio=agachamento");
    expect(await screen.findByRole("region", { name: "Agachamento" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Supino" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Exercício" })).toHaveValue("agachamento");
  });

  it("mostra erro com opção de tentar novamente", async () => {
    let falhar = true;
    server.use(
      http.get(api("/avaliacoes/historico"), () =>
        falhar ? HttpResponse.json({ detail: "Falha" }, { status: 500 }) : HttpResponse.json(historicoPadrao),
      ),
    );
    const { user } = renderHistorico();
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar o histórico.");
    falhar = false;
    await user.click(within(alerta).getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("region", { name: "Supino" })).toBeInTheDocument();
  });
});

function renderDetalhe(id = "a2") {
  return renderWithProviders(<AvaliacaoDetalhePage />, {
    route: `/historico/${id}`,
    path: "/historico/:id",
    token: criarJwtFake(),
    routes: [{ path: "/historico", element: <h1>Lista do histórico</h1> }],
  });
}

describe("AvaliacaoDetalhePage", () => {
  it("exibe os dados da avaliação", async () => {
    renderDetalhe();
    expect(await screen.findByRole("heading", { level: 1, name: "Avaliação de Supino" })).toBeInTheDocument();
    expect(screen.getByText("15/11/2026", { exact: false })).toBeInTheDocument();
    const dados = screen.getByRole("region", { name: "Dados informados" });
    expect(within(dados).getByText("30 anos")).toBeInTheDocument();
    expect(within(dados).getByText("Masculino")).toBeInTheDocument();
    expect(within(dados).getByText("80 kg")).toBeInTheDocument();
    expect(within(dados).getByText("1,75 m")).toBeInTheDocument();
    expect(within(dados).getByText("90 kg")).toBeInTheDocument();
    expect(within(dados).getByText("6")).toBeInTheDocument();
    const resultado = screen.getByRole("region", { name: "Resultado" });
    expect(within(resultado).getByText("105 kg")).toBeInTheDocument();
    expect(within(resultado).getByText("Intermediário")).toBeInTheDocument();
    expect(within(resultado).getByText("svm_tuned-v1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao histórico" })).toHaveAttribute("href", "/historico");
  });

  it("usa o rótulo do app para o exercício (Levantamento terra) no título e nos dados", async () => {
    server.use(
      http.get(api("/avaliacoes/:id"), ({ params }) =>
        HttpResponse.json(criarAvaliacaoFake({ id: String(params.id), exercicio: "deadlift" })),
      ),
    );
    renderDetalhe("d1");
    expect(await screen.findByRole("heading", { level: 1, name: "Avaliação de Levantamento terra" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Dados informados" })).getByText("Levantamento terra")).toBeInTheDocument();
    expect(screen.queryByText(/Deadlift/)).not.toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Avaliação de Levantamento terra · Scouter Power"));
  });

  it("mostra 'Não informada' sem estatura", async () => {
    server.use(http.get(api("/avaliacoes/:id"), () => HttpResponse.json(criarAvaliacaoFake({ estatura_m: null }))));
    renderDetalhe("11111111-1111-1111-1111-111111111111");
    expect(await screen.findByText("Não informada")).toBeInTheDocument();
  });

  it("404 mostra avaliação não encontrada com link para o histórico", async () => {
    renderDetalhe("inexistente");
    expect(await screen.findByRole("heading", { name: "Avaliação não encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o histórico" })).toHaveAttribute("href", "/historico");
  });

  it("excluir pede confirmação, chama DELETE e volta ao histórico", async () => {
    const excluidos: string[] = [];
    server.use(
      http.delete(api("/avaliacoes/:id"), ({ params }) => {
        excluidos.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, router, queryClient } = renderDetalhe();
    await screen.findByRole("heading", { level: 1, name: "Avaliação de Supino" });

    await user.click(screen.getByRole("button", { name: "Excluir avaliação" }));
    const dialogo = await screen.findByRole("dialog", { name: "Excluir avaliação?" });
    expect(excluidos).toEqual([]);

    await user.click(within(dialogo).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByRole("heading", { name: "Lista do histórico" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/historico");
    expect(excluidos).toEqual(["a2"]);
    expect(await screen.findByText("Avaliação excluída.")).toBeInTheDocument();
    expect(queryClient.getQueryData(["avaliacao", "a2"])).toBeUndefined();
  });

  it("cancelar a exclusão não chama DELETE", async () => {
    const excluidos: string[] = [];
    server.use(
      http.delete(api("/avaliacoes/:id"), ({ params }) => {
        excluidos.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderDetalhe();
    await screen.findByRole("heading", { level: 1, name: "Avaliação de Supino" });
    await user.click(screen.getByRole("button", { name: "Excluir avaliação" }));
    const dialogo = await screen.findByRole("dialog", { name: "Excluir avaliação?" });
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(excluidos).toEqual([]);
  });

  it("DELETE com 404 (já excluída em outra aba) é tratado como sucesso", async () => {
    server.use(http.delete(api("/avaliacoes/:id"), () => HttpResponse.json({ detail: "Não encontrada." }, { status: 404 })));
    const { user, router, queryClient } = renderDetalhe();
    await screen.findByRole("heading", { level: 1, name: "Avaliação de Supino" });
    queryClient.setQueryData(["historico", "lista", "todos"], historicoPadrao);

    await user.click(screen.getByRole("button", { name: "Excluir avaliação" }));
    const dialogo = await screen.findByRole("dialog", { name: "Excluir avaliação?" });
    await user.click(within(dialogo).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByRole("heading", { name: "Lista do histórico" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/historico");
    // O Toaster do sonner guarda toasts entre testes; basta haver o de sucesso e nenhum de erro.
    expect((await screen.findAllByText("Avaliação excluída.")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Não encontrada.")).not.toBeInTheDocument();
    expect(queryClient.getQueryData(["avaliacao", "a2"])).toBeUndefined();
    expect(queryClient.getQueryState(["historico", "lista", "todos"])?.isInvalidated).toBe(true);
  });
});
