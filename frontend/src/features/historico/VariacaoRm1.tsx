import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatarVariacaoKg } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Variação do 1RM com ícone e texto (não depende só da cor). */
export function VariacaoRm1({ valor, className }: { valor: number; className?: string }) {
  const tipo = valor > 0 ? "positiva" : valor < 0 ? "negativa" : "zero";
  const Icone = tipo === "positiva" ? TrendingUp : tipo === "negativa" ? TrendingDown : Minus;
  const texto =
    tipo === "positiva"
      ? "aumento desde a primeira avaliação"
      : tipo === "negativa"
        ? "queda desde a primeira avaliação"
        : "sem variação desde a primeira avaliação";
  return (
    <span
      data-variacao={tipo}
      className={cn(
        "inline-flex flex-wrap items-center gap-x-2 gap-y-1",
        tipo === "positiva" && "text-success",
        tipo === "negativa" && "text-destructive",
        tipo === "zero" && "text-muted-foreground",
        className,
      )}
    >
      <Icone aria-hidden="true" className="size-5 shrink-0" />
      <span className="font-mono text-lg font-bold">{formatarVariacaoKg(valor)}</span>
      <span className="text-sm text-foreground/80">({texto})</span>
    </span>
  );
}
