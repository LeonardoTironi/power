import { Suspense, useEffect, useRef } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { CarregandoPagina } from "@/app/CarregandoPagina";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { SkipLink } from "./SkipLink";

/**
 * Ao trocar de página (mudança de pathname, não da query string), leva o foco ao h1 da
 * nova página (ou ao <main>) e anuncia o título numa região aria-live, como faria uma
 * navegação tradicional. A primeira carga fica com o comportamento padrão do navegador.
 * Devolve as refs do <main> e da região de anúncio.
 */
function useFocoAoNavegar() {
  const { pathname } = useLocation();
  const anterior = useRef(pathname);
  const mainRef = useRef<HTMLElement>(null);
  const anuncioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (anterior.current === pathname) return;
    anterior.current = pathname;

    const conteudo = mainRef.current;
    if (!conteudo) return;
    // A própria página já pôs o foco em algo dela (efeitos dos filhos rodam antes): respeita.
    const ativo = document.activeElement;
    if (!(ativo && ativo !== conteudo && conteudo.contains(ativo))) {
      const alvo = conteudo.querySelector<HTMLElement>("h1") ?? conteudo;
      if (!alvo.hasAttribute("tabindex")) {
        alvo.setAttribute("tabindex", "-1");
        alvo.classList.add("focus:outline-none");
      }
      // A posição de rolagem fica com o ScrollRestoration.
      alvo.focus({ preventScroll: true });
    }

    // document.title já foi atualizado pelo useTituloPagina da página (efeito do filho).
    if (anuncioRef.current) anuncioRef.current.textContent = document.title;
  }, [pathname]);

  return { mainRef, anuncioRef };
}

export function AppLayout() {
  const { mainRef, anuncioRef } = useFocoAoNavegar();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background font-body text-foreground">
      <SkipLink />
      <Header />
      <main ref={mainRef} id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<CarregandoPagina />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <div ref={anuncioRef} data-testid="anuncio-rota" aria-live="polite" aria-atomic="true" className="sr-only" />
      <ScrollRestoration />
    </div>
  );
}
