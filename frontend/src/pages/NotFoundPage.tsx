import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { useTituloPagina } from "@/lib/useTituloPagina";

export function NotFoundPage() {
  useTituloPagina("Página não encontrada");

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-6 px-6 py-24 text-center">
      <p aria-hidden="true" className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        Erro 404 — sinal perdido
      </p>
      <h1 className="font-display text-5xl uppercase italic tracking-tight">Página não encontrada</h1>
      <p className="text-foreground/70">O endereço acessado não existe ou foi removido.</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link to="/" className={buttonVariants()}>
          Ir para o início
        </Link>
        <Link to="/avaliar" className={buttonVariants({ variant: "outline" })}>
          Avaliar minha força
        </Link>
      </div>
    </section>
  );
}
