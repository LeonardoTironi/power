import { useEffect } from "react";

export const NOME_APP = "Scouter Power";

/** Título da página inicial (o mesmo do index.html). */
export const TITULO_INICIAL = `${NOME_APP} · Descubra seu nível de força`;

/** "<Página> · Scouter Power"; sem página, o título da inicial. */
export function tituloPagina(pagina?: string): string {
  return pagina ? `${pagina} · ${NOME_APP}` : TITULO_INICIAL;
}

/** Define o document.title da página atual (padrão "<Página> · Scouter Power"). */
export function useTituloPagina(pagina?: string): void {
  const titulo = tituloPagina(pagina);
  useEffect(() => {
    document.title = titulo;
  }, [titulo]);
}
