import { afterEach, describe, expect, it, vi } from "vitest";
import { delay, http } from "msw";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { TIMEOUT_PADRAO_MS } from "@/lib/http";
import { criarAvaliacao, TIMEOUT_AVALIACAO_MS } from "./avaliacoes";
import type { AvaliacaoEntrada } from "@/types/api";

const entrada: AvaliacaoEntrada = {
  idade: 30,
  sexo: "m",
  massa_corporal_kg: 80,
  estatura_m: null,
  exercicio: "supino",
  carga_kg: 100,
  repeticoes: 5,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("criarAvaliacao", () => {
  it("usa timeout de 30 s (maior que o padrão) no POST /avaliacoes", async () => {
    expect(TIMEOUT_AVALIACAO_MS).toBe(30_000);
    expect(TIMEOUT_AVALIACAO_MS).toBeGreaterThan(TIMEOUT_PADRAO_MS);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    server.use(
      http.post(api("/avaliacoes"), async () => {
        await delay("infinite");
      }),
    );
    let estado: "pendente" | "rejeitada" = "pendente";
    let erro: unknown;
    criarAvaliacao(entrada).catch((e: unknown) => {
      estado = "rejeitada";
      erro = e;
    });

    await vi.advanceTimersByTimeAsync(TIMEOUT_PADRAO_MS + 1_000);
    expect(estado).toBe("pendente");

    await vi.advanceTimersByTimeAsync(TIMEOUT_AVALIACAO_MS - TIMEOUT_PADRAO_MS);
    await vi.waitFor(() => expect(estado).toBe("rejeitada"));
    expect(erro).toMatchObject({ kind: "timeout" });
  });
});
