import { AvaliacaoFluxo } from "@/features/avaliacao/AvaliacaoFluxo";
import { useTituloPagina } from "@/lib/useTituloPagina";

export function AvaliacaoPage() {
  useTituloPagina("Avaliar minha força");

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <header className="mb-8 space-y-3">
        <h1 className="font-display text-4xl uppercase italic tracking-tight md:text-5xl">Avaliar minha força</h1>
        <p className="max-w-2xl text-foreground/70">
          Preencha seus dados e uma série que você fez. Calculamos seu 1RM estimado e seu nível de força.
        </p>
      </header>
      <AvaliacaoFluxo />
    </section>
  );
}
