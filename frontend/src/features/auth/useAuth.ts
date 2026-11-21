import { createContext, useContext } from "react";
import type { UsuarioPublico } from "@/types/api";

export interface LogoutOpcoes {
  /** Mensagem exibida em toast (ex.: sessão expirada). Omitida = sem toast. */
  mensagem?: string;
}

export interface AuthContextValue {
  /** Usuário de /usuarios/me; null enquanto carrega ou se deslogado. */
  user: UsuarioPublico | null;
  token: string | null;
  /** Há token válido (não expirado). O `user` pode ainda estar carregando. */
  isAuthenticated: boolean;
  /** Há token e /usuarios/me ainda não respondeu. */
  isLoading: boolean;
  /** Guarda o token (access_token do /auth/login) e carrega o usuário. */
  login: (token: string) => void;
  /** Apaga o token e os dados do usuário em cache. */
  logout: (opcoes?: LogoutOpcoes) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}
