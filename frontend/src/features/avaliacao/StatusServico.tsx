import { useQuery } from "@tanstack/react-query";
import { obterHealth } from "@/api/sistema";
import { queryKeys } from "@/api/queryKeys";
import { cn } from "@/lib/utils";

/** Status discreto de GET /health (não bloqueia nada). */
export function StatusServico() {
  const health = useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => obterHealth(signal),
    retry: false,
    staleTime: 60_000,
  });

  if (health.isPending) return null;

  const online = health.isSuccess && health.data.modelo_carregado;
  const texto = online ? "Serviço online" : "Serviço indisponível no momento";

  return (
    <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-foreground/50">
      <span aria-hidden="true" className={cn("size-2 rounded-full", online ? "bg-success" : "bg-warning")} />
      {texto}
    </p>
  );
}
