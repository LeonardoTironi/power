import { http, HttpResponse, type HttpHandler } from "msw";
import type { CadastroEntrada, LoginEntrada, UsuarioPublico } from "@/types/api";
import { criarJwtFake } from "../jwt";
import { api } from "./url";

/** Usuário devolvido por padrão em GET /usuarios/me. */
export const usuarioPadrao: UsuarioPublico = {
  id: "00000000-0000-0000-0000-000000000001",
  nome: "Ana Souza",
  email: "ana@exemplo.com",
  criado_em: "2026-11-01T10:00:00Z",
};

/** Credenciais aceitas pelo POST /auth/login padrão. */
export const credenciaisPadrao: LoginEntrada = { email: usuarioPadrao.email, senha: "senha-segura-123" };

/** E-mail que o POST /auth/cadastro padrão trata como já existente (409). */
export const EMAIL_JA_CADASTRADO = "ja@cadastrado.com";

/**
 * Handlers padrão de /auth/* e /usuarios/me:
 * - POST /auth/login: 200 com `credenciaisPadrao`, senão 401;
 * - POST /auth/cadastro: 201 (409 para EMAIL_JA_CADASTRADO);
 * - GET /usuarios/me: `usuarioPadrao`; DELETE /usuarios/me: 204.
 */
export const authHandlers: HttpHandler[] = [
  http.post(api("/auth/login"), async ({ request }) => {
    const corpo = (await request.json()) as LoginEntrada;
    if (corpo.email === credenciaisPadrao.email && corpo.senha === credenciaisPadrao.senha) {
      return HttpResponse.json({ access_token: criarJwtFake(), token_type: "bearer" });
    }
    return HttpResponse.json({ detail: "E-mail ou senha inválidos." }, { status: 401 });
  }),
  http.post(api("/auth/cadastro"), async ({ request }) => {
    const corpo = (await request.json()) as CadastroEntrada;
    if (corpo.email === EMAIL_JA_CADASTRADO) {
      return HttpResponse.json({ detail: "E-mail já cadastrado." }, { status: 409 });
    }
    const usuario: UsuarioPublico = {
      id: "00000000-0000-0000-0000-000000000002",
      nome: corpo.nome,
      email: corpo.email,
      criado_em: new Date().toISOString(),
    };
    return HttpResponse.json(usuario, { status: 201 });
  }),
  http.get(api("/usuarios/me"), () => HttpResponse.json(usuarioPadrao)),
  http.delete(api("/usuarios/me"), () => new HttpResponse(null, { status: 204 })),
];
