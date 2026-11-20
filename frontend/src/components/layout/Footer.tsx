import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
        <div className="flex flex-col gap-2 text-center md:text-left">
          <div className="font-display text-xl uppercase italic tracking-widest">Scouter Power</div>
          <p className="max-w-md text-xs text-foreground/60">
            Resultado informativo: a classificação e a estimativa de 1RM não substituem avaliação física
            profissional nem orientação médica.
          </p>
          <Link to="/termos" className="text-xs text-accent underline-offset-4 hover:underline">
            Termos de uso e privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
