import { expect, test } from "@playwright/test";
import { AVALIACAO_VALIDA } from "./fixtures/dados";
import { preencherAvaliacao } from "./fixtures/teste";

/**
 * Smoke contra a API REAL (sem page.route). Pulado por padrão.
 *
 * Pré-requisitos: PostgreSQL (docker compose up -d db) e a API em http://localhost:8000
 * (uvicorn app.main:app --port 8000, na pasta backend). O preview encaminha /api para lá.
 * Rode com: npm run e2e:real
 *
 * Cria um usuário descartável e o exclui ao final (pela própria tela /conta).
 */
test.skip(!process.env.E2E_REAL, "Defina E2E_REAL=1 (npm run e2e:real) com o backend no ar.");

test("smoke real: cadastro → avaliação salva → histórico → exclusão da conta", async ({ page, request }) => {
  test.setTimeout(90_000);

  const health = await request.get("/api/v1/health");
  expect(health.ok(), "API fora do ar em http://localhost:8000").toBe(true);
  const estado = (await health.json()) as { banco_disponivel: boolean; modelo_carregado: boolean };
  expect(estado.modelo_carregado).toBe(true);
  expect(estado.banco_disponivel, "Suba o PostgreSQL: docker compose up -d db").toBe(true);

  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const senha = `e2e-${Math.random().toString(36).slice(2)}-Senha`;

  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel(/^E-mail/).fill(email);
  await page.getByLabel(/^Senha/).fill(senha);
  await page.getByLabel(/^Confirmar senha/).fill(senha);
  await page.getByRole("checkbox", { name: /^Li e aceito/ }).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/avaliar$/);

  try {
    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Seu resultado" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Importante" })).toBeVisible();
    await expect(page.getByText("Avaliação salva no seu histórico.")).toBeVisible();

    await page.getByRole("link", { name: "Ver no histórico" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /^Avaliação de / })).toBeVisible();
    await expect(page.getByText(`${AVALIACAO_VALIDA.repeticoes}`, { exact: true }).first()).toBeVisible();

    await page.goto("/historico");
    await expect(page.getByRole("region", { name: "Supino" })).toContainText("1 avaliação");
  } finally {
    // Limpeza: exclui a conta criada (LGPD) mesmo se algo acima falhar.
    await page.goto("/conta");
    await page.getByRole("button", { name: "Excluir minha conta" }).click();
    const dialogo = page.getByRole("dialog", { name: "Excluir conta?" });
    await dialogo.getByLabel("Digite EXCLUIR para confirmar").fill("EXCLUIR");
    await dialogo.getByRole("button", { name: "Excluir definitivamente" }).click();
    await expect(page.getByText("Sua conta e todas as suas avaliações foram excluídas.")).toBeVisible();
  }
});
