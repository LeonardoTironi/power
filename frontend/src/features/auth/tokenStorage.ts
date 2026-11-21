/**
 * Guarda o JWT no localStorage. Toda leitura/escrita é protegida por try/catch
 * (modo privado, armazenamento bloqueado), caso em que o token vive só em memória.
 */

export const CHAVE_TOKEN = "scouter-power:token";

let tokenEmMemoria: string | null = null;

export const tokenStorage = {
  get(): string | null {
    try {
      return window.localStorage.getItem(CHAVE_TOKEN);
    } catch {
      return tokenEmMemoria;
    }
  },
  set(token: string): void {
    tokenEmMemoria = token;
    try {
      window.localStorage.setItem(CHAVE_TOKEN, token);
    } catch {
      // Sem storage: mantém só em memória.
    }
  },
  clear(): void {
    tokenEmMemoria = null;
    try {
      window.localStorage.removeItem(CHAVE_TOKEN);
    } catch {
      // Ignora.
    }
  },
};

export interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  [claim: string]: unknown;
}

/** Decodifica o payload do JWT sem validar a assinatura. Retorna null se malformado. */
export function decodificarJwt(token: string): JwtPayload | null {
  const partes = token.split(".");
  if (partes.length !== 3 || !partes[1]) return null;
  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binario = atob(preenchido);
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    const json: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return json && typeof json === "object" ? (json as JwtPayload) : null;
  } catch {
    return null;
  }
}

/** Momento de expiração em ms desde a época, ou null se o token não tiver `exp`. */
export function expiracaoMs(token: string): number | null {
  const exp = decodificarJwt(token)?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

/** true se o token estiver malformado ou já expirado (com margem em ms). */
export function tokenExpirado(token: string, agora = Date.now(), margemMs = 0): boolean {
  const payload = decodificarJwt(token);
  if (!payload) return true;
  if (typeof payload.exp !== "number") return false;
  return payload.exp * 1000 - margemMs <= agora;
}
