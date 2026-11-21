import { apiFetch } from "@/lib/http";
import type { UsuarioPublico } from "@/types/api";

/** GET /usuarios/me (autenticado). */
export function obterUsuarioAtual(signal?: AbortSignal): Promise<UsuarioPublico> {
  return apiFetch<UsuarioPublico>("/usuarios/me", { signal });
}

/** DELETE /usuarios/me (autenticado; 204). Apaga a conta e as avaliações. */
export function excluirConta(): Promise<void> {
  return apiFetch<void>("/usuarios/me", { method: "DELETE" });
}
