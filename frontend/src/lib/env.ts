/**
 * Variáveis de ambiente do frontend. Nunca lança: sem VITE_API_URL, a API é acessada
 * por caminho relativo ("/api/v1"), atendido pelo proxy do Vite em dev e preview.
 */

function normalizarOrigem(valor: unknown): string {
  if (typeof valor !== "string") return "";
  const limpo = valor.trim().replace(/\/+$/, "");
  if (!limpo) return "";
  try {
    // Aceita só URLs absolutas http(s); qualquer outra coisa cai no proxy.
    const url = new URL(limpo);
    return url.protocol === "http:" || url.protocol === "https:" ? limpo : "";
  } catch {
    console.warn(`VITE_API_URL inválida ("${limpo}"); usando o proxy /api.`);
    return "";
  }
}

const apiOrigin = normalizarOrigem(import.meta.env.VITE_API_URL);

export const env = {
  /** Origem configurada (sem barra final) ou "" quando se usa o proxy. */
  apiOrigin,
  /** Base de todas as chamadas: "<origem>/api/v1" ou "/api/v1". */
  apiBaseUrl: `${apiOrigin}/api/v1`,
} as const;
