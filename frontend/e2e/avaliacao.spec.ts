import { AVISO } from "./fixtures/dados";
import { expect, preencherAvaliacao, test } from "./fixtures/teste";

/** Cenários "Desejável" do backlog: fluxo principal de /avaliar com a API simulada. */
test.describe("Avaliação (/avaliar)", () => {
  test.beforeEach(async ({ page, api }) => {
    void api; // instala a API simulada antes da navegação
    await page.goto("/avaliar");
    await expect(page.getByRole("heading", { level: 1, name: "Avaliar minha força" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Exercício" })).toBeVisible();
  });

  test("(a) avaliação com sucesso mostra o resultado e o aviso", async ({ page, api }) => {
    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();

    const titulo = page.getByRole("heading", { level: 2, name: "Seu resultado" });
    await expect(titulo).toBeVisible();
    await expect(titulo).toBeFocused();
    await expect(page.getByText("1RM estimado", { exact: true })).toBeVisible();
    // 80 kg × 8 rep. → Epley 101,3 kg; 101,3 / 80 = 1,27 → intermediário (API simulada).
    const resumo = page.getByRole("region", { name: "Seu resultado" }).locator("dl");
    await expect(resumo).toContainText("101,3");
    await expect(resumo).toContainText("Intermediário");

    const aviso = page.getByRole("status").filter({ hasText: "Importante" });
    await expect(aviso).toContainText(AVISO);
    await expect(page.getByText("Esta avaliação não foi salva.")).toBeVisible();

    const posts = api.chamadas("POST", "/avaliacoes");
    expect(posts).toHaveLength(1);
    expect(posts[0].autorizado).toBe(false);
  });

  test("(b) validação bloqueia o envio com 0 repetições e não faz POST", async ({ page, api }) => {
    await preencherAvaliacao(page, { repeticoes: "0" });
    await page.getByRole("button", { name: "Calcular meu nível" }).click();

    await expect(page.getByText("As repetições devem estar entre 1 e 12.")).toBeVisible();
    const repeticoes = page.getByLabel("Repetições");
    await expect(repeticoes).toHaveAttribute("aria-invalid", "true");
    await expect(repeticoes).toBeFocused();
    await expect(page.getByRole("heading", { name: "Seu resultado" })).toHaveCount(0);

    // Dá tempo para uma eventual requisição indevida chegar.
    await page.waitForTimeout(300);
    expect(api.chamadas("POST", "/avaliacoes")).toHaveLength(0);
  });

  test("(b2) campos vazios: mostra as mensagens e foca o primeiro campo", async ({ page, api }) => {
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByText("Informe sua idade.")).toBeVisible();
    await expect(page.getByText("Selecione o sexo.")).toBeVisible();
    await expect(page.getByText("Informe quantas repetições você fez.")).toBeVisible();
    await expect(page.getByLabel("Idade (anos)")).toBeFocused();
    expect(api.chamadas("POST", "/avaliacoes")).toHaveLength(0);
  });

  test("(c) backend indisponível: mostra a mensagem, mantém os dados e 'Tentar novamente' funciona", async ({
    page,
    api,
  }) => {
    api.modoAvaliacao = "sem-conexao";
    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();

    const alerta = page.getByRole("alert").filter({ hasText: "Sem conexão com o servidor" });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText("Seus dados foram mantidos");

    // Dados preservados.
    await expect(page.getByLabel("Idade (anos)")).toHaveValue("30");
    await expect(page.getByRole("radio", { name: "Masculino" })).toBeChecked();
    await expect(page.getByLabel("Massa corporal (kg)")).toHaveValue("80");
    await expect(page.getByLabel("Estatura (m, opcional)")).toHaveValue("1,80");
    await expect(page.getByRole("combobox", { name: "Exercício" })).toHaveValue("supino");
    await expect(page.getByLabel("Carga (kg)")).toHaveValue("80");
    await expect(page.getByLabel("Repetições")).toHaveValue("8");

    // A API volta.
    api.modoAvaliacao = "normal";
    await alerta.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Seu resultado" })).toBeVisible();
    expect(api.chamadas("POST", "/avaliacoes")).toHaveLength(2);
  });

  test("(c2) serviço com 503 mostra 'Serviço temporariamente indisponível'", async ({ page, api }) => {
    api.modoAvaliacao = "indisponivel-503";
    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();

    const alerta = page.getByRole("alert").filter({ hasText: "Serviço temporariamente indisponível" });
    await expect(alerta).toBeVisible();
    await expect(page.getByLabel("Carga (kg)")).toHaveValue("80");

    api.modoAvaliacao = "normal";
    await alerta.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Seu resultado" })).toBeVisible();
  });

  test("navegação só por teclado: Tab pelos campos e Enter no botão", async ({ page, api }) => {
    /** Pressiona Tab até o foco chegar ao elemento (no máximo 40 vezes). */
    const tabAte = async (alvo: ReturnType<typeof page.getByLabel>) => {
      for (let i = 0; i < 40; i++) {
        if (await alvo.evaluate((el) => el === document.activeElement)) return;
        await page.keyboard.press("Tab");
      }
      throw new Error("O foco não chegou ao elemento esperado só com Tab.");
    };

    await page.locator("body").click({ position: { x: 1, y: 1 } });

    await tabAte(page.getByLabel("Idade (anos)"));
    await page.keyboard.type("30");

    await tabAte(page.getByRole("radio", { name: "Masculino" }));
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "Masculino" })).toBeChecked();

    await tabAte(page.getByLabel("Massa corporal (kg)"));
    await page.keyboard.type("80");

    await tabAte(page.getByLabel("Estatura (m, opcional)"));
    await page.keyboard.type("1,80");

    const exercicio = page.getByRole("combobox", { name: "Exercício" });
    await tabAte(exercicio);
    await page.keyboard.press("ArrowDown");
    await expect(exercicio).toHaveValue("supino");

    await tabAte(page.getByLabel("Carga (kg)"));
    await page.keyboard.type("80");

    await tabAte(page.getByLabel("Repetições"));
    await page.keyboard.type("8");

    const botao = page.getByRole("button", { name: "Calcular meu nível" });
    await tabAte(botao);
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { level: 2, name: "Seu resultado" })).toBeFocused();
    expect(api.chamadas("POST", "/avaliacoes")).toHaveLength(1);
  });

  test("'Editar dados' volta ao formulário com os valores e foco na idade", async ({ page }) => {
    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await page.getByRole("button", { name: "Editar dados" }).click();
    await expect(page.getByLabel("Idade (anos)")).toBeFocused();
    await expect(page.getByLabel("Idade (anos)")).toHaveValue("30");
    await expect(page.getByLabel("Repetições")).toHaveValue("8");
  });
});
