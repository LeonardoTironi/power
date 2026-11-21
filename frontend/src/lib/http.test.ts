import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse, delay } from "msw";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { tokenStorage } from "@/features/auth/tokenStorage";
import { ApiError, EVENTO_NAO_AUTORIZADO, MENSAGEM_REDE, MENSAGEM_TIMEOUT, apiFetch, mapearErrosDeCampo } from "./http";

async function capturar(promessa: Promise<unknown>): Promise<ApiError> {
  try {
    await promessa;
  } catch (erro) {
    expect(erro).toBeInstanceOf(ApiError);
    return erro as ApiError;
  }
  throw new Error("era esperado um erro");
}

describe("apiFetch", () => {
  it("faz GET na base /api/v1 e devolve o JSON", async () => {
    const dados = await apiFetch<{ status: string }>("/health");
    expect(dados.status).toBe("ok");
  });

  it("envia JSON e o Bearer do tokenStorage", async () => {
    tokenStorage.set("abc.def.ghi");
    let recebido: { auth: string | null; tipo: string | null; corpo: unknown } | undefined;
    server.use(
      http.post(api("/eco"), async ({ request }) => {
        recebido = {
          auth: request.headers.get("authorization"),
          tipo: request.headers.get("content-type"),
          corpo: await request.json(),
        };
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch("/eco", { method: "POST", body: { a: 1 } });
    expect(recebido).toEqual({ auth: "Bearer abc.def.ghi", tipo: "application/json", corpo: { a: 1 } });
  });

  it("não envia o Bearer com auth: false", async () => {
    tokenStorage.set("abc.def.ghi");
    let auth: string | null = "x";
    server.use(
      http.get(api("/eco"), ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({});
      }),
    );
    await apiFetch("/eco", { auth: false });
    expect(auth).toBeNull();
  });

  it("monta a query string omitindo valores vazios", async () => {
    let url = "";
    server.use(
      http.get(api("/avaliacoes/historico"), ({ request }) => {
        url = request.url;
        return HttpResponse.json([]);
      }),
    );
    await apiFetch("/avaliacoes/historico", { query: { exercicio: "supino", vazio: "", nada: null } });
    expect(new URL(url).search).toBe("?exercicio=supino");
  });

  it("devolve undefined em 204", async () => {
    server.use(http.delete(api("/usuarios/me"), () => new HttpResponse(null, { status: 204 })));
    await expect(apiFetch("/usuarios/me", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("lança ApiError http com o detail textual do backend", async () => {
    server.use(http.post(api("/auth/login"), () => HttpResponse.json({ detail: "E-mail ou senha inválidos." }, { status: 401 })));
    const erro = await capturar(apiFetch("/auth/login", { method: "POST", body: {}, auth: false }));
    expect(erro).toMatchObject({ status: 401, kind: "http", detail: "E-mail ou senha inválidos.", fieldErrors: {} });
    expect(erro.message).toBe("E-mail ou senha inválidos.");
  });

  it("usa mensagem padrão em pt-BR quando não há detail", async () => {
    server.use(http.post(api("/avaliacoes"), () => new HttpResponse("erro", { status: 503 })));
    const erro = await capturar(apiFetch("/avaliacoes", { method: "POST", body: {} }));
    expect(erro.status).toBe(503);
    expect(erro.detail).toMatch(/indisponível/i);
  });

  it("mapeia 422 para fieldErrors traduzidos", async () => {
    server.use(
      http.post(api("/avaliacoes"), () =>
        HttpResponse.json(
          {
            detail: [
              { loc: ["body", "idade"], msg: "Input should be greater than or equal to 16", type: "greater_than_equal", ctx: { ge: 16 } },
              { loc: ["body", "repeticoes"], msg: "Input should be less than or equal to 12", type: "less_than_equal", ctx: { le: 12 } },
              { loc: ["body", "sexo"], msg: "Field required", type: "missing" },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    const erro = await capturar(apiFetch("/avaliacoes", { method: "POST", body: {} }));
    expect(erro.status).toBe(422);
    expect(erro.detail).toBe("Verifique os campos destacados.");
    expect(erro.fieldErrors).toEqual({
      idade: "Deve ser no mínimo 16.",
      repeticoes: "Deve ser no máximo 12.",
      sexo: "Campo obrigatório.",
    });
  });

  it("lança ApiError network em falha de rede", async () => {
    server.use(http.get(api("/health"), () => HttpResponse.error()));
    const erro = await capturar(apiFetch("/health"));
    expect(erro).toMatchObject({ status: 0, kind: "network", detail: MENSAGEM_REDE });
  });

  it("lança ApiError timeout quando o servidor demora", async () => {
    server.use(
      http.get(api("/health"), async () => {
        await delay(200);
        return HttpResponse.json({});
      }),
    );
    const erro = await capturar(apiFetch("/health", { timeoutMs: 20 }));
    expect(erro).toMatchObject({ status: 0, kind: "timeout", detail: MENSAGEM_TIMEOUT });
  });

  it("o timeout continua valendo durante a leitura do corpo", async () => {
    server.use(
      http.get(api("/lento"), () => {
        // Cabeçalhos chegam na hora; o corpo começa e nunca termina.
        const corpo = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"parcial":'));
          },
        });
        return new HttpResponse(corpo, { headers: { "Content-Type": "application/json" } });
      }),
    );
    const erro = await capturar(apiFetch("/lento", { timeoutMs: 50 }));
    expect(erro).toMatchObject({ status: 0, kind: "timeout", detail: MENSAGEM_TIMEOUT });
  });

  it("o abort externo continua valendo durante a leitura do corpo", async () => {
    server.use(
      http.get(api("/lento"), () => {
        const corpo = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"parcial":'));
          },
        });
        return new HttpResponse(corpo, { headers: { "Content-Type": "application/json" } });
      }),
    );
    const controlador = new AbortController();
    const promessa = apiFetch("/lento", { signal: controlador.signal, timeoutMs: 5_000 });
    setTimeout(() => controlador.abort(), 30);
    await expect(promessa).rejects.toMatchObject({ name: "AbortError" });
  });

  it("dispara o evento de não autorizado só quando havia token", async () => {
    const ouvinte = vi.fn();
    window.addEventListener(EVENTO_NAO_AUTORIZADO, ouvinte);
    server.use(http.get(api("/usuarios/me"), () => HttpResponse.json({ detail: "Não autenticado ou token inválido." }, { status: 401 })));

    await capturar(apiFetch("/usuarios/me"));
    expect(ouvinte).not.toHaveBeenCalled();

    tokenStorage.set("abc.def.ghi");
    await capturar(apiFetch("/usuarios/me"));
    expect(ouvinte).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVENTO_NAO_AUTORIZADO, ouvinte);
  });
});

describe("mapearErrosDeCampo", () => {
  it("traduz consentimento, e-mail e tamanho de texto", () => {
    expect(
      mapearErrosDeCampo([
        { loc: ["body", "consentimento_lgpd"], msg: "Input should be True", type: "literal_error" },
        { loc: ["body", "email"], msg: "Value error, e-mail inválido", type: "value_error" },
        { loc: ["body", "senha"], msg: "String should have at least 8 characters", type: "string_too_short", ctx: { min_length: 8 } },
        { loc: ["query", "exercicio"], msg: "Input should be 'supino'", type: "enum" },
      ]),
    ).toEqual({
      consentimento_lgpd: "É necessário aceitar os termos de uso.",
      email: "E-mail inválido.",
      senha: "Deve ter pelo menos 8 caracteres.",
      exercicio: "Selecione uma opção válida.",
    });
  });

  it("ignora detail que não é lista", () => {
    expect(mapearErrosDeCampo("erro")).toEqual({});
  });
});
