import { apiFetch } from "@/lib/http";
import type { HealthResposta } from "@/types/api";

/** GET /health */
export function obterHealth(signal?: AbortSignal): Promise<HealthResposta> {
  return apiFetch<HealthResposta>("/health", { auth: false, signal });
}
