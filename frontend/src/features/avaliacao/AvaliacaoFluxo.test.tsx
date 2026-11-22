import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { queryKeys } from "@/api/queryKeys";
import { tokenStorage } from "@/features/auth/tokenStorage";
import { AvaliacaoPage } from "@/pages/AvaliacaoPage";
import { LoginPage } from "@/pages/LoginPage";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { ID_AVALIACAO_PADRAO, resultadoAvaliacao } from "@/test/handlers/avaliacao";
import { criarAvaliacaoFake, historicoPadrao } from "@/test/handlers/historico";
import { criarJwtFake } from "@/test/jwt";
import { renderWithProviders } from "@/test/render";
import type { AvaliacaoEntrada } from "@/types/api";

function renderizar(opcoes: { token?: string } = {}) {
  const resultado = renderWithProviders(<AvaliacaoPage />, {
    route: "/avaliar",
    path: "/avaliar",
    token: opcoes.token,
    routes: [
      { path: "/historico/:id", element: <p>Detalhe do histórico</p> },
      { path: "/login", element: <LoginPage /> },
    ],
  });
  clienteAtual = resultado.queryClient;
  return resultado;
}

const campo = (nome: string) => screen.getByRole("textbox", { name: nome });

/** QueryClient do último render: logado, espera o preenchimento do perfil antes de digitar. */
let clienteAtual: ReturnType<typeof renderizar>["queryClient"] | null = null;

async function esperarPerfil() {
  await waitFor(() => expect(clienteAtual?.isFetching({ queryKey: queryKeys.historico.all })).toBe(0));
}

async function preencher(user: ReturnType<typeof renderizar>["user"], valores: Partial<Record<string, string>> = {}) {
  const v = {
    idade: "30",
    massa: "80,5",
    estatura: "",
    exercicio: "deadlift",
    carga: "100",
    repeticoes: "5",
    ...valores,
  };
  const select = await screen.findByRole("combobox", { name: "Exercício" });
  await esperarPerfil();
  // clear: logado, os dados do perfil podem vir preenchidos da última avaliação.
  await user.clear(campo("Idade (anos)"));
  await user.type(campo("Idade (anos)"), v.idade);
  await user.click(screen.getByRole("radio", { name: "Masculino" }));
  await user.clear(campo("Massa corporal (kg)"));
  await user.type(campo("Massa corporal (kg)"), v.massa);
  await user.clear(campo("Estatura (m, opcional)"));
  if (v.estatura) await user.type(campo("Estatura (m, opcional)"), v.estatura);
  await user.selectOptions(select, v.exercicio);
  await user.type(campo("Carga (kg)"), v.carga);
  await user.type(campo("Repetições"), v.repeticoes);
}

function capturarEnvios() {
  const corpos: AvaliacaoEntrada[] = [];
  server.use(
    http.post(api("/avaliacoes"), async ({ request }) => {
      const corpo = (await request.json()) as AvaliacaoEntrada;
      corpos.push(corpo);
      return HttpResponse.json(resultadoAvaliacao({ exercicio: corpo.exercicio }));
    }),
  );
  return corpos;
}

describe("fluxo de avaliação", () => {
  it("mostra skeleton enquanto carrega os exercícios e depois as opções do catálogo", async () => {
    server.use(
      http.get(api("/exercicios"), async () => {
        await delay(50);
        return HttpResponse.json([
          { valor: "supino", rotulo: "Supino" },
          { valor: "deadlift", rotulo: "Deadlift" },
        ]);
      }),
    );
    renderizar();
    expect(screen.getByText("Carregando exercícios…")).toBeInTheDocument();
    const select = await screen.findByRole("combobox", { name: "Exercício" });
    const opcoes = within(select).getAllByRole("option").map((o) => o.getAttribute("value"));
    expect(opcoes).toEqual(["", "supino", "deadlift"]);
  });

  it("mostra erro com 'tentar novamente' se GET /exercicios falhar", async () => {
    let chamadas = 0;
    server.use(
      http.get(api("/exercicios"), () => {
        chamadas += 1;
        return chamadas === 1
          ? HttpResponse.json({ detail: "falhou" }, { status: 500 })
          : HttpResponse.json([{ valor: "supino", rotulo: "Supino" }]);
      }),
    );
    const { user } = renderizar();
    expect(await screen.findByText("Não foi possível carregar os exercícios.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar carregar novamente" }));
    expect(await screen.findByRole("combobox", { name: "Exercício" })).toBeInTheDocument();
  });

  it("envia o payload correto (sexo m, deadlift, números e estatura null)", async () => {
    const corpos = capturarEnvios();
    const { user } = renderizar();
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));

    await screen.findByRole("heading", { name: "Seu resultado" });
    expect(corpos).toEqual([
      {
        idade: 30,
        sexo: "m",
        massa_corporal_kg: 80.5,
        estatura_m: null,
        exercicio: "deadlift",
        carga_kg: 100,
        repeticoes: 5,
      },
    ]);
  });

  it("envia a estatura digitada com vírgula", async () => {
    const corpos = capturarEnvios();
    const { user } = renderizar();
    await preencher(user, { estatura: "1,75" });
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    await screen.findByRole("heading", { name: "Seu resultado" });
    expect(corpos[0].estatura_m).toBe(1.75);
  });

  it("bloqueia o envio com 0 repetições, mostra o erro no campo e foca o primeiro inválido", async () => {
    const corpos = capturarEnvios();
    const { user } = renderizar();
    await preencher(user, { repeticoes: "0" });
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));

    const repeticoes = campo("Repetições");
    expect(await screen.findByText("As repetições devem estar entre 1 e 12.")).toHaveAttribute("role", "alert");
    expect(repeticoes).toHaveAttribute("aria-invalid", "true");
    expect(repeticoes).toHaveAccessibleDescription(expect.stringContaining("As repetições devem estar entre 1 e 12."));
    expect(repeticoes).toHaveFocus();
    expect(corpos).toHaveLength(0);
  });

  it("formulário vazio foca a idade", async () => {
    const { user } = renderizar();
    await screen.findByRole("combobox", { name: "Exercício" });
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    expect(await screen.findByText("Informe sua idade.")).toBeInTheDocument();
    expect(campo("Idade (anos)")).toHaveFocus();
    expect(screen.getByText("Selecione o sexo.")).toBeInTheDocument();
    expect(screen.queryByText(/estatura deve/)).not.toBeInTheDocument();
  });

  it("exibe nível, 1RM, explicação, aviso e versão do modelo; foca o título", async () => {
    const { user } = renderizar();
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));

    const titulo = await screen.findByRole("heading", { name: "Seu resultado" });
    await waitFor(() => expect(titulo).toHaveFocus());
    const resultado = resultadoAvaliacao();
    expect(screen.getAllByText("Intermediário").length).toBeGreaterThan(0);
    expect(screen.getByText("101,3")).toBeInTheDocument();
    expect(screen.getByText(/Levantamento terra/)).toBeInTheDocument();
    expect(screen.getByText(resultado.explicacao)).toBeInTheDocument();
    expect(screen.getByText(resultado.aviso)).toBeInTheDocument();
    expect(screen.getByText(/svm_tuned-v1/)).toBeInTheDocument();
  });

  it("anônimo: informa que não foi salva e convida a entrar ou criar conta", async () => {
    const { user } = renderizar();
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    await screen.findByRole("heading", { name: "Seu resultado" });

    expect(screen.getByText("Esta avaliação não foi salva.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro");
    expect(screen.getByRole("link", { name: "Entrar para salvar" })).toHaveAttribute("href", "/login?next=%2Favaliar");
    expect(screen.queryByRole("link", { name: "Ver no histórico" })).not.toBeInTheDocument();
  });

  it("logado: informa que foi salva com link para o histórico", async () => {
    const { user } = renderizar({ token: criarJwtFake() });
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    await screen.findByRole("heading", { name: "Seu resultado" });

    expect(screen.getByText("Avaliação salva no seu histórico.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Ver no histórico" });
    expect(link).toHaveAttribute("href", `/historico/${ID_AVALIACAO_PADRAO}`);
    await user.click(link);
    expect(await screen.findByText("Detalhe do histórico")).toBeInTheDocument();
  });

  it("logado mas id null: avisa que a sessão expirou e não foi salva", async () => {
    server.use(http.post(api("/avaliacoes"), () => HttpResponse.json(resultadoAvaliacao({ id: null }))));
    const { user } = renderizar({ token: criarJwtFake() });
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    await screen.findByRole("heading", { name: "Seu resultado" });

    expect(screen.getByText("Esta avaliação não foi salva.")).toBeInTheDocument();
    expect(screen.getByText(/Sua sessão expirou. Entre novamente para guardar/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Criar conta" })).not.toBeInTheDocument();
  });

  it("logado mas id null: desloga, mantém o resultado e 'Entrar para salvar' abre o login", async () => {
    server.use(http.post(api("/avaliacoes"), () => HttpResponse.json(resultadoAvaliacao({ id: null }))));
    const { user, router } = renderizar({ token: criarJwtFake() });
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    await screen.findByRole("heading", { name: "Seu resultado" });

    await waitFor(() => expect(tokenStorage.get()).toBeNull());
    // Toast do logout (o Toaster do sonner guarda toasts entre testes, daí o findAll).
    expect((await screen.findAllByText("Sua sessão expirou. Entre novamente.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Seu resultado" })).toBeInTheDocument();
    expect(screen.getByText(/Sua sessão expirou\. Entre novamente para guardar/)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Entrar para salvar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("?next=%2Favaliar");
  });

  it("logado: invalida o histórico em cache depois de salvar", async () => {
    const { user, queryClient } = renderizar({ token: criarJwtFake() });
    queryClient.setQueryData(queryKeys.historico.lista(null), []);
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    await screen.findByText("Avaliação salva no seu histórico.");
    expect(queryClient.getQueryState(queryKeys.historico.lista(null))?.isInvalidated).toBe(true);
  });

  it("logado: preenche idade, sexo, massa e estatura com a última avaliação salva", async () => {
    server.use(
      http.get(api("/avaliacoes/historico"), () =>
        HttpResponse.json([
          {
            exercicio: "supino",
            avaliacoes: [
              criarAvaliacaoFake({ id: "x1", criado_em: "2026-11-01T12:00:00Z", idade: 25, massa_corporal_kg: 70 }),
            ],
            variacao_rm1_kg: null,
          },
          {
            exercicio: "deadlift",
            avaliacoes: [
              criarAvaliacaoFake({
                id: "x2",
                exercicio: "deadlift",
                criado_em: "2026-11-20T12:00:00Z",
                sexo: "f",
                idade: 31,
                massa_corporal_kg: 62.5,
                estatura_m: 1.6,
              }),
            ],
            variacao_rm1_kg: null,
          },
        ]),
      ),
    );
    renderizar({ token: criarJwtFake() });

    await waitFor(() => expect(campo("Idade (anos)")).toHaveValue("31"));
    expect(screen.getByRole("radio", { name: "Feminino" })).toBeChecked();
    expect(campo("Massa corporal (kg)")).toHaveValue("62,5");
    expect(campo("Estatura (m, opcional)")).toHaveValue("1,60");
    expect(screen.getByText(/Preenchemos estes dados com a sua última avaliação/)).toBeInTheDocument();
    // O levantamento muda a cada avaliação: fica em branco.
    expect(campo("Carga (kg)")).toHaveValue("");
    expect(campo("Repetições")).toHaveValue("");
  });

  it("logado sem avaliações: deixa o perfil em branco", async () => {
    server.use(http.get(api("/avaliacoes/historico"), () => HttpResponse.json([])));
    const { queryClient } = renderizar({ token: criarJwtFake() });
    await waitFor(() => expect(queryClient.getQueryState(queryKeys.historico.lista(null))?.status).toBe("success"));
    expect(campo("Idade (anos)")).toHaveValue("");
    expect(screen.queryByText(/Preenchemos estes dados/)).not.toBeInTheDocument();
  });

  it("logado: não sobrescreve o que o usuário já digitou", async () => {
    server.use(
      http.get(api("/avaliacoes/historico"), async () => {
        await delay(100);
        return HttpResponse.json(historicoPadrao);
      }),
    );
    const { user, queryClient } = renderizar({ token: criarJwtFake() });
    await user.type(campo("Idade (anos)"), "45");
    await waitFor(() => expect(queryClient.getQueryState(queryKeys.historico.lista(null))?.status).toBe("success"));
    await waitFor(() => expect(campo("Massa corporal (kg)")).toHaveValue("80"));
    expect(campo("Idade (anos)")).toHaveValue("45");
  });

  it("anônimo: não busca o histórico nem preenche o perfil", async () => {
    let chamadas = 0;
    server.use(
      http.get(api("/avaliacoes/historico"), () => {
        chamadas++;
        return HttpResponse.json(historicoPadrao);
      }),
    );
    renderizar();
    await screen.findByRole("combobox", { name: "Exercício" });
    expect(campo("Idade (anos)")).toHaveValue("");
    expect(chamadas).toBe(0);
  });

  it("anônimo: não invalida o histórico", async () => {
    const { user, queryClient } = renderizar();
    queryClient.setQueryData(queryKeys.historico.lista(null), []);
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    await screen.findByRole("heading", { name: "Seu resultado" });
    expect(queryClient.getQueryState(queryKeys.historico.lista(null))?.isInvalidated).toBe(false);
  });

  it("'Nova avaliação' volta ao formulário com os dados mantidos e foco no exercício", async () => {
    const { user } = renderizar();
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    await user.click(await screen.findByRole("button", { name: "Nova avaliação" }));

    const select = await screen.findByRole("combobox", { name: "Exercício" });
    expect(select).toHaveValue("deadlift");
    expect(select).toHaveFocus();
    expect(campo("Idade (anos)")).toHaveValue("30");
    expect(campo("Massa corporal (kg)")).toHaveValue("80,5");
    expect(screen.getByRole("radio", { name: "Masculino" })).toBeChecked();
  });

  it("'Editar dados' volta ao formulário com foco na idade", async () => {
    const { user } = renderizar();
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    await user.click(await screen.findByRole("button", { name: "Editar dados" }));
    await waitFor(() => expect(campo("Idade (anos)")).toHaveFocus());
    expect(campo("Carga (kg)")).toHaveValue("100");
  });

  it("erro de rede: mostra indisponibilidade, mantém os dados e o retry reenvia", async () => {
    let chamadas = 0;
    server.use(
      http.post(api("/avaliacoes"), () => {
        chamadas += 1;
        return chamadas === 1 ? HttpResponse.error() : HttpResponse.json(resultadoAvaliacao());
      }),
    );
    const { user } = renderizar();
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Sem conexão com o servidor");
    expect(alerta).toHaveTextContent("Não foi possível conectar ao servidor.");
    expect(campo("Idade (anos)")).toHaveValue("30");
    expect(campo("Carga (kg)")).toHaveValue("100");

    await user.click(within(alerta).getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("heading", { name: "Seu resultado" })).toBeInTheDocument();
    expect(chamadas).toBe(2);
  });

  it("503: mostra a mensagem específica do servidor", async () => {
    server.use(
      http.post(api("/avaliacoes"), () =>
        HttpResponse.json({ detail: "Modelo de classificação indisponível." }, { status: 503 }),
      ),
    );
    const { user } = renderizar();
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Serviço temporariamente indisponível");
    expect(alerta).toHaveTextContent("Modelo de classificação indisponível.");
  });

  it("422 do servidor aparece no campo correspondente", async () => {
    server.use(
      http.post(api("/avaliacoes"), () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ["body", "carga_kg"],
                msg: "Input should be less than or equal to 500",
                type: "less_than_equal",
                ctx: { le: 500 },
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    const { user } = renderizar();
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));

    expect(await screen.findByText("Deve ser no máximo 500.")).toBeInTheDocument();
    const carga = campo("Carga (kg)");
    expect(carga).toHaveAttribute("aria-invalid", "true");
    expect(carga).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
  });

  it("mostra loading no botão durante o envio", async () => {
    server.use(
      http.post(api("/avaliacoes"), async () => {
        await delay(100);
        return HttpResponse.json(resultadoAvaliacao());
      }),
    );
    const { user } = renderizar();
    await preencher(user);
    await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
    const botao = await screen.findByRole("button", { name: "Calculando…" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("aria-busy", "true");
    expect(await screen.findByRole("heading", { name: "Seu resultado" })).toBeInTheDocument();
  });
});
