import { expect, test } from "./fixtures/teste";

/**
 * RNF01 — referência automatizada, NÃO é teste de usabilidade.
 *
 * Mede quanto leva um "usuário rápido" (um robô que já sabe o caminho, digita a
 * ~8 teclas/s e não lê nada) para sair da página inicial e ver o nível no supino.
 * Serve só como piso: mostra que a interface não impõe esperas ou passos que, sozinhos,
 * estourariam os 2 minutos. Se o piso subir muito entre versões, algo ficou mais longo.
 * O RNF01 é verificado com pessoas reais (project/USABILIDADE_RNF01.md).
 */
test("referência RNF01: fluxo do 'usuário rápido' da página inicial ao resultado", async ({ page, api }) => {
  void api;
  const digitar = { delay: 120 };

  await page.goto("/");
  const inicio = Date.now();

  await page.getByRole("link", { name: "Fazer avaliação" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Avaliar minha força" })).toBeVisible();

  await page.getByLabel("Idade (anos)").pressSequentially("30", digitar);
  await page.getByRole("radio", { name: "Masculino" }).check();
  await page.getByLabel("Massa corporal (kg)").pressSequentially("80", digitar);
  await page.getByRole("combobox", { name: "Exercício" }).selectOption("supino");
  await page.getByLabel("Carga (kg)").pressSequentially("80", digitar);
  await page.getByLabel("Repetições").pressSequentially("8", digitar);
  await page.getByRole("button", { name: "Calcular meu nível" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Seu resultado" })).toBeVisible();

  const segundos = (Date.now() - inicio) / 1000;
  test.info().annotations.push({ type: "rnf01-referencia", description: `${segundos.toFixed(1)} s` });
  console.log(`[RNF01 referência] usuário rápido: ${segundos.toFixed(1)} s (não é teste de usabilidade)`);
  expect(segundos).toBeLessThan(120);
});
