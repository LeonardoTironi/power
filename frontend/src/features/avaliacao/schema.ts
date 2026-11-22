import { z } from "zod";
import { formatarEstatura, formatarNumero } from "@/lib/format";
import { RN03 } from "@/lib/rn03";
import type { AvaliacaoEntrada, Exercicio, Sexo } from "@/types/api";

export const EXERCICIOS_VALIDOS: readonly Exercicio[] = ["supino", "agachamento", "deadlift"];
const SEXOS_VALIDOS: readonly Sexo[] = ["m", "f"];

/** Ordem visual dos campos; usada para focar o primeiro campo com erro. */
export const ORDEM_CAMPOS = [
  "idade",
  "sexo",
  "massa_corporal_kg",
  "estatura_m",
  "exercicio",
  "carga_kg",
  "repeticoes",
] as const;

export type CampoAvaliacao = (typeof ORDEM_CAMPOS)[number];

export function ehCampoAvaliacao(valor: string): valor is CampoAvaliacao {
  return (ORDEM_CAMPOS as readonly string[]).includes(valor);
}

/** Resultado da leitura de um número digitado. */
export type LeituraNumero =
  | { tipo: "vazio" }
  | { tipo: "invalido" }
  /** "1.000", "1.000,5", "1,000.5": separador de milhar (ambíguo; rejeitado). */
  | { tipo: "milhar" }
  /** `casas` = casas decimais significativas ("82,50" → 1). */
  | { tipo: "ok"; valor: number; casas: number };

const MILHAR_COM_PONTO = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
const MILHAR_COM_VIRGULA = /^\d{1,3}(?:,\d{3})+\.\d+$/;

/** Lê um número digitado em pt-BR ("72,5") ou com ponto ("72.5"). */
export function analisarNumero(texto: string): LeituraNumero {
  const limpo = texto.trim().replace(/\s+/g, "");
  if (!limpo) return { tipo: "vazio" };
  if (MILHAR_COM_PONTO.test(limpo) || MILHAR_COM_VIRGULA.test(limpo)) return { tipo: "milhar" };
  const partes = /^(\d+)(?:[.,](\d+))?$/.exec(limpo);
  if (!partes) return { tipo: "invalido" };
  const decimais = (partes[2] ?? "").replace(/0+$/, "");
  return { tipo: "ok", valor: Number(limpo.replace(",", ".")), casas: decimais.length };
}

/**
 * Lê um número digitado em pt-BR ("72,5") ou com ponto ("72.5").
 * Retorna null se vazio e NaN se não for um número (inclui separador de milhar).
 */
export function lerNumero(texto: string): number | null {
  const leitura = analisarNumero(texto);
  if (leitura.tipo === "vazio") return null;
  return leitura.tipo === "ok" ? leitura.valor : Number.NaN;
}

interface RegrasNumero {
  min: number;
  max: number;
  inteiro: boolean;
  vazio: string;
  invalido: string;
  faixa: string;
  /** Máximo de casas decimais aceitas (precisão da coluna no backend). */
  casas?: number;
  /** Mensagem quando passa de `casas`. */
  casasExcedidas?: string;
  /** Mensagem específica para um valor fora da faixa (ex.: estatura em cm). */
  dicaForaDaFaixa?: (valor: number) => string | undefined;
}

function validar(leitura: LeituraNumero, regras: RegrasNumero, ctx: z.RefinementCtx): leitura is Extract<LeituraNumero, { tipo: "ok" }> {
  if (leitura.tipo === "milhar") {
    ctx.addIssue({ code: "custom", message: MENSAGENS.milhar });
    return false;
  }
  if (leitura.tipo !== "ok" || (regras.inteiro && !Number.isInteger(leitura.valor))) {
    ctx.addIssue({ code: "custom", message: regras.invalido });
    return false;
  }
  const { valor } = leitura;
  if (valor < regras.min || valor > regras.max) {
    ctx.addIssue({ code: "custom", message: regras.dicaForaDaFaixa?.(valor) ?? regras.faixa });
    return false;
  }
  if (regras.casas !== undefined && leitura.casas > regras.casas) {
    ctx.addIssue({ code: "custom", message: regras.casasExcedidas ?? regras.invalido });
    return false;
  }
  return true;
}

function numeroObrigatorio(regras: RegrasNumero) {
  return z.string().transform((texto, ctx): number => {
    const leitura = analisarNumero(texto);
    if (leitura.tipo === "vazio") {
      ctx.addIssue({ code: "custom", message: regras.vazio });
      return z.NEVER;
    }
    return validar(leitura, regras, ctx) ? leitura.valor : z.NEVER;
  });
}

function numeroOpcional(regras: RegrasNumero) {
  return z.string().transform((texto, ctx): number | null => {
    const leitura = analisarNumero(texto);
    if (leitura.tipo === "vazio") return null;
    return validar(leitura, regras, ctx) ? leitura.valor : z.NEVER;
  });
}

const { idade, massa_corporal_kg, estatura_m, carga_kg, repeticoes } = RN03;
const kg = (n: number) => formatarNumero(n);

/** Casas decimais gravadas pelo backend: Numeric(5,1) para kg e Numeric(3,2) para estatura. */
const CASAS_KG = 1;
const CASAS_ESTATURA = 2;

export const MENSAGENS = {
  milhar: "Use vírgula para decimais, sem separador de milhar.",
  idade: {
    vazio: "Informe sua idade.",
    invalido: "Informe a idade em anos inteiros, ex.: 30.",
    faixa: `A idade deve estar entre ${idade.min} e ${idade.max} anos.`,
  },
  sexo: "Selecione o sexo.",
  massa_corporal_kg: {
    vazio: "Informe sua massa corporal.",
    invalido: "Informe um número, ex.: 72,5.",
    faixa: `A massa corporal deve estar entre ${kg(massa_corporal_kg.min)} e ${kg(massa_corporal_kg.max)} kg.`,
    casasExcedidas: "Use no máximo 1 casa decimal, ex.: 72,5.",
  },
  estatura_m: {
    invalido: "Informe um número em metros, ex.: 1,75.",
    faixa: `A estatura deve estar entre ${formatarEstatura(estatura_m.min)} e ${formatarEstatura(estatura_m.max)}.`,
    emCentimetros: "Informe a estatura em metros, ex.: 1,75 (e não 175).",
    casasExcedidas: "Use no máximo 2 casas decimais, ex.: 1,75.",
  },
  exercicio: "Selecione o exercício.",
  carga_kg: {
    vazio: "Informe a carga levantada.",
    invalido: "Informe um número, ex.: 80 ou 82,5.",
    faixa: `A carga deve estar entre ${kg(carga_kg.min)} e ${kg(carga_kg.max)} kg.`,
    casasExcedidas: "Use no máximo 1 casa decimal, ex.: 82,5.",
  },
  repeticoes: {
    vazio: "Informe quantas repetições você fez.",
    invalido: "Informe um número inteiro de repetições, ex.: 8.",
    faixa: `As repetições devem estar entre ${repeticoes.min} e ${repeticoes.max}.`,
  },
} as const;

export const avaliacaoSchema = z.object({
  idade: numeroObrigatorio({ ...idade, ...MENSAGENS.idade }),
  sexo: z.string().transform((valor, ctx): Sexo => {
    if (!SEXOS_VALIDOS.includes(valor as Sexo)) {
      ctx.addIssue({ code: "custom", message: MENSAGENS.sexo });
      return z.NEVER;
    }
    return valor as Sexo;
  }),
  massa_corporal_kg: numeroObrigatorio({ ...massa_corporal_kg, ...MENSAGENS.massa_corporal_kg, casas: CASAS_KG }),
  estatura_m: numeroOpcional({
    ...estatura_m,
    ...MENSAGENS.estatura_m,
    vazio: "",
    casas: CASAS_ESTATURA,
    dicaForaDaFaixa: (valor) =>
      valor >= estatura_m.min * 100 && valor <= estatura_m.max * 100 ? MENSAGENS.estatura_m.emCentimetros : undefined,
  }),
  exercicio: z.string().transform((valor, ctx): Exercicio => {
    if (!EXERCICIOS_VALIDOS.includes(valor as Exercicio)) {
      ctx.addIssue({ code: "custom", message: MENSAGENS.exercicio });
      return z.NEVER;
    }
    return valor as Exercicio;
  }),
  carga_kg: numeroObrigatorio({ ...carga_kg, ...MENSAGENS.carga_kg, casas: CASAS_KG }),
  repeticoes: numeroObrigatorio({ ...repeticoes, ...MENSAGENS.repeticoes }),
});

/** Valores do formulário (texto, como digitado). */
export type AvaliacaoFormValores = z.input<typeof avaliacaoSchema>;
/** Corpo pronto para POST /avaliacoes. */
export type AvaliacaoFormSaida = z.output<typeof avaliacaoSchema>;

/** Saída do schema → corpo da API (checado em tempo de compilação). */
export function paraEntrada(saida: AvaliacaoFormSaida): AvaliacaoEntrada {
  return { ...saida };
}

export const VALORES_INICIAIS: AvaliacaoFormValores = {
  idade: "",
  sexo: "",
  massa_corporal_kg: "",
  estatura_m: "",
  exercicio: "",
  carga_kg: "",
  repeticoes: "",
};
