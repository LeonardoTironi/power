import { test as base, expect, type Page } from "@playwright/test";
import { ApiSimulada } from "./apiSimulada";
import { AVALIACAO_VALIDA, USUARIO_TESTE } from "./dados";

/** Chave do token no localStorage (src/features/auth/tokenStorage.ts). */
export const CHAVE_TOKEN = "scouter-power:token";

/** `test` com a API simulada já instalada na página (nenhuma chamada sai para a rede). */
export const test = base.extend<{ api: ApiSimulada }>({
  // O parâmetro não se chama `use` para não confundir a regra react-hooks/rules-of-hooks.
  api: async ({ page }, fornecer) => {
    const api = new ApiSimulada();
    await api.instalar(page);
    await fornecer(api);
  },
});

export { expect };

type DadosAvaliacao = { [K in keyof typeof AVALIACAO_VALIDA]: string };

/** Preenche o formulário de /avaliar (a página já deve estar aberta). */
export async function preencherAvaliacao(page: Page, dados: Partial<DadosAvaliacao> = {}): Promise<void> {
  const d = { ...AVALIACAO_VALIDA, ...dados };
  await page.getByLabel("Idade (anos)").fill(d.idade);
  await page.getByRole("radio", { name: d.sexo }).check();
  await page.getByLabel("Massa corporal (kg)").fill(d.massa);
  await page.getByLabel("Estatura (m, opcional)").fill(d.estatura);
  await page.getByRole("combobox", { name: "Exercício" }).selectOption(d.exercicio);
  await page.getByLabel("Carga (kg)").fill(d.carga);
  await page.getByLabel("Repetições").fill(d.repeticoes);
}

/** Cria o usuário de teste na API simulada e grava o token como se ele tivesse entrado. */
export async function entrarComo(page: Page, api: ApiSimulada, usuario = USUARIO_TESTE) {
  const sessao = api.criarUsuario({ ...usuario });
  await page.goto("/");
  await page.evaluate(([chave, token]) => window.localStorage.setItem(chave, token), [CHAVE_TOKEN, sessao.token]);
  return sessao;
}
