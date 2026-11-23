import { http, HttpResponse, type HttpHandler } from "msw";
import type { AvaliacaoEntrada, AvaliacaoResultado } from "@/types/api";
import { api } from "./url";

export const ID_AVALIACAO_PADRAO = "11111111-1111-1111-1111-111111111111";

/** Resposta padrão do POST /avaliacoes (id null = anônima). */
export function resultadoAvaliacao(parcial: Partial<AvaliacaoResultado> = {}): AvaliacaoResultado {
  return {
    id: null,
    exercicio: "supino",
    nivel: "intermediario",
    rm1_estimado_kg: 101.3,
    explicacao: "Nível intermediário: sua força relativa está na faixa média da base de referência.",
    aviso: "Resultado informativo: a classificação e a estimativa de 1RM não substituem avaliação física profissional nem orientação médica.",
    versao_modelo: "svm_tuned-v1",
    ...parcial,
  };
}

/**
 * Handler padrão do POST /avaliacoes: devolve o exercício enviado; `id` preenchido só se houver
 * Authorization. GET/DELETE /avaliacoes/:id e GET /avaliacoes/historico ficam em ./historico.ts.
 */
export const avaliacaoHandlers: HttpHandler[] = [
  http.post(api("/avaliacoes"), async ({ request }) => {
    const corpo = (await request.json()) as AvaliacaoEntrada;
    const logado = request.headers.has("Authorization");
    return HttpResponse.json(resultadoAvaliacao({ exercicio: corpo.exercicio, id: logado ? ID_AVALIACAO_PADRAO : null }));
  }),
];
