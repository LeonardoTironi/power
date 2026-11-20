import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useSair } from "@/features/auth/useSair";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { cn } from "@/lib/utils";

interface ItemNav {
  to: string;
  rotulo: string;
}

const estiloLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    "font-mono text-sm uppercase tracking-wider transition-colors hover:text-primary",
    isActive ? "text-primary" : "text-foreground/80",
  );

export function Header() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenuRef = useRef<HTMLButtonElement>(null);

  const itens: ItemNav[] = isAuthenticated
    ? [
        { to: "/avaliar", rotulo: "Avaliar" },
        { to: "/historico", rotulo: "Histórico" },
        { to: "/conta", rotulo: "Conta" },
      ]
    : [{ to: "/avaliar", rotulo: "Avaliar" }];

  // Fecha o menu ao navegar (ajuste de estado durante a renderização, sem efeito).
  const [caminhoAnterior, setCaminhoAnterior] = useState(location.pathname);
  if (caminhoAnterior !== location.pathname) {
    setCaminhoAnterior(location.pathname);
    setMenuAberto(false);
  }

  // Esc fecha o menu e devolve o foco ao botão.
  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setMenuAberto(false);
        botaoMenuRef.current?.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  const sairDaConta = useSair();
  const sair = () => {
    setMenuAberto(false);
    sairDaConta();
  };

  const acoesConta = isAuthenticated ? (
    <button type="button" onClick={sair} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <LogOut aria-hidden="true" className="size-4" />
      Sair
    </button>
  ) : (
    <>
      <Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Entrar
      </Link>
      <Link to="/cadastro" className={buttonVariants({ size: "sm" })}>
        Cadastrar
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        {/* Sem aria-label: o nome acessível ("Scouter Power, página inicial") começa pelo texto
            visível (WCAG 2.5.3); o destino fica só para leitores de tela. */}
        <Link to="/" className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-auto w-12 object-cover sm:w-16" />
          <span className="font-display text-xl uppercase tracking-tight sm:text-2xl">
            Scouter <span className="text-primary">Power</span>
            <span className="sr-only">, página inicial</span>
          </span>
        </Link>

        {/* Desktop */}
        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          <ul className="flex items-center gap-6">
            {itens.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={estiloLink}>
                  {item.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            {isAuthenticated && user && (
              <span className="max-w-[12rem] truncate text-sm text-muted-foreground" title={user.email}>
                Olá, {user.nome.split(" ")[0]}
              </span>
            )}
            {acoesConta}
          </div>
        </nav>

        {/* Mobile */}
        <button
          ref={botaoMenuRef}
          type="button"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
          aria-expanded={menuAberto}
          aria-controls="menu-mobile"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          {menuAberto ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>

      <nav
        id="menu-mobile"
        aria-label="Principal (celular)"
        hidden={!menuAberto}
        className="border-t border-border bg-background px-4 pb-6 pt-4 md:hidden"
      >
        <ul className="flex flex-col gap-4">
          {itens.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={estiloLink}>
                {item.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">{acoesConta}</div>
      </nav>
    </header>
  );
}
