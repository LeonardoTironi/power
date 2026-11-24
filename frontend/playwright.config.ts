import { defineConfig, devices } from "@playwright/test";

/**
 * Testes E2E (Playwright). Não baixa navegadores: usa um navegador já instalado no
 * sistema via `channel` (padrão "msedge"; troque com E2E_CANAL=chrome).
 *
 * O servidor é o build de produção servido pelo `vite preview` na porta 4173. O build
 * é feito com VITE_API_URL em branco para que a API seja chamada por caminho relativo
 * (/api/v1): nos testes comuns ela é simulada com page.route; no smoke real
 * (E2E_REAL=1) e na medição de desempenho, o proxy do preview a encaminha para
 * http://localhost:8000.
 */
const PORTA = Number(process.env.E2E_PORTA ?? 4173);
const CANAL = process.env.E2E_CANAL ?? "msedge";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Cada worker abre um navegador completo; mais que isso satura máquinas comuns.
  workers: process.env.CI ? 2 : 4,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: CANAL },
    },
  ],
  webServer: {
    command: `npm run e2e:servidor -- --port ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Espaço em branco: env.ts o normaliza para "" e a API passa pelo proxy /api.
    // (Variáveis do processo têm prioridade sobre o .env local.)
    env: { VITE_API_URL: " " },
    stdout: "ignore",
    stderr: "pipe",
  },
});
