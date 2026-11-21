import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

const MENSAGEM_PADRAO = "Você saiu da sua conta.";

/**
 * Sai da conta indo para a página inicial.
 *
 * O token só é limpo DEPOIS que a página inicial já está na tela: numa rota protegida, deslogar
 * antes faria o ProtectedRoute levar a /login?next=... Não basta aguardar o `navigate()`: o
 * router conclui a navegação dentro de uma transição do React, e um logout logo em seguida
 * renderiza a rota antiga (ainda protegida) sem login. Por isso o logout acontece num efeito,
 * que só roda após o commit da nova rota:
 * - se o componente continua montado (ex.: Header), quando o caminho vira "/";
 * - se ele desmonta com a navegação (ex.: ContaPage), na limpeza do efeito.
 */
export function useSair() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pendente = useRef<string | null>(null);

  const concluir = useCallback(() => {
    const mensagem = pendente.current;
    if (mensagem === null) return;
    pendente.current = null;
    logout();
    toast.success(mensagem);
  }, [logout]);

  useEffect(() => {
    if (pathname === "/") concluir();
  }, [pathname, concluir]);

  useEffect(() => () => concluir(), [concluir]);

  return useCallback(
    (mensagem: string = MENSAGEM_PADRAO) => {
      pendente.current = mensagem;
      if (pathname === "/") concluir();
      else void navigate("/", { replace: true });
    },
    [pathname, concluir, navigate],
  );
}
