import { apiFetch } from "@/lib/http";
import type { ExercicioOpcao } from "@/types/api";

/** GET /exercicios */
export function listarExercicios(signal?: AbortSignal): Promise<ExercicioOpcao[]> {
  return apiFetch<ExercicioOpcao[]>("/exercicios", { auth: false, signal });
}
