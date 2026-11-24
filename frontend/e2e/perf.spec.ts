import { createServer, type Server } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { AVISO, EXERCICIOS, HEALTH_OK, rm1Epley } from "./fixtures/dados";
import { preencherAvaliacao } from "./fixtures/teste";

/**
 * RNF02 — medição de desempenho do frontend com throttling de rede (CDP). Pulado por padrão.
 *
 *   npm run medir:desempenho                          # API simulada (servidor Node na porta 8000)
 *   cross-env PERF=1 PERF_API=real playwright test perf --workers=1   # API real já no ar em :8000
 *
 * Rede: preset "Slow 4G" do Chrome DevTools (o mesmo que o Lighthouse aplica no modo
 * devtools): latência 562,5 ms (RTT 150 ms × 3,75), 1,6 Mbit/s × 0,9 de descida e
 * 750 kbit/s × 0,9 de subida. O throttling vale para tudo que o navegador baixa,
 * inclusive o /api (o preview encaminha /api para http://localhost:8000).
 *
 * Os números saem no console e em test-results/desempenho-<modo>.json.
 */
test.skip(!process.env.PERF, "Medição de desempenho: defina PERF=1 (npm run medir:desempenho).");
test.describe.configure({ mode: "serial" });

const AQUI = dirname(fileURLToPath(import.meta.url));
const MODO = process.env.PERF_API === "real" ? "real" : "simulada";
const REPETICOES_CARGA = Number(process.env.PERF_CARGAS ?? 5);
const REPETICOES_ENVIO = Number(process.env.PERF_ENVIOS ?? 10);

export const SLOW_4G = {
  offline: false,
  latency: 562.5,
  downloadThroughput: (1.6 * 1000 * 1000) / 8 * 0.9, // 180.000 B/s ≈ 1,44 Mbit/s
  uploadThroughput: (750 * 1000) / 8 * 0.9, // 84.375 B/s ≈ 675 kbit/s
} as const;

interface CenarioBenchmark {
  avaliacao: string;
  concorrencia: number;
  servidor_local: { p95_ms: number };
}

/** p95 do servidor medido no backend (backend/data/benchmark_api.json). */
function latenciasDoBenchmark(): { tipico: number; pior: number; origem: string } {
  const caminho = resolve(AQUI, "../../backend/data/benchmark_api.json");
  try {
    const dados = JSON.parse(readFileSync(caminho, "utf8")) as { cenarios: CenarioBenchmark[]; data: string };
    const anonima1 = dados.cenarios.find((c) => c.avaliacao === "anonima" && c.concorrencia === 1);
    const pior = Math.max(...dados.cenarios.map((c) => c.servidor_local.p95_ms));
    return { tipico: anonima1?.servidor_local.p95_ms ?? 16.5, pior, origem: `benchmark_api.json de ${dados.data}` };
  } catch {
    return { tipico: 16.5, pior: 250.7, origem: "valores do backend/README.md (arquivo não encontrado)" };
  }
}

const resultados: Record<string, unknown> = {
  modo: MODO,
  data: new Date().toISOString(),
  rede: SLOW_4G,
};

let servidor: Server | null = null;
let atrasoServidorMs = 0;

/** API mínima na porta 8000 (health, exercícios, POST /avaliacoes) com atraso configurável. */
function iniciarApiSimulada(): Promise<Server> {
  return new Promise((ok, falha) => {
    const s = createServer((req, res) => {
      const responder = (status: number, corpo: unknown) => {
        const texto = JSON.stringify(corpo);
        res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(texto) });
        res.end(texto);
      };
      const caminho = (req.url ?? "").split("?")[0];
      if (req.method === "GET" && caminho === "/api/v1/health") return responder(200, HEALTH_OK);
      if (req.method === "GET" && caminho === "/api/v1/exercicios") return responder(200, EXERCICIOS);
      if (req.method === "POST" && caminho === "/api/v1/avaliacoes") {
        let corpo = "";
        req.on("data", (parte) => (corpo += parte));
        req.on("end", () => {
          const e = JSON.parse(corpo) as { exercicio: string; carga_kg: number; repeticoes: number };
          const rm1 = rm1Epley(e.carga_kg, e.repeticoes);
          setTimeout(
            () =>
              responder(200, {
                id: null,
                exercicio: e.exercicio,
                nivel: "intermediario",
                rm1_estimado_kg: rm1,
                explicacao: "Nível intermediário: sua força relativa está na faixa média da base de referência.",
                aviso: AVISO,
                versao_modelo: HEALTH_OK.versao_modelo,
              }),
            atrasoServidorMs,
          );
        });
        return;
      }
      return responder(404, { detail: "não simulado" });
    });
    s.once("error", (erro) =>
      falha(new Error(`Porta 8000 ocupada? Pare o backend ou use PERF_API=real. (${String(erro)})`)),
    );
    s.listen(8000, "localhost", () => ok(s));
  });
}

async function novoContextoLento(browser: Browser): Promise<{ contexto: BrowserContext; page: Page }> {
  const contexto = await browser.newContext({ locale: "pt-BR", viewport: { width: 1280, height: 800 } });
  const page = await contexto.newPage();
  const cdp = await contexto.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", SLOW_4G);
  return { contexto, page };
}

function estatisticas(valores: number[]) {
  const ord = [...valores].sort((a, b) => a - b);
  const pct = (p: number) => ord[Math.min(ord.length - 1, Math.ceil((p / 100) * ord.length) - 1)];
  const arred = (n: number) => Math.round(n);
  return {
    n: ord.length,
    min: arred(ord[0]),
    mediana: arred(pct(50)),
    p95: arred(pct(95)),
    max: arred(ord[ord.length - 1]),
  };
}

/** Navega e devolve FCP, LCP, "formulário pronto" (só /avaliar) e bytes transferidos. */
async function medirCarga(page: Page, rota: string) {
  await page.goto(rota, { waitUntil: "load", timeout: 120_000 });
  if (rota === "/avaliar") {
    await page.locator("select#exercicio").waitFor({ timeout: 60_000 });
  } else {
    await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 60_000 });
  }
  const prontoMs = await page.evaluate(() => performance.now());
  // Dá um instante para a última entrada de LCP ser registrada.
  await page.waitForTimeout(500);
  return page.evaluate(async (pronto) => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? NaN;
    // LCP só é exposto via PerformanceObserver (buffered); fica a última entrada.
    const lcp = await new Promise<number>((ok) => {
      let ultimo = NaN;
      new PerformanceObserver((lista) => {
        const entradas = lista.getEntries();
        ultimo = entradas[entradas.length - 1].startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => ok(ultimo), 300);
    });
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const recursos = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const bytes = (nav?.transferSize ?? 0) + recursos.reduce((s, r) => s + (r.transferSize ?? 0), 0);
    return { fcp, lcp, pronto, bytes, requisicoes: recursos.length + 1 };
  }, prontoMs);
}

test.beforeAll(async () => {
  if (MODO === "simulada") servidor = await iniciarApiSimulada();
});

test.afterAll(async () => {
  await new Promise<void>((ok) => (servidor ? servidor.close(() => ok()) : ok()));
  const destino = resolve(AQUI, `../test-results/desempenho-${MODO}.json`);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(resultados, null, 2));
  console.log(`\nResultados gravados em ${destino}`);
});

for (const rota of ["/", "/avaliar"]) {
  test(`carregamento inicial de ${rota} em Slow 4G (cache vazio)`, async ({ browser }) => {
    test.setTimeout(REPETICOES_CARGA * 90_000);
    const amostras: Awaited<ReturnType<typeof medirCarga>>[] = [];
    for (let i = 0; i < REPETICOES_CARGA; i++) {
      const { contexto, page } = await novoContextoLento(browser);
      amostras.push(await medirCarga(page, rota));
      await contexto.close();
    }
    const r = {
      fcp_ms: estatisticas(amostras.map((a) => a.fcp)),
      lcp_ms: estatisticas(amostras.map((a) => a.lcp)),
      pronto_ms: estatisticas(amostras.map((a) => a.pronto)),
      bytes_transferidos: Math.round(amostras.reduce((s, a) => s + a.bytes, 0) / amostras.length),
      requisicoes: amostras[0].requisicoes,
    };
    resultados[`carga ${rota}`] = r;
    console.log(`\n[carga ${rota}]`, JSON.stringify(r));
    expect(r.lcp_ms.n).toBe(REPETICOES_CARGA);
  });
}

const latencias = latenciasDoBenchmark();
const cenariosEnvio =
  MODO === "real"
    ? [{ nome: "API real", atraso: 0 }]
    : [
        { nome: `servidor p95 anônima/1 (${latencias.tipico} ms)`, atraso: latencias.tipico },
        { nome: `servidor pior p95 (${latencias.pior} ms)`, atraso: latencias.pior },
      ];

for (const cenario of cenariosEnvio) {
  test(`clique em "Calcular meu nível" até o resultado em Slow 4G — ${cenario.nome}`, async ({ browser }) => {
    test.setTimeout(180_000 + REPETICOES_ENVIO * 30_000);
    atrasoServidorMs = cenario.atraso;
    const { contexto, page } = await novoContextoLento(browser);
    await page.goto("/avaliar", { timeout: 120_000 });
    await page.locator("select#exercicio").waitFor({ timeout: 60_000 });
    await preencherAvaliacao(page);

    const tempos: number[] = [];
    for (let i = 0; i < REPETICOES_ENVIO; i++) {
      const botao = page.getByRole("button", { name: "Calcular meu nível" });
      await botao.waitFor();
      // Marca o clique (fase de captura) e o primeiro quadro com o resultado no DOM.
      await page.evaluate(() => {
        const w = window as unknown as { __t0?: number; __t1?: number };
        w.__t0 = undefined;
        w.__t1 = undefined;
        document.addEventListener("click", () => (w.__t0 = performance.now()), { capture: true, once: true });
        const obs = new MutationObserver(() => {
          if (document.getElementById("resultado-titulo")) {
            obs.disconnect();
            requestAnimationFrame(() => (w.__t1 = performance.now()));
          }
        });
        obs.observe(document.body, { childList: true, subtree: true });
      });
      await botao.click();
      await expect(page.getByRole("heading", { level: 2, name: "Seu resultado" })).toBeVisible({ timeout: 30_000 });
      const delta = await page.waitForFunction(() => {
        const w = window as unknown as { __t0?: number; __t1?: number };
        return w.__t0 !== undefined && w.__t1 !== undefined ? w.__t1 - w.__t0 : null;
      });
      tempos.push((await delta.jsonValue()) as number);
      await page.getByRole("button", { name: "Nova avaliação" }).click();
    }
    await contexto.close();

    const r = { ...estatisticas(tempos), amostras_ms: tempos.map(Math.round), origem_latencia: latencias.origem };
    resultados[`envio ${cenario.nome}`] = r;
    console.log(`\n[envio ${cenario.nome}]`, JSON.stringify(r));
    expect(r.p95).toBeLessThan(4000);
  });
}
