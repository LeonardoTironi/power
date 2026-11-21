import { apiFetch } from "@/lib/http";
import type { Exercicio, HistoricoExercicio } from "@/types/api";

/** GET /avaliacoes/historico?exercicio= (autenticado). Grupos por exercício, ordem crescente. */
export function listarHistorico(exercicio?: Exercicio | null, signal?: AbortSignal): Promise<HistoricoExercicio[]> {
  return apiFetch<HistoricoExercicio[]>("/avaliacoes/historico", { query: { exercicio }, signal });
}
