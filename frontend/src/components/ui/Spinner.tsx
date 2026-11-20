import { cn } from "@/lib/utils";

interface SpinnerProps {
  /** Texto para leitores de tela (padrão "Carregando…"). */
  label?: string;
  /** Sem role/texto (ex.: dentro de um botão que já tem aria-busy). */
  decorativo?: boolean;
  className?: string;
}

export function Spinner({ label = "Carregando…", decorativo = false, className }: SpinnerProps) {
  const icone = (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-6 animate-spin text-accent", className)}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
  if (decorativo) return icone;
  return (
    <span role="status" className="inline-flex items-center gap-3">
      {icone}
      <span className="sr-only">{label}</span>
    </span>
  );
}
