/**
 * Contrato da API do Scouter Power (prefixo /api/v1).
 * Fonte: backend/app/models/*.py e backend/app/api/routes/*.py.
 */

export type Exercicio = "supino" | "agachamento" | "deadlift";
export type Sexo = "m" | "f";
export type NivelForca = "iniciante" | "intermediario" | "avancado";

/** ISO 8601 com fuso (ex.: "2026-11-22T13:45:00.123456Z"). */
export type DataIso = string;
export type Uuid = string;

// ---- Sistema ---------------------------------------------------------------

/** GET /health */
export interface HealthResposta {
  status: "ok" | string;
  banco_disponivel: boolean;
  modelo_carregado: boolean;
  versao_modelo: string;
}

/** GET /exercicios (item) */
export interface ExercicioOpcao {
  valor: Exercicio;
  rotulo: string;
}

// ---- Avaliações ------------------------------------------------------------

/** POST /avaliacoes (corpo). Faixas em lib/rn03.ts. */
export interface AvaliacaoEntrada {
  exercicio: Exercicio;
  sexo: Sexo;
  idade: number;
  massa_corporal_kg: number;
  estatura_m?: number | null;
  carga_kg: number;
  repeticoes: number;
}

/** POST /avaliacoes (resposta). `id` só vem preenchido com token válido. */
export interface AvaliacaoResultado {
  id: Uuid | null;
  exercicio: Exercicio;
  nivel: NivelForca;
  rm1_estimado_kg: number;
  explicacao: string;
  aviso: string;
  versao_modelo: string;
}

/** GET /avaliacoes/{id} e itens do histórico. */
export interface AvaliacaoPublica {
  id: Uuid;
  exercicio: Exercicio;
  sexo: Sexo;
  idade: number;
  massa_corporal_kg: number;
  estatura_m: number | null;
  carga_kg: number;
  repeticoes: number;
  rm1_estimado_kg: number;
  nivel: NivelForca;
  versao_modelo: string;
  criado_em: DataIso;
}

/** GET /avaliacoes/historico (item). Avaliações em ordem cronológica crescente. */
export interface HistoricoExercicio {
  exercicio: Exercicio;
  avaliacoes: AvaliacaoPublica[];
  /** Último − primeiro 1RM; null com menos de duas avaliações. */
  variacao_rm1_kg: number | null;
}

// ---- Autenticação e conta --------------------------------------------------

/** POST /auth/cadastro (corpo). */
export interface CadastroEntrada {
  nome: string;
  email: string;
  senha: string;
  consentimento_lgpd: true;
}

/** POST /auth/login (corpo). */
export interface LoginEntrada {
  email: string;
  senha: string;
}

/** POST /auth/login (resposta). JWT HS256, expira em 60 min, sem refresh. */
export interface TokenResposta {
  access_token: string;
  token_type: "bearer" | string;
}

/** POST /auth/cadastro (201) e GET /usuarios/me. */
export interface UsuarioPublico {
  id: Uuid;
  nome: string;
  email: string;
  criado_em: DataIso;
}

// ---- Erros -----------------------------------------------------------------

/** Item de erro de validação do FastAPI (422). */
export interface ErroValidacaoItem {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

/** Corpo de erro do FastAPI: `detail` textual (4xx/5xx) ou lista (422). */
export interface ErroApiCorpo {
  detail: string | ErroValidacaoItem[];
}
