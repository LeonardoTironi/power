import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/http";

/** Não repete erros 4xx (validação, auth, 404); repete até 2 vezes rede/timeout/5xx. */
export function deveRepetir(tentativas: number, erro: unknown): boolean {
  if (isApiError(erro) && erro.status >= 400 && erro.status < 500) return false;
  return tentativas < 2;
}

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: deveRepetir,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = criarQueryClient();
