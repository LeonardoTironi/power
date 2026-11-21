/**
 * Faixas da RN03, idênticas a `AvaliacaoEntrada` no backend
 * (backend/app/models/avaliacao.py). Fora delas a API responde 422.
 */
export const RN03 = {
  idade: { min: 16, max: 90, inteiro: true },
  massa_corporal_kg: { min: 30, max: 250, inteiro: false },
  estatura_m: { min: 1.2, max: 2.3, inteiro: false, opcional: true },
  carga_kg: { min: 1, max: 500, inteiro: false },
  repeticoes: { min: 1, max: 12, inteiro: true },
} as const;

export type CampoRn03 = keyof typeof RN03;

/** Limites do cadastro (UsuarioCriar no backend). */
export const LIMITES_USUARIO = {
  nome: { min: 1, max: 120 },
  email: { max: 254 },
  senha: { min: 8, max: 128 },
} as const;
