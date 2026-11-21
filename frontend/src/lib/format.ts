import type { Exercicio, NivelForca, Sexo } from "@/types/api";

const LOCALE = "pt-BR";

export const ROTULOS_EXERCICIO: Record<Exercicio, string> = {
  supino: "Supino",
  agachamento: "Agachamento",
  deadlift: "Levantamento terra",
};

export const ROTULOS_NIVEL: Record<NivelForca, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const ROTULOS_SEXO: Record<Sexo, string> = {
  m: "Masculino",
  f: "Feminino",
};

export function rotuloExercicio(valor: string): string {
  return ROTULOS_EXERCICIO[valor as Exercicio] ?? valor;
}

export function rotuloNivel(valor: string): string {
  return ROTULOS_NIVEL[valor as NivelForca] ?? valor;
}

export function rotuloSexo(valor: string): string {
  return ROTULOS_SEXO[valor as Sexo] ?? valor;
}

const numero1Casa = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const numero2Casas = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 101.3 → "101,3"; 100 → "100". */
export function formatarNumero(valor: number): string {
  return numero1Casa.format(valor);
}

/** 101.3 → "101,3 kg". */
export function formatarKg(valor: number): string {
  return `${numero1Casa.format(valor)} kg`;
}

/** Variação com sinal: 5 → "+5 kg", -2.5 → "−2,5 kg", 0 → "0 kg". */
export function formatarVariacaoKg(valor: number): string {
  if (valor === 0) return "0 kg";
  const sinal = valor > 0 ? "+" : "−";
  return `${sinal}${numero1Casa.format(Math.abs(valor))} kg`;
}

/** 1.75 → "1,75 m". */
export function formatarEstatura(valor: number): string {
  return `${numero2Casas.format(valor)} m`;
}

function paraData(valor: string | Date): Date | null {
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

const formatoData = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric" });
const formatoDataHora = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const formatoDataCurta = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short" });

/** "22/11/2026". */
export function formatarData(valor: string | Date): string {
  const data = paraData(valor);
  return data ? formatoData.format(data) : "";
}

/** "22/11/2026, 13:45". */
export function formatarDataHora(valor: string | Date): string {
  const data = paraData(valor);
  return data ? formatoDataHora.format(data) : "";
}

/** "22 de nov." (eixos de gráfico). */
export function formatarDataCurta(valor: string | Date): string {
  const data = paraData(valor);
  return data ? formatoDataCurta.format(data) : "";
}
