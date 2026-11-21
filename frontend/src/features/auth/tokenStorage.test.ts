import { afterEach, describe, expect, it, vi } from "vitest";
import { criarJwtFake } from "@/test/jwt";
import { CHAVE_TOKEN, decodificarJwt, expiracaoMs, tokenExpirado, tokenStorage } from "./tokenStorage";

describe("tokenStorage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("salva, lê e apaga o token no localStorage", () => {
    expect(tokenStorage.get()).toBeNull();
    tokenStorage.set("t1");
    expect(window.localStorage.getItem(CHAVE_TOKEN)).toBe("t1");
    expect(tokenStorage.get()).toBe("t1");
    tokenStorage.clear();
    expect(tokenStorage.get()).toBeNull();
  });

  it("não lança se o localStorage estiver bloqueado (usa memória)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => tokenStorage.set("t2")).not.toThrow();
    expect(tokenStorage.get()).toBe("t2");
    expect(() => tokenStorage.clear()).not.toThrow();
    expect(tokenStorage.get()).toBeNull();
  });
});

describe("JWT", () => {
  it("decodifica sub e exp", () => {
    const agora = Date.UTC(2026, 10, 22, 12);
    const token = criarJwtFake({ sub: "u1", expiraEmSegundos: 3600, agora });
    expect(decodificarJwt(token)).toMatchObject({ sub: "u1", exp: agora / 1000 + 3600 });
    expect(expiracaoMs(token)).toBe(agora + 3_600_000);
  });

  it("detecta token expirado e malformado", () => {
    expect(tokenExpirado(criarJwtFake({ expiraEmSegundos: 3600 }))).toBe(false);
    expect(tokenExpirado(criarJwtFake({ expiraEmSegundos: -1 }))).toBe(true);
    expect(tokenExpirado("nao-e-jwt")).toBe(true);
    expect(decodificarJwt("a.%%%.c")).toBeNull();
  });
});
