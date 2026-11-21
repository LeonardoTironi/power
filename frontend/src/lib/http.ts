import { env } from "@/lib/env";
import { tokenStorage } from "@/features/auth/tokenStorage";
import type { ErroValidacaoItem } from "@/types/api";

export const TIMEOUT_PADRAO_MS = 15_000;

/** Disparado em `window` quando uma chamada autenticada recebe 401. O AuthContext desloga. */
export const EVENTO_NAO_AUTORIZADO = "scouter-power:nao-autorizado";

export type ApiErrorKind = "http" | "network" | "timeout";

export class ApiError extends Error {
  /** Status HTTP; 0 para falha de rede ou timeout. */
  readonly status: number;
  /** Mensagem pronta para exibir ao usuário (pt-BR). */
  readonly detail: string;
  /** Erros por campo (422), chave = nome do campo no corpo/consulta (ex.: "idade"). */
  readonly fieldErrors: Record<string, string>;
  readonly kind: ApiErrorKind;

  constructor(opts: {
    status: number;
    detail: string;
    kind: ApiErrorKind;
    fieldErrors?: Record<string, string>;
  }) {
    super(opts.detail);
    this.name = "ApiError";
    this.status = opts.status;
    this.detail = opts.detail;
    this.kind = opts.kind;
    this.fieldErrors = opts.fieldErrors ?? {};
  }
}

export function isApiError(erro: unknown): erro is ApiError {
  return erro instanceof ApiError;
}

const MENSAGENS_STATUS: Record<number, string> = {
  400: "Requisição inválida.",
  401: "Sua sessão expirou ou não é válida. Entre novamente.",
  403: "Você não tem permissão para esta ação.",
  404: "Não encontrado.",
  409: "Conflito com dados existentes.",
  422: "Verifique os campos destacados.",
  429: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  500: "Erro interno do servidor. Tente novamente mais tarde.",
  503: "Serviço temporariamente indisponível. Tente novamente em instantes.",
};

export const MENSAGEM_REDE = "Não foi possível conectar ao servidor. Verifique sua conexão.";
export const MENSAGEM_TIMEOUT = "O servidor demorou para responder. Tente novamente.";

function mensagemPadrao(status: number): string {
  return MENSAGENS_STATUS[status] ?? (status >= 500 ? MENSAGENS_STATUS[500] : "Não foi possível concluir a operação.");
}

/** Traduz um item de erro de validação do Pydantic para pt-BR. */
export function traduzirErroValidacao(item: ErroValidacaoItem, campo: string): string {
  const ctx = item.ctx ?? {};
  switch (item.type) {
    case "missing":
      return "Campo obrigatório.";
    case "greater_than_equal":
      return `Deve ser no mínimo ${String(ctx.ge)}.`;
    case "greater_than":
      return `Deve ser maior que ${String(ctx.gt)}.`;
    case "less_than_equal":
      return `Deve ser no máximo ${String(ctx.le)}.`;
    case "less_than":
      return `Deve ser menor que ${String(ctx.lt)}.`;
    case "string_too_short":
      return Number(ctx.min_length) <= 1
        ? "Campo obrigatório."
        : `Deve ter pelo menos ${String(ctx.min_length)} caracteres.`;
    case "string_too_long":
      return `Deve ter no máximo ${String(ctx.max_length)} caracteres.`;
    case "int_parsing":
    case "int_type":
    case "int_from_float":
      return "Informe um número inteiro.";
    case "float_parsing":
    case "float_type":
      return "Informe um número.";
    case "enum":
      return "Selecione uma opção válida.";
    case "literal_error":
      return campo === "consentimento_lgpd" ? "É necessário aceitar os termos de uso." : "Valor inválido.";
    case "value_error":
      return item.msg.replace(/^Value error,\s*/i, "").replace(/^./, (c) => c.toUpperCase()) + (item.msg.endsWith(".") ? "" : ".");
    default:
      return item.msg;
  }
}

/** Converte o `detail` de um 422 do FastAPI em { campo: mensagem }. */
export function mapearErrosDeCampo(detail: unknown): Record<string, string> {
  if (!Array.isArray(detail)) return {};
  const erros: Record<string, string> = {};
  for (const bruto of detail) {
    if (!bruto || typeof bruto !== "object") continue;
    const item = bruto as ErroValidacaoItem;
    const loc = Array.isArray(item.loc) ? [...item.loc] : [];
    if (["body", "query", "path", "header"].includes(String(loc[0]))) loc.shift();
    const campo = loc.length ? loc.map(String).join(".") : "_";
    if (!(campo in erros)) erros[campo] = traduzirErroValidacao(item, campo);
  }
  return erros;
}

type ValorConsulta = string | number | boolean | null | undefined;

export interface ApiFetchOptions extends Omit<RequestInit, "body" | "method" | "signal"> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serializado como JSON. */
  body?: unknown;
  /** Parâmetros de consulta; null/undefined/"" são omitidos. */
  query?: Record<string, ValorConsulta>;
  /** Envia o Bearer do tokenStorage se existir (padrão: true). */
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function montarUrl(caminho: string, query?: Record<string, ValorConsulta>): string {
  const relativo = `${env.apiBaseUrl}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
  // Base relativa ("/api/v1") é resolvida contra a origem da página (proxy do Vite).
  const url = new URL(relativo, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (query) {
    for (const [chave, valor] of Object.entries(query)) {
      if (valor !== undefined && valor !== null && valor !== "") url.searchParams.append(chave, String(valor));
    }
  }
  return url.toString();
}

async function lerCorpo(resposta: Response): Promise<unknown> {
  if (resposta.status === 204 || resposta.status === 205) return undefined;
  const texto = await resposta.text();
  if (!texto) return undefined;
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

/**
 * Lê o corpo, mas desiste se `sinal` abortar (nem todo fetch propaga o abort para um
 * corpo já em leitura). Rejeita com o motivo do abort.
 */
function lerAteAbortar(resposta: Response, sinal: AbortSignal): Promise<unknown> {
  if (sinal.aborted) return Promise.reject(sinal.reason);
  return new Promise((resolve, reject) => {
    const aoAbortar = () => {
      reject(sinal.reason);
      resposta.body?.cancel().catch(() => undefined);
    };
    sinal.addEventListener("abort", aoAbortar, { once: true });
    lerCorpo(resposta).then(resolve, reject).finally(() => sinal.removeEventListener("abort", aoAbortar));
  });
}

/**
 * Chama a API (base `env.apiBaseUrl`). Lança `ApiError` em resposta não-2xx, falha de
 * rede ou timeout. Se o `signal` externo for abortado, relança o AbortError original.
 */
export async function apiFetch<T>(caminho: string, opcoes: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, signal, timeoutMs = TIMEOUT_PADRAO_MS, headers, ...resto } = opcoes;

  const cabecalhos = new Headers(headers);
  cabecalhos.set("Accept", "application/json");
  if (body !== undefined) cabecalhos.set("Content-Type", "application/json");
  const token = auth ? tokenStorage.get() : null;
  if (token) cabecalhos.set("Authorization", `Bearer ${token}`);

  const controlador = new AbortController();
  let estourou = false;
  const timer = setTimeout(() => {
    estourou = true;
    controlador.abort();
  }, timeoutMs);
  const repassarAbort = () => controlador.abort();
  if (signal) {
    if (signal.aborted) controlador.abort();
    else signal.addEventListener("abort", repassarAbort, { once: true });
  }

  const erroDeAbort = (erro: unknown): unknown => {
    if (estourou) return new ApiError({ status: 0, kind: "timeout", detail: MENSAGEM_TIMEOUT });
    if (signal?.aborted) return erro;
    return null;
  };

  // Timer e listener valem até o corpo ser lido por inteiro (um corpo lento também estoura).
  let resposta: Response;
  let corpo: unknown;
  try {
    try {
      resposta = await fetch(montarUrl(caminho, query), {
        ...resto,
        method,
        headers: cabecalhos,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controlador.signal,
      });
    } catch (erro) {
      throw erroDeAbort(erro) ?? new ApiError({ status: 0, kind: "network", detail: MENSAGEM_REDE });
    }

    try {
      corpo = await lerAteAbortar(resposta, controlador.signal);
    } catch (erro) {
      const abortado = erroDeAbort(erro);
      if (abortado) throw abortado;
      corpo = undefined;
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", repassarAbort);
  }

  if (!resposta.ok) {
    const detalheBruto = corpo && typeof corpo === "object" ? (corpo as { detail?: unknown }).detail : undefined;
    const fieldErrors = resposta.status === 422 ? mapearErrosDeCampo(detalheBruto) : {};
    const detail =
      typeof detalheBruto === "string" && detalheBruto.trim() ? detalheBruto : mensagemPadrao(resposta.status);

    if (resposta.status === 401 && token) {
      window.dispatchEvent(new CustomEvent(EVENTO_NAO_AUTORIZADO));
    }
    throw new ApiError({ status: resposta.status, kind: "http", detail, fieldErrors });
  }

  return corpo as T;
}
