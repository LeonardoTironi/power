/**
 * Dados de exemplo usados pelos testes E2E (espelham o contrato de src/types/api.ts).
 * Nada aqui é credencial real: são valores de teste da API simulada.
 */

export const USUARIO_TESTE = {
  nome: "Ana Teste",
  email: "ana.teste@example.com",
  senha: "senha-de-teste-123",
} as const;

export const EXERCICIOS = [
  { valor: "supino", rotulo: "Supino" },
  { valor: "agachamento", rotulo: "Agachamento" },
  { valor: "deadlift", rotulo: "Levantamento terra" },
] as const;

export const HEALTH_OK = {
  status: "ok",
  banco_disponivel: true,
  modelo_carregado: true,
  versao_modelo: "svm_tuned-v1",
} as const;

export const AVISO =
  "Resultado informativo: a classificação e a estimativa de 1RM não substituem avaliação física profissional nem orientação médica.";

/** Dados válidos (RN03) para preencher o formulário de avaliação. */
export const AVALIACAO_VALIDA = {
  idade: "30",
  sexo: "Masculino",
  massa: "80",
  estatura: "1,80",
  exercicio: "supino",
  carga: "80",
  repeticoes: "8",
} as const;

/** Mesma fórmula de Epley usada como referência no backend, arredondada a 0,1 kg. */
export function rm1Epley(carga: number, repeticoes: number): number {
  const rm1 = repeticoes === 1 ? carga : carga * (1 + repeticoes / 30);
  return Math.round(rm1 * 10) / 10;
}

function base64Url(texto: string): string {
  return Buffer.from(texto, "utf8").toString("base64url");
}

/** JWT falso (assinatura inválida), com `exp` — o frontend só lê o payload. */
export function criarJwtFake(sub: string, expiraEmSegundos = 3600): string {
  const iat = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ sub, iat, exp: iat + expiraEmSegundos }));
  return `${header}.${payload}.assinatura-falsa`;
}
