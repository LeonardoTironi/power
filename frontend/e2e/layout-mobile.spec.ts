import type { Page } from "@playwright/test";
import { entrarComo, expect, preencherAvaliacao, test } from "./fixtures/teste";

test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: false });

/**
 * Sem rolagem horizontal: nem o documento nem o <main> podem ser mais largos que a
 * janela. O AppLayout usa overflow-x-hidden, que esconderia o estouro do documento;
 * por isso o <main> e os elementos visíveis também são medidos.
 */
async function semRolagemHorizontal(page: Page, contexto: string) {
  const medidas = await page.evaluate(() => {
    const largura = document.documentElement.clientWidth;
    const main = document.getElementById("conteudo");
    const estourados: string[] = [];
    for (const el of Array.from(main?.querySelectorAll<HTMLElement>("*") ?? [])) {
      const caixa = el.getBoundingClientRect();
      if (caixa.width === 0 || caixa.height === 0) continue;
      if (getComputedStyle(el).visibility === "hidden") continue;
      // Ignora decoração com aria-hidden (pode ser recortada de propósito).
      if (el.closest("[aria-hidden='true']")) continue;
      if (caixa.right > largura + 1 || caixa.left < -1) {
        estourados.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} [${Math.round(caixa.left)}, ${Math.round(caixa.right)}]`);
      }
    }
    return {
      largura,
      documento: document.documentElement.scrollWidth,
      main: main?.scrollWidth ?? 0,
      estourados: estourados.slice(0, 10),
    };
  });
  expect(medidas.documento, `${contexto}: largura do documento`).toBeLessThanOrEqual(medidas.largura);
  expect(medidas.main, `${contexto}: largura do <main>`).toBeLessThanOrEqual(medidas.largura);
  expect(medidas.estourados, `${contexto}: elementos fora da janela`).toEqual([]);
}

test.describe("Layout em 360×800", () => {
  for (const rota of ["/", "/avaliar", "/login", "/cadastro", "/termos"]) {
    test(`sem rolagem horizontal em ${rota}`, async ({ page, api }) => {
      void api;
      await page.goto(rota);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(300);
      await semRolagemHorizontal(page, rota);
    });
  }

  test("formulário, erros e resultado cabem na largura; menu móvel abre e fecha", async ({ page, api }) => {
    void api;
    await page.goto("/avaliar");
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByText("Informe sua idade.")).toBeVisible();
    await semRolagemHorizontal(page, "/avaliar (erros)");

    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByRole("heading", { name: "Seu resultado" })).toBeVisible();
    await page.waitForTimeout(800);
    await semRolagemHorizontal(page, "/avaliar (resultado)");

    const menu = page.getByRole("button", { name: "Abrir menu" });
    await menu.click();
    await expect(page.getByRole("navigation", { name: "Principal (celular)" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Principal (celular)" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused();
  });

  test("histórico e conta cabem na largura", async ({ page, api }) => {
    await entrarComo(page, api);
    await page.goto("/avaliar");
    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByText("Avaliação salva no seu histórico.")).toBeVisible();
    await page.getByRole("button", { name: "Nova avaliação" }).click();
    await preencherAvaliacao(page, { carga: "95", repeticoes: "6" });
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByText("Avaliação salva no seu histórico.")).toBeVisible();

    await page.goto("/historico");
    await expect(page.getByRole("region", { name: "Supino" })).toBeVisible();
    await page.waitForTimeout(300);
    await semRolagemHorizontal(page, "/historico");

    await page.goto("/conta");
    await expect(page.getByText("Membro desde")).toBeVisible();
    await semRolagemHorizontal(page, "/conta");
  });
});
