import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { queryKeys } from "@/api/queryKeys";
import { ApiError, MENSAGEM_REDE, MENSAGEM_TIMEOUT } from "@/lib/http";
import { AvaliacaoPage } from "@/pages/AvaliacaoPage";
import { ID_AVALIACAO_PADRAO, resultadoAvaliacao } from "@/test/handlers/avaliacao";
import { criarJwtFake } from "@/test/jwt";
import { renderWithProviders } from "@/test/render";

// Simular 30 s de espera real seria lento; o timeout em si é testado em api/avaliacoes.test.ts.
const { criarAvaliacaoMock } = vi.hoisted(() => ({ criarAvaliacaoMock: vi.fn() }));
vi.mock("@/api/avaliacoes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/avaliacoes")>()),
  criarAvaliacao: criarAvaliacaoMock,
}));

const erroTimeout = () => new ApiError({ status: 0, kind: "timeout", detail: MENSAGEM_TIMEOUT });
const erroRede = () => new ApiError({ status: 0, kind: "network", detail: MENSAGEM_REDE });

function renderizar(token?: string) {
  const resultado = renderWithProviders(<AvaliacaoPage />, { route: "/avaliar", path: "/avaliar", token });
  clienteAtual = resultado.queryClient;
  return resultado;
}

const campo = (nome: string) => screen.getByRole("textbox", { name: nome });

/** QueryClient do último render: logado, espera o preenchimento do perfil antes de digitar. */
let clienteAtual: ReturnType<typeof renderizar>["queryClient"] | null = null;

async function esperarPerfil() {
  await waitFor(() => expect(clienteAtual?.isFetching({ queryKey: queryKeys.historico.all })).toBe(0));
}

async function preencherEEnviar(user: ReturnType<typeof renderizar>["user"]) {
  const select = await screen.findByRole("combobox", { name: "Exercício" });
  await esperarPerfil();
  // clear: logado, os dados do perfil podem vir preenchidos da última avaliação.
  await user.clear(campo("Idade (anos)"));
  await user.type(campo("Idade (anos)"), "30");
  await user.click(screen.getByRole("radio", { name: "Masculino" }));
  await user.clear(campo("Massa corporal (kg)"));
  await user.type(campo("Massa corporal (kg)"), "80");
  await user.selectOptions(select, "supino");
  await user.type(campo("Carga (kg)"), "100");
  await user.type(campo("Repetições"), "5");
  await user.click(screen.getByRole("button", { name: "Calcular meu nível" }));
}

const chaveHistorico = queryKeys.historico.lista(null);

beforeEach(() => {
  criarAvaliacaoMock.mockReset();
});

describe("fluxo de avaliação: timeout do POST /avaliacoes", () => {
  it("logado: avisa que a avaliação pode ter sido salva e invalida o histórico", async () => {
    criarAvaliacaoMock.mockRejectedValueOnce(erroTimeout());
    const { user, queryClient } = renderizar(criarJwtFake());
    queryClient.setQueryData(chaveHistorico, []);
    await preencherEEnviar(user);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("O servidor demorou para responder");
    expect(alerta).toHaveTextContent(/pode ter sido salva/);
    expect(queryClient.getQueryState(chaveHistorico)?.isInvalidated).toBe(true);
  });

  it("logado: ao reenviar após timeout, invalida o histórico de novo (mesmo se o reenvio falhar)", async () => {
    criarAvaliacaoMock.mockRejectedValueOnce(erroTimeout()).mockRejectedValueOnce(erroRede());
    const { user, queryClient } = renderizar(criarJwtFake());
    await preencherEEnviar(user);
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/pode ter sido salva/);

    // Histórico recarregado nesse meio-tempo (cache fresco de novo).
    queryClient.setQueryData(chaveHistorico, []);
    expect(queryClient.getQueryState(chaveHistorico)?.isInvalidated).toBe(false);

    await user.click(within(alerta).getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Sem conexão com o servidor")).toBeInTheDocument();
    expect(criarAvaliacaoMock).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryState(chaveHistorico)?.isInvalidated).toBe(true);
  });

  it("logado: reenvio com sucesso após timeout mostra o resultado salvo", async () => {
    criarAvaliacaoMock
      .mockRejectedValueOnce(erroTimeout())
      .mockResolvedValueOnce(resultadoAvaliacao({ id: ID_AVALIACAO_PADRAO }));
    const { user } = renderizar(criarJwtFake());
    await preencherEEnviar(user);
    const alerta = await screen.findByRole("alert");
    await user.click(within(alerta).getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Avaliação salva no seu histórico.")).toBeInTheDocument();
  });

  it("anônimo: timeout não fala em histórico", async () => {
    criarAvaliacaoMock.mockRejectedValueOnce(erroTimeout());
    const { user } = renderizar();
    await preencherEEnviar(user);
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("O servidor demorou para responder");
    expect(alerta).not.toHaveTextContent(/pode ter sido salva/);
  });
});
