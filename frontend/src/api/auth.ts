import { apiFetch } from "@/lib/http";
import type { CadastroEntrada, LoginEntrada, TokenResposta, UsuarioPublico } from "@/types/api";

/** POST /auth/cadastro → 201 UsuarioPublico (não devolve token; 409 se o e-mail existir). */
export function cadastrar(dados: CadastroEntrada): Promise<UsuarioPublico> {
  return apiFetch<UsuarioPublico>("/auth/cadastro", { method: "POST", body: dados, auth: false });
}

/** POST /auth/login → token Bearer (401 com credenciais inválidas). */
export function entrar(dados: LoginEntrada): Promise<TokenResposta> {
  return apiFetch<TokenResposta>("/auth/login", { method: "POST", body: dados, auth: false });
}
