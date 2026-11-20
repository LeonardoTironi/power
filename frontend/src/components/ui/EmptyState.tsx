import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Ação (ex.: <Link className={buttonVariants()}>Fazer avaliação</Link>). */
  action?: ReactNode;
  /** Nível do título (padrão h2). */
  headingLevel?: "h2" | "h3";
  className?: string;
}

export function EmptyState({ title, description, icon: Icone, action, headingLevel = "h2", className }: EmptyStateProps) {
  const Titulo = headingLevel;
  return (
    <div className={cn("flex flex-col items-center gap-4 border border-dashed border-border px-6 py-12 text-center", className)}>
      {Icone && <Icone aria-hidden="true" className="size-10 text-accent/70" />}
      <Titulo className="font-display text-2xl uppercase italic tracking-tight">{title}</Titulo>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
