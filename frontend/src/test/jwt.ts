function base64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * JWT falso (assinatura inválida) para testes. Por padrão expira em 60 min.
 * Ex.: criarJwtFake({ expiraEmSegundos: -10 }) gera um token já expirado.
 */
export function criarJwtFake({
  sub = "00000000-0000-0000-0000-000000000001",
  expiraEmSegundos = 3600,
  agora = Date.now(),
}: { sub?: string; expiraEmSegundos?: number; agora?: number } = {}): string {
  const iat = Math.floor(agora / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ sub, iat, exp: iat + expiraEmSegundos }));
  return `${header}.${payload}.assinatura-falsa`;
}
