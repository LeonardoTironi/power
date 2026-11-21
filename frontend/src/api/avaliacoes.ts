import { apiFetch } from "@/lib/http";
import type { AvaliacaoEntrada, AvaliacaoPublica, AvaliacaoResultado } from "@/types/api";

/**
 * Timeout do POST /avaliacoes: o modelo pode demorar mais que as outras rotas (cold start),
 * e um timeout prematuro deixa o usuário sem saber se a avaliação foi gravada.
 */
export const TIMEOUT_AVALIACAO_MS = 30_000;

/**
 * POST /avaliacoes. Envia o Bearer se houver: com token válido a avaliação é gravada
 * (`id` preenchido); sem token ou com token inválido, é anônima (`id` null).
 */
export function criarAvaliacao(entrada: AvaliacaoEntrada, signal?: AbortSignal): Promise<AvaliacaoResultado> {
  return apiFetch<AvaliacaoResultado>("/avaliacoes", {
    method: "POST",
    body: entrada,
    signal,
    timeoutMs: TIMEOUT_AVALIACAO_MS,
  });
}

/** GET /avaliacoes/{id} (autenticado; 404 se não for do usuário). */
export function obterAvaliacao(id: string, signal?: AbortSignal): Promise<AvaliacaoPublica> {
  return apiFetch<AvaliacaoPublica>(`/avaliacoes/${encodeURIComponent(id)}`, { signal });
}

/** DELETE /avaliacoes/{id} (autenticado; 204). */
export function excluirAvaliacao(id: string): Promise<void> {
  return apiFetch<void>(`/avaliacoes/${encodeURIComponent(id)}`, { method: "DELETE" });
}
