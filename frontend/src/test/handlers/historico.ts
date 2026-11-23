import { http, HttpResponse, type HttpHandler } from "msw";
import type { AvaliacaoPublica, HistoricoExercicio } from "@/types/api";
import { api } from "./url";

/** Avaliação de exemplo; sobrescreva campos com `criarAvaliacaoFake({ ... })`. */
export function criarAvaliacaoFake(parcial: Partial<AvaliacaoPublica> = {}): AvaliacaoPublica {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    exercicio: "supino",
    sexo: "m",
    idade: 30,
    massa_corporal_kg: 80,
    estatura_m: 1.75,
    carga_kg: 100,
    repeticoes: 5,
    rm1_estimado_kg: 116.7,
    nivel: "intermediario",
    versao_modelo: "svm_tuned-v1",
    criado_em: "2026-11-01T12:00:00Z",
    ...parcial,
  };
}

/** Histórico de exemplo: supino com 2 avaliações (+5 kg) e agachamento com 1. */
export const historicoPadrao: HistoricoExercicio[] = [
  {
    exercicio: "supino",
    avaliacoes: [
      criarAvaliacaoFake({ id: "a1", criado_em: "2026-11-01T12:00:00Z", rm1_estimado_kg: 100, nivel: "iniciante" }),
      criarAvaliacaoFake({ id: "a2", criado_em: "2026-11-15T12:00:00Z", carga_kg: 90, repeticoes: 6, rm1_estimado_kg: 105 }),
    ],
    variacao_rm1_kg: 5,
  },
  {
    exercicio: "agachamento",
    avaliacoes: [
      criarAvaliacaoFake({
        id: "b1",
        exercicio: "agachamento",
        criado_em: "2026-11-10T12:00:00Z",
        carga_kg: 120,
        repeticoes: 3,
        rm1_estimado_kg: 130,
      }),
    ],
    variacao_rm1_kg: null,
  },
];

/**
 * Únicos handlers padrão de GET /avaliacoes/historico (filtra por ?exercicio=) e de
 * GET/DELETE /avaliacoes/:id, sobre `historicoPadrao` (id desconhecido → 404).
 * O de /historico vem antes, e o de /:id ainda ignora "historico" (deixa passar ao próximo
 * handler), então a ordem de registro não importa.
 */
export const historicoHandlers: HttpHandler[] = [
  http.get(api("/avaliacoes/historico"), ({ request }) => {
    const exercicio = new URL(request.url).searchParams.get("exercicio");
    return HttpResponse.json(historicoPadrao.filter((g) => !exercicio || g.exercicio === exercicio));
  }),
  http.get(api("/avaliacoes/:id"), ({ params }) => {
    if (params.id === "historico") return undefined;
    const avaliacao = historicoPadrao.flatMap((g) => g.avaliacoes).find((a) => a.id === params.id);
    return avaliacao
      ? HttpResponse.json(avaliacao)
      : HttpResponse.json({ detail: "Avaliação não encontrada." }, { status: 404 });
  }),
  http.delete(api("/avaliacoes/:id"), () => new HttpResponse(null, { status: 204 })),
];
