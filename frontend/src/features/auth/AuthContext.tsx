import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { obterUsuarioAtual } from "@/api/usuarios";
import { queryKeys } from "@/api/queryKeys";
import { EVENTO_NAO_AUTORIZADO } from "@/lib/http";
import { AuthContext, type AuthContextValue, type LogoutOpcoes } from "./useAuth";
import { CHAVE_TOKEN, expiracaoMs, tokenExpirado, tokenStorage } from "./tokenStorage";

export const MENSAGEM_SESSAO_EXPIRADA = "Sua sessão expirou. Entre novamente.";

/** Maior atraso aceito por setTimeout (~24,8 dias). */
const MAX_TIMEOUT = 2_147_483_647;

function tokenInicial(): string | null {
  const salvo = tokenStorage.get();
  if (salvo && tokenExpirado(salvo)) {
    tokenStorage.clear();
    return null;
  }
  return salvo;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(tokenInicial);

  const limparCacheDoUsuario = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.usuarioMe });
    queryClient.removeQueries({ queryKey: queryKeys.historico.all });
    queryClient.removeQueries({ queryKey: queryKeys.avaliacao.all });
  }, [queryClient]);

  const logout = useCallback(
    (opcoes?: LogoutOpcoes) => {
      tokenStorage.clear();
      setToken(null);
      limparCacheDoUsuario();
      if (opcoes?.mensagem) toast.info(opcoes.mensagem);
    },
    [limparCacheDoUsuario],
  );

  const login = useCallback(
    (novoToken: string) => {
      limparCacheDoUsuario();
      tokenStorage.set(novoToken);
      setToken(novoToken);
    },
    [limparCacheDoUsuario],
  );

  // Logout automático na expiração do JWT.
  useEffect(() => {
    if (!token) return;
    const exp = expiracaoMs(token);
    if (exp === null) return;
    const restante = Math.max(0, exp - Date.now());
    const timer = setTimeout(() => logout({ mensagem: MENSAGEM_SESSAO_EXPIRADA }), Math.min(restante, MAX_TIMEOUT));
    return () => clearTimeout(timer);
  }, [token, logout]);

  // Logout quando uma chamada autenticada recebe 401 (ver lib/http.ts).
  useEffect(() => {
    const aoNaoAutorizado = () => {
      if (token !== null) logout({ mensagem: MENSAGEM_SESSAO_EXPIRADA });
    };
    window.addEventListener(EVENTO_NAO_AUTORIZADO, aoNaoAutorizado);
    return () => window.removeEventListener(EVENTO_NAO_AUTORIZADO, aoNaoAutorizado);
  }, [token, logout]);

  // Sincroniza login/logout entre abas.
  useEffect(() => {
    const aoMudarStorage = (evento: StorageEvent) => {
      if (evento.key !== null && evento.key !== CHAVE_TOKEN) return;
      const atual = tokenInicial();
      setToken((anterior) => {
        if (anterior !== atual) limparCacheDoUsuario();
        return atual;
      });
    };
    window.addEventListener("storage", aoMudarStorage);
    return () => window.removeEventListener("storage", aoMudarStorage);
  }, [limparCacheDoUsuario]);

  const usuarioQuery = useQuery({
    queryKey: queryKeys.usuarioMe,
    queryFn: ({ signal }) => obterUsuarioAtual(signal),
    enabled: token !== null,
    staleTime: 5 * 60_000,
  });

  const user = token ? (usuarioQuery.data ?? null) : null;
  const isLoading = token !== null && usuarioQuery.isPending;

  const valor = useMemo<AuthContextValue>(
    () => ({ user, token, isAuthenticated: token !== null, isLoading, login, logout }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
