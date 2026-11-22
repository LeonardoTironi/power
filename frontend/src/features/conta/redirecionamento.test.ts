import { describe, expect, it } from "vitest";
import { destinoSeguro, sufixoNext } from "./redirecionamento";

describe("destinoSeguro", () => {
  it("aceita caminhos internos com consulta e âncora", () => {
    expect(destinoSeguro("/historico")).toBe("/historico");
    expect(destinoSeguro("/historico?exercicio=supino#topo")).toBe("/historico?exercicio=supino#topo");
  });

  it.each([null, undefined, "", "historico", "//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/a\nb", "/login", "/cadastro?next=/x"])(
    "rejeita %j",
    (valor) => {
      expect(destinoSeguro(valor)).toBe("/avaliar");
    },
  );

  it("monta o sufixo ?next só para destinos válidos", () => {
    expect(sufixoNext("/conta")).toBe("?next=%2Fconta");
    expect(sufixoNext("//evil.com")).toBe("");
    expect(sufixoNext(null)).toBe("");
  });
});
