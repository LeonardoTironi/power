import { isApiError } from "@/lib/http";

export interface FalhaEnvio {
  titulo: string;
  mensagem: string;
  /** Rede, timeout ou 5xx: o serviço está fora do ar (RF07). */
  indisponivel: boolean;
}

/** Timeout com sessão: o servidor pode ter gravado a avaliação mesmo sem responder a tempo. */
export const MENSAGEM_TIMEOUT_TALVEZ_SALVA =
  "A avaliação pode ter sido salva mesmo assim: confira o histórico antes de enviar de novo para não duplicá-la.";

/**
 * Converte o erro do POST /avaliacoes em mensagem para o usuário (exceto 422 com campos).
 * `autenticado`: havia sessão no envio (só então a avaliação pode ter sido gravada).
 */
export function descreverFalha(erro: unknown, { autenticado = false }: { autenticado?: boolean } = {}): FalhaEnvio {
  if (!isApiError(erro)) {
    return {
      titulo: "Algo deu errado",
      mensagem: "Não foi possível calcular sua avaliação. Tente novamente.",
      indisponivel: true,
    };
  }
  if (erro.kind === "network") {
    return { titulo: "Sem conexão com o servidor", mensagem: erro.detail, indisponivel: true };
  }
  if (erro.kind === "timeout") {
    return {
      titulo: "O servidor demorou para responder",
      mensagem: autenticado ? `${erro.detail} ${MENSAGEM_TIMEOUT_TALVEZ_SALVA}` : erro.detail,
      indisponivel: true,
    };
  }
  if (erro.status === 503) {
    return { titulo: "Serviço temporariamente indisponível", mensagem: erro.detail, indisponivel: true };
  }
  if (erro.status >= 500) {
    return { titulo: "Erro no servidor", mensagem: erro.detail, indisponivel: true };
  }
  return { titulo: "Não foi possível calcular", mensagem: erro.detail, indisponivel: false };
}
