import type { HTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "erro" | "aviso" | "sucesso";

const estilos: Record<AlertVariant, { classe: string; icone: LucideIcon }> = {
  info: { classe: "border-accent/50 bg-accent/10 [&_svg]:text-accent", icone: Info },
  erro: { classe: "border-destructive/60 bg-destructive/10 [&_svg]:text-destructive", icone: XCircle },
  aviso: { classe: "border-warning/60 bg-warning/10 [&_svg]:text-warning", icone: AlertTriangle },
  sucesso: { classe: "border-success/60 bg-success/10 [&_svg]:text-success", icone: CheckCircle2 },
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertVariant;
  title?: ReactNode;
  /** Ação opcional (ex.: botão "Tentar de novo"). */
  action?: ReactNode;
}

/** Mensagem em destaque. "erro" usa role="alert"; as demais, role="status". */
export function Alert({ variant = "info", title, action, className, children, role, ...props }: AlertProps) {
  const { classe, icone: Icone } = estilos[variant];
  return (
    <div
      role={role ?? (variant === "erro" ? "alert" : "status")}
      className={cn("flex gap-3 border-l-4 p-4 text-sm text-foreground", classe, className)}
      {...props}
    >
      <Icone aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex-1 space-y-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className="text-foreground/85">{children}</div>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
