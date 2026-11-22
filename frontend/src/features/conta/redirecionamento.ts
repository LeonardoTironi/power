/** Destino padrão depois de entrar ou criar a conta. */
export const DESTINO_PADRAO = "/avaliar";

/** Páginas que não fazem sentido como destino após o login (evita laço). */
const PROIBIDOS = ["/login", "/cadastro"];

/**
 * Valida o parâmetro `next` para evitar redirecionamento aberto: aceita só caminhos
 * internos ("/historico?x=1"), nunca "//host", "/\\host", URLs absolutas ou com
 * caracteres de controle. Qualquer outra coisa vira `padrao`.
 */
export function destinoSeguro(next: string | null | undefined, padrao: string = DESTINO_PADRAO): string {
  if (!next) return padrao;
  const valor = next.trim();
  if (!valor.startsWith("/")) return padrao;
  if (valor.startsWith("//") || valor.startsWith("/\\")) return padrao;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(valor)) return padrao;
  const caminho = valor.split(/[?#]/, 1)[0];
  if (PROIBIDOS.some((p) => caminho === p || caminho.startsWith(`${p}/`))) return padrao;
  return valor;
}

/** Sufixo "?next=..." para links entre login e cadastro (vazio sem destino válido). */
export function sufixoNext(next: string | null | undefined): string {
  const destino = destinoSeguro(next, "");
  return destino ? `?next=${encodeURIComponent(destino)}` : "";
}
