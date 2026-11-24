import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { entrarComo, expect, preencherAvaliacao, test } from "./fixtures/teste";

/** Espera as animações finitas (entrada/fade) terminarem: elas alteram o contraste medido. */
export async function animacoesConcluidas(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

/** Regras WCAG 2.1 A/AA; o teste falha com qualquer violação de impacto serious ou critical (sem exceções). */
async function verificarAxe(page: Page, contexto: string) {
  await animacoesConcluidas(page);
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // Toasts do sonner entram e saem com animação; ficam fora da análise.
    .exclude("[data-sonner-toaster]")
    .analyze();
  const resumo: string[] = [];
  for (const v of resultado.violations) {
    if (v.impact !== "serious" && v.impact !== "critical") continue;
    for (const no of v.nodes) {
      const alvo = no.target.join(" ");
      const detalhe = no.any[0]?.message ?? no.all[0]?.message ?? "";
      resumo.push(`${v.id} (${v.impact}): ${v.help} → ${alvo} | ${detalhe}`);
    }
  }
  expect(resumo, `Violações serious/critical em ${contexto}`).toEqual([]);
}

test.describe("Acessibilidade (axe)", () => {
  test("página inicial", async ({ page, api }) => {
    void api;
    await page.goto("/");
    await expect(page.getByText("Serviço online")).toBeVisible();
    await verificarAxe(page, "/");
  });

  test("/avaliar com o formulário e com o resultado", async ({ page, api }) => {
    void api;
    await page.goto("/avaliar");
    await expect(page.getByRole("combobox", { name: "Exercício" })).toBeVisible();
    await verificarAxe(page, "/avaliar (formulário)");

    // Com erros de validação visíveis.
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByText("Informe sua idade.")).toBeVisible();
    await verificarAxe(page, "/avaliar (erros de validação)");

    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByRole("heading", { name: "Seu resultado" })).toBeVisible();
    await verificarAxe(page, "/avaliar (resultado)");
  });

  test("/login", async ({ page, api }) => {
    void api;
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
    await verificarAxe(page, "/login");
  });

  test("/cadastro", async ({ page, api }) => {
    void api;
    await page.goto("/cadastro");
    await expect(page.getByRole("heading", { level: 1, name: "Criar conta" })).toBeVisible();
    await verificarAxe(page, "/cadastro");
  });

  test("/historico (com avaliações) e /conta", async ({ page, api }) => {
    await entrarComo(page, api);
    await page.goto("/avaliar");
    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByText("Avaliação salva no seu histórico.")).toBeVisible();
    await page.getByRole("button", { name: "Nova avaliação" }).click();
    await preencherAvaliacao(page, { carga: "90" });
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByText("Avaliação salva no seu histórico.")).toBeVisible();

    await page.goto("/historico");
    await expect(page.getByRole("region", { name: "Supino" })).toContainText("2 avaliações");
    await verificarAxe(page, "/historico");

    await page.goto("/conta");
    await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
    await expect(page.getByText("Membro desde")).toBeVisible();
    await verificarAxe(page, "/conta");

    await page.getByRole("button", { name: "Excluir minha conta" }).click();
    await expect(page.getByRole("dialog", { name: "Excluir conta?" })).toBeVisible();
    await verificarAxe(page, "/conta (diálogo de exclusão)");
  });
});
