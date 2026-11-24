import { USUARIO_TESTE } from "./fixtures/dados";
import { CHAVE_TOKEN, entrarComo, expect, preencherAvaliacao, test } from "./fixtures/teste";

test.describe("Conta e histórico", () => {
  test("cadastro → login automático → avaliação salva → histórico → detalhe → excluir", async ({ page, api }) => {
    await page.goto("/cadastro");
    await page.getByLabel("Nome").fill(USUARIO_TESTE.nome);
    await page.getByLabel(/^E-mail/).fill(USUARIO_TESTE.email);
    await page.getByLabel(/^Senha/).fill(USUARIO_TESTE.senha);
    await page.getByLabel(/^Confirmar senha/).fill(USUARIO_TESTE.senha);
    await page.getByRole("checkbox", { name: /^Li e aceito/ }).check();
    await page.getByRole("button", { name: "Criar conta" }).click();

    // Login automático e destino padrão (/avaliar).
    await expect(page).toHaveURL(/\/avaliar$/);
    await expect(page.getByText(`Olá, ${USUARIO_TESTE.nome.split(" ")[0]}`)).toBeVisible();
    expect(api.chamadas("POST", "/auth/cadastro")).toHaveLength(1);
    expect(api.chamadas("POST", "/auth/login")).toHaveLength(1);

    await preencherAvaliacao(page);
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByText("Avaliação salva no seu histórico.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver no histórico" })).toHaveAttribute("href", /^\/historico\/[\w-]+$/);
    expect(api.chamadas("POST", "/avaliacoes")[0].autorizado).toBe(true);
    expect(api.totalAvaliacoesSalvas).toBe(1);

    // Histórico.
    await page.getByRole("navigation", { name: "Principal", exact: true }).getByRole("link", { name: "Histórico" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Histórico" })).toBeVisible();
    const grupo = page.getByRole("region", { name: "Supino" });
    await expect(grupo).toBeVisible();
    await expect(grupo).toContainText("1 avaliação");
    await expect(grupo).toContainText("Faça outra avaliação deste exercício para ver sua evolução");

    // Detalhe.
    await grupo.getByRole("link", { name: /1RM 101,3 kg/ }).click();
    await expect(page).toHaveURL(/\/historico\/[\w-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: "Avaliação de Supino" })).toBeVisible();
    await expect(page.getByText("101,3 kg")).toBeVisible();

    // Excluir.
    await page.getByRole("button", { name: "Excluir avaliação" }).click();
    const dialogo = page.getByRole("dialog", { name: "Excluir avaliação?" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await dialogo.getByRole("button", { name: "Excluir", exact: true }).click();

    await expect(page).toHaveURL(/\/historico$/);
    await expect(page.getByText("Avaliação excluída.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nenhuma avaliação ainda" })).toBeVisible();
    expect(api.totalAvaliacoesSalvas).toBe(0);
  });

  test("rota protegida redireciona para /login?next= e volta após o login", async ({ page, api }) => {
    api.criarUsuario({ ...USUARIO_TESTE });

    await page.goto("/historico?exercicio=supino");
    await expect(page).toHaveURL(/\/login\?next=%2Fhistorico%3Fexercicio%3Dsupino$/);
    await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();

    // Credencial errada primeiro.
    await page.getByLabel(/^E-mail/).fill(USUARIO_TESTE.email);
    await page.getByLabel(/^Senha/).fill("senha-errada");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha inválidos." })).toBeVisible();

    await page.getByLabel(/^Senha/).fill(USUARIO_TESTE.senha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page).toHaveURL(/\/historico\?exercicio=supino$/);
    await expect(page.getByRole("heading", { level: 1, name: "Histórico" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Exercício" })).toHaveValue("supino");
    await expect(page.getByRole("heading", { name: "Nenhuma avaliação de Supino" })).toBeVisible();
  });

  test("levantamento terra aparece com o rótulo em português no histórico e no detalhe", async ({ page, api }) => {
    await entrarComo(page, api);
    await page.goto("/avaliar");
    await preencherAvaliacao(page, { exercicio: "deadlift", carga: "120", repeticoes: "5" });
    await page.getByRole("button", { name: "Calcular meu nível" }).click();
    await expect(page.getByText("Avaliação salva no seu histórico.")).toBeVisible();

    await page.goto("/historico");
    await expect(page).toHaveTitle("Histórico · Scouter Power");
    const grupo = page.getByRole("region", { name: "Levantamento terra" });
    await expect(grupo).toContainText("1 avaliação");
    await page.getByRole("combobox", { name: "Exercício" }).selectOption({ label: "Levantamento terra" });
    await expect(page).toHaveURL(/exercicio=deadlift/);

    await grupo.getByRole("link").first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Avaliação de Levantamento terra" })).toBeVisible();
    await expect(page).toHaveTitle("Avaliação de Levantamento terra · Scouter Power");
  });

  test("/conta sem sessão também redireciona", async ({ page, api }) => {
    void api;
    await page.goto("/conta");
    await expect(page).toHaveURL(/\/login\?next=%2Fconta$/);
  });

  test("excluir conta exige confirmação e encerra a sessão", async ({ page, api }) => {
    await entrarComo(page, api);
    await page.goto("/conta");
    await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
    await expect(page.getByText(USUARIO_TESTE.email).first()).toBeVisible();

    await page.getByRole("button", { name: "Excluir minha conta" }).click();
    const dialogo = page.getByRole("dialog", { name: "Excluir conta?" });
    await expect(dialogo).toBeVisible();

    // Sem a confirmação correta, o botão fica desabilitado e nada é excluído.
    const confirmar = dialogo.getByRole("button", { name: "Excluir definitivamente" });
    const campo = dialogo.getByLabel("Digite EXCLUIR para confirmar");
    await expect(confirmar).toBeDisabled();
    await campo.fill("excluir já");
    await expect(confirmar).toBeDisabled();
    expect(api.chamadas("DELETE", "/usuarios/me")).toHaveLength(0);

    await campo.fill("EXCLUIR");
    await expect(confirmar).toBeEnabled();
    await confirmar.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Sua conta e todas as suas avaliações foram excluídas.")).toBeVisible();
    expect(api.chamadas("DELETE", "/usuarios/me")).toHaveLength(1);
    expect(await page.evaluate((chave) => window.localStorage.getItem(chave), CHAVE_TOKEN)).toBeNull();
    await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible();
  });

  test("sair da conta limpa o token e volta à página inicial", async ({ page, api }) => {
    await entrarComo(page, api);
    await page.goto("/conta");
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate((chave) => window.localStorage.getItem(chave), CHAVE_TOKEN)).toBeNull();
  });
});
