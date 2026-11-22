import type { ReactNode } from "react";

interface HeroScouterProps {
  /** Ações principais (links estilizados como botão). */
  acoes?: ReactNode;
  /** Linha discreta abaixo das ações (ex.: status do serviço). */
  rodape?: ReactNode;
}

/** Hero com a identidade "scouter" do protótipo original. */
export function HeroScouter({ acoes, rodape }: HeroScouterProps) {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-[320px] -translate-x-1/2 -translate-y-1/2 animate-aura-pulse rounded-full bg-primary/20 sm:size-[600px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-[220px] -translate-x-1/2 -translate-y-1/2 animate-aura-pulse-slow rounded-full bg-ki-gold/10 sm:size-[400px]"
      />

      <div className="relative z-10 max-w-4xl text-center">
        <h1
          id="hero-titulo"
          className="mb-6 inline-block rounded-sm border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.3em] text-accent"
        >
          Scouter Power
        </h1>
        <p className="mb-6 animate-reveal-up font-display text-5xl uppercase italic leading-[0.85] tracking-tighter sm:text-7xl md:text-8xl">
          Descubra seu <br />
          <span className="bg-gradient-to-b from-primary to-ki-gold bg-clip-text text-transparent">nível de força</span>
        </p>
        <p className="mx-auto mb-10 max-w-2xl animate-reveal-up-delay-1 text-balance text-lg text-foreground/75 md:text-xl">
          Informe a carga e as repetições de uma série e descubra seu 1RM estimado e se você está no nível iniciante,
          intermediário ou avançado.
        </p>
        {acoes && (
          <div className="flex animate-reveal-up-delay-2 flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
            {acoes}
          </div>
        )}
        {rodape && <div className="mt-8">{rodape}</div>}
      </div>

      <div aria-hidden="true" className="absolute bottom-10 left-10 hidden font-mono text-xs text-accent/70 lg:block">
        <div>COORD: 35.21.009</div>
        <div>STATUS: OVERLOAD</div>
        <div className="mt-1 h-1 w-32 bg-accent/20">
          <div className="h-full w-3/4 animate-pulse bg-accent" />
        </div>
      </div>
    </section>
  );
}
