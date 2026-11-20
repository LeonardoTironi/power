import { rotuloNivel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NivelForca } from "@/types/api";

const estilos: Record<NivelForca, string> = {
  iniciante: "border-accent/50 bg-accent/10 text-accent",
  intermediario: "border-primary/50 bg-primary/10 text-primary",
  avancado: "border-ki-gold/60 bg-ki-gold/15 text-ki-gold",
};

export function NivelBadge({ nivel, className }: { nivel: NivelForca; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-0.5 font-mono text-xs uppercase tracking-widest",
        estilos[nivel],
        className,
      )}
    >
      {rotuloNivel(nivel)}
    </span>
  );
}
