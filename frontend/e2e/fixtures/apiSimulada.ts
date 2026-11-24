import { randomUUID } from "node:crypto";
import type { Page, Request, Route } from "@playwright/test";
import { AVISO, criarJwtFake, EXERCICIOS, HEALTH_OK, rm1Epley } from "./dados";

/** Como o backend simulado responde a POST /avaliacoes. */
export type ModoAvaliacao = "normal" | "sem-conexao" | "indisponivel-503";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  criado_em: string;
}

interface Avaliacao {
  id: string;
  usuarioId: string;
  exercicio: "supino" | "agachamento" | "deadlift";
  sexo: "m" | "f";
  idade: number;
  massa_corporal_kg: number;
  estatura_m: number | null;
  carga_kg: number;
  repeticoes: number;
  rm1_estimado_kg: number;
  nivel: "iniciante" | "intermediario" | "avancado";
  versao_modelo: string;
  criado_em: string;
}

export interface RequisicaoRegistrada {
  metodo: string;
  caminho: string;
  autorizado: boolean;
}

const VERSAO = HEALTH_OK.versao_modelo;

function nivelPorForcaRelativa(rm1: number, massa: number): Avaliacao["nivel"] {
  const relativa = rm1 / massa;
  if (relativa < 1) return "iniciante";
  if (relativa < 1.5) return "intermediario";
  return "avancado";
}

const ROTULO_NIVEL: Record<Avaliacao["nivel"], string> = {
  iniciante: "iniciante",
  intermediario: "intermediário",
  avancado: "avançado",
};

/**
 * Backend em memória atendido por `page.route("**\/api/v1/**")`. Cobre os endpoints
 * usados pelo frontend (health, exercícios, auth, usuários, avaliações e histórico),
 * guarda o estado entre chamadas e registra cada requisição para asserções.
 */
export class ApiSimulada {
  readonly requisicoes: RequisicaoRegistrada[] = [];
  modoAvaliacao: ModoAvaliacao = "normal";
  /** Atraso artificial (ms) antes de cada resposta. */
  atrasoMs = 0;

  private usuarios = new Map<string, Usuario>();
  private tokens = new Map<string, string>();
  private avaliacoes: Avaliacao[] = [];

  /** Cria um usuário já cadastrado e devolve um token válido para ele. */
  criarUsuario(dados: { nome: string; email: string; senha: string }): { usuario: Usuario; token: string } {
    const usuario: Usuario = { id: randomUUID(), criado_em: new Date().toISOString(), ...dados };
    this.usuarios.set(usuario.id, usuario);
    return { usuario, token: this.emitirToken(usuario.id) };
  }

  /** Requisições registradas de um método/caminho (caminho sem o prefixo /api/v1). */
  chamadas(metodo: string, caminho: string | RegExp): RequisicaoRegistrada[] {
    return this.requisicoes.filter(
      (r) => r.metodo === metodo && (typeof caminho === "string" ? r.caminho === caminho : caminho.test(r.caminho)),
    );
  }

  get totalAvaliacoesSalvas(): number {
    return this.avaliacoes.length;
  }

  async instalar(page: Page): Promise<void> {
    await page.route("**/api/v1/**", (route) => this.atender(route));
  }

  private emitirToken(usuarioId: string): string {
    const token = criarJwtFake(usuarioId);
    this.tokens.set(token, usuarioId);
    return token;
  }

  private usuarioDa(request: Request): Usuario | null {
    const cabecalho = request.headers()["authorization"] ?? "";
    const token = cabecalho.replace(/^Bearer\s+/i, "");
    const id = token ? this.tokens.get(token) : undefined;
    return id ? (this.usuarios.get(id) ?? null) : null;
  }

  private async atender(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const caminho = url.pathname.replace(/^.*\/api\/v1/, "") || "/";
    const metodo = request.method();
    const usuario = this.usuarioDa(request);

    // Preflight CORS (só ocorre se VITE_API_URL apontar para outra origem).
    if (metodo === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors() });
    }

    this.requisicoes.push({ metodo, caminho, autorizado: usuario !== null });
    if (this.atrasoMs > 0) await new Promise((r) => setTimeout(r, this.atrasoMs));

    const json = (status: number, corpo?: unknown) =>
      route.fulfill({
        status,
        headers: { ...cors(), "content-type": "application/json" },
        body: corpo === undefined ? "" : JSON.stringify(corpo),
      });
    const naoAutorizado = () => json(401, { detail: "Não autenticado." });

    if (metodo === "GET" && caminho === "/health") return json(200, HEALTH_OK);
    if (metodo === "GET" && caminho === "/exercicios") return json(200, EXERCICIOS);

    if (metodo === "POST" && caminho === "/auth/cadastro") {
      const corpo = request.postDataJSON() as { nome: string; email: string; senha: string; consentimento_lgpd: boolean };
      if ([...this.usuarios.values()].some((u) => u.email === corpo.email.toLowerCase())) {
        return json(409, { detail: "E-mail já cadastrado." });
      }
      const { usuario } = this.criarUsuario({ nome: corpo.nome, email: corpo.email.toLowerCase(), senha: corpo.senha });
      return json(201, publico(usuario));
    }

    if (metodo === "POST" && caminho === "/auth/login") {
      const corpo = request.postDataJSON() as { email: string; senha: string };
      const encontrado = [...this.usuarios.values()].find(
        (u) => u.email === corpo.email.toLowerCase() && u.senha === corpo.senha,
      );
      if (!encontrado) return json(401, { detail: "E-mail ou senha inválidos." });
      return json(200, { access_token: this.emitirToken(encontrado.id), token_type: "bearer" });
    }

    if (caminho === "/usuarios/me") {
      if (!usuario) return naoAutorizado();
      if (metodo === "GET") return json(200, publico(usuario));
      if (metodo === "DELETE") {
        this.usuarios.delete(usuario.id);
        this.avaliacoes = this.avaliacoes.filter((a) => a.usuarioId !== usuario.id);
        for (const [token, id] of this.tokens) if (id === usuario.id) this.tokens.delete(token);
        return route.fulfill({ status: 204, headers: cors() });
      }
    }

    if (metodo === "POST" && caminho === "/avaliacoes") {
      if (this.modoAvaliacao === "sem-conexao") return route.abort("connectionrefused");
      if (this.modoAvaliacao === "indisponivel-503") {
        return json(503, { detail: "Modelo indisponível no momento. Tente novamente em instantes." });
      }
      const e = request.postDataJSON() as Omit<Avaliacao, "id" | "usuarioId" | "rm1_estimado_kg" | "nivel" | "versao_modelo" | "criado_em">;
      const rm1 = rm1Epley(e.carga_kg, e.repeticoes);
      const nivel = nivelPorForcaRelativa(rm1, e.massa_corporal_kg);
      let id: string | null = null;
      if (usuario) {
        id = randomUUID();
        this.avaliacoes.push({
          ...e,
          estatura_m: e.estatura_m ?? null,
          id,
          usuarioId: usuario.id,
          rm1_estimado_kg: rm1,
          nivel,
          versao_modelo: VERSAO,
          criado_em: new Date().toISOString(),
        });
      }
      return json(200, {
        id,
        exercicio: e.exercicio,
        nivel,
        rm1_estimado_kg: rm1,
        explicacao: `Nível ${ROTULO_NIVEL[nivel]}: seu 1RM estimado é ${String(rm1).replace(".", ",")} kg.`,
        aviso: AVISO,
        versao_modelo: VERSAO,
      });
    }

    if (metodo === "GET" && caminho === "/avaliacoes/historico") {
      if (!usuario) return naoAutorizado();
      const filtro = url.searchParams.get("exercicio");
      const minhas = this.avaliacoes.filter((a) => a.usuarioId === usuario.id && (!filtro || a.exercicio === filtro));
      const grupos = EXERCICIOS.map(({ valor }) => minhas.filter((a) => a.exercicio === valor))
        .filter((lista) => lista.length > 0)
        .map((lista) => ({
          exercicio: lista[0].exercicio,
          avaliacoes: lista.map(semDono),
          variacao_rm1_kg:
            lista.length >= 2
              ? Math.round((lista[lista.length - 1].rm1_estimado_kg - lista[0].rm1_estimado_kg) * 10) / 10
              : null,
        }));
      return json(200, grupos);
    }

    const detalhe = /^\/avaliacoes\/([^/]+)$/.exec(caminho);
    if (detalhe) {
      if (!usuario) return naoAutorizado();
      const indice = this.avaliacoes.findIndex((a) => a.id === detalhe[1] && a.usuarioId === usuario.id);
      if (indice < 0) return json(404, { detail: "Avaliação não encontrada." });
      if (metodo === "GET") return json(200, semDono(this.avaliacoes[indice]));
      if (metodo === "DELETE") {
        this.avaliacoes.splice(indice, 1);
        return route.fulfill({ status: 204, headers: cors() });
      }
    }

    return json(404, { detail: `Rota não simulada: ${metodo} ${caminho}` });
  }
}

function cors(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type, accept",
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  };
}

function publico(u: Usuario) {
  return { id: u.id, nome: u.nome, email: u.email, criado_em: u.criado_em };
}

function semDono(a: Avaliacao) {
  const { usuarioId: _dono, ...resto } = a;
  void _dono;
  return resto;
}
