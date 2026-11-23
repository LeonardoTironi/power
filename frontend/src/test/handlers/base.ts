import { http, HttpResponse } from "msw";
import type { ExercicioOpcao, HealthResposta } from "@/types/api";
import { api } from "./url";

export const healthOk: HealthResposta = {
  status: "ok",
  banco_disponivel: true,
  modelo_carregado: true,
  versao_modelo: "svm_tuned-v1",
};

export const exerciciosPadrao: ExercicioOpcao[] = [
  { valor: "supino", rotulo: "Supino" },
  { valor: "agachamento", rotulo: "Agachamento" },
  { valor: "deadlift", rotulo: "Deadlift" },
];

/** Handlers sempre ativos: /health e /exercicios. */
export const baseHandlers = [
  http.get(api("/health"), () => HttpResponse.json(healthOk)),
  http.get(api("/exercicios"), () => HttpResponse.json(exerciciosPadrao)),
];
