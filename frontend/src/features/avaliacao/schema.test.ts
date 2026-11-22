import { describe, expect, it } from "vitest";
import { avaliacaoSchema, lerNumero, MENSAGENS, VALORES_INICIAIS, type AvaliacaoFormValores } from "./schema";

const validos: AvaliacaoFormValores = {
  idade: "30",
  sexo: "m",
  massa_corporal_kg: "80",
  estatura_m: "",
  exercicio: "supino",
  carga_kg: "80",
  repeticoes: "8",
};

function erroDe(parcial: Partial<AvaliacaoFormValores>, campo: keyof AvaliacaoFormValores): string | undefined {
  const r = avaliacaoSchema.safeParse({ ...validos, ...parcial });
  if (r.success) return undefined;
  return r.error.issues.find((i) => i.path[0] === campo)?.message;
}

describe("lerNumero", () => {
  it("aceita vírgula e ponto decimal e espaços", () => {
    expect(lerNumero("72,5")).toBe(72.5);
    expect(lerNumero(" 72.5 ")).toBe(72.5);
    expect(lerNumero("")).toBeNull();
    expect(lerNumero("abc")).toBeNaN();
    expect(lerNumero("1.000,5")).toBeNaN();
    expect(lerNumero("1.000")).toBeNaN();
    expect(lerNumero("-5")).toBeNaN();
  });
});

describe("avaliacaoSchema (RN03)", () => {
  it("converte para o corpo da API com estatura null quando vazia", () => {
    expect(avaliacaoSchema.parse(validos)).toEqual({
      idade: 30,
      sexo: "m",
      massa_corporal_kg: 80,
      estatura_m: null,
      exercicio: "supino",
      carga_kg: 80,
      repeticoes: 8,
    });
  });

  it("aceita vírgula decimal (pt-BR)", () => {
    const r = avaliacaoSchema.parse({ ...validos, massa_corporal_kg: "72,5", estatura_m: "1,75", carga_kg: "82,5" });
    expect(r).toMatchObject({ massa_corporal_kg: 72.5, estatura_m: 1.75, carga_kg: 82.5 });
  });

  it.each([
    ["idade", "16", true],
    ["idade", "90", true],
    ["idade", "15", false],
    ["idade", "91", false],
    ["idade", "30,5", false],
    ["massa_corporal_kg", "30", true],
    ["massa_corporal_kg", "250", true],
    ["massa_corporal_kg", "29,9", false],
    ["massa_corporal_kg", "250,1", false],
    ["estatura_m", "1,20", true],
    ["estatura_m", "2,30", true],
    ["estatura_m", "1,19", false],
    ["estatura_m", "2,31", false],
    ["carga_kg", "1", true],
    ["carga_kg", "500", true],
    ["carga_kg", "0", false],
    ["carga_kg", "500,5", false],
    ["repeticoes", "1", true],
    ["repeticoes", "12", true],
    ["repeticoes", "0", false],
    ["repeticoes", "13", false],
    ["repeticoes", "8,5", false],
  ] as const)("%s = %s → válido: %s", (campo, valor, valido) => {
    expect(avaliacaoSchema.safeParse({ ...validos, [campo]: valor }).success).toBe(valido);
  });

  it("mensagens em pt-BR por campo", () => {
    expect(erroDe({ idade: "" }, "idade")).toBe(MENSAGENS.idade.vazio);
    expect(erroDe({ idade: "15" }, "idade")).toBe("A idade deve estar entre 16 e 90 anos.");
    expect(erroDe({ massa_corporal_kg: "abc" }, "massa_corporal_kg")).toBe(MENSAGENS.massa_corporal_kg.invalido);
    expect(erroDe({ estatura_m: "175" }, "estatura_m")).toBe(MENSAGENS.estatura_m.emCentimetros);
    expect(erroDe({ estatura_m: "3" }, "estatura_m")).toBe("A estatura deve estar entre 1,20 m e 2,30 m.");
    expect(erroDe({ repeticoes: "0" }, "repeticoes")).toBe("As repetições devem estar entre 1 e 12.");
    expect(erroDe({ sexo: "" }, "sexo")).toBe(MENSAGENS.sexo);
  });

  it.each([
    ["massa_corporal_kg", "1.000"],
    ["carga_kg", "1.000"],
    ["carga_kg", "1.000,5"],
    ["carga_kg", "1,000.5"],
    ["idade", "1.000"],
  ] as const)("%s = %s → rejeita separador de milhar com mensagem clara", (campo, valor) => {
    expect(erroDe({ [campo]: valor }, campo)).toBe(MENSAGENS.milhar);
  });

  it("mensagem de milhar em pt-BR", () => {
    expect(MENSAGENS.milhar).toBe("Use vírgula para decimais, sem separador de milhar.");
  });

  it("kg aceita no máximo 1 casa decimal (Numeric(5,1) no backend)", () => {
    expect(erroDe({ massa_corporal_kg: "72,55" }, "massa_corporal_kg")).toBe("Use no máximo 1 casa decimal, ex.: 72,5.");
    expect(erroDe({ carga_kg: "82.25" }, "carga_kg")).toBe("Use no máximo 1 casa decimal, ex.: 82,5.");
    expect(avaliacaoSchema.parse({ ...validos, carga_kg: "82,50" }).carga_kg).toBe(82.5);
  });

  it("estatura aceita no máximo 2 casas decimais (Numeric(3,2) no backend)", () => {
    expect(erroDe({ estatura_m: "1,755" }, "estatura_m")).toBe("Use no máximo 2 casas decimais, ex.: 1,75.");
    expect(avaliacaoSchema.parse({ ...validos, estatura_m: "1,75" }).estatura_m).toBe(1.75);
  });

  it("rejeita exercício fora do catálogo", () => {
    expect(erroDe({ exercicio: "rosca" }, "exercicio")).toBe(MENSAGENS.exercicio);
  });

  it("formulário vazio acusa todos os campos obrigatórios, menos estatura", () => {
    const r = avaliacaoSchema.safeParse(VALORES_INICIAIS);
    expect(r.success).toBe(false);
    const campos = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(campos.sort()).toEqual(["carga_kg", "exercicio", "idade", "massa_corporal_kg", "repeticoes", "sexo"]);
  });
});
