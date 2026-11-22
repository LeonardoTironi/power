import { Skeleton } from "@/components/ui/Skeleton";

/** Placeholder do histórico; anuncia o carregamento para leitores de tela. */
export function HistoricoSkeleton({ rotulo = "Carregando histórico…" }: { rotulo?: string }) {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="sr-only">
        {rotulo}
      </p>
      {[0, 1].map((i) => (
        <div key={i} className="space-y-4 border border-border p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
        </div>
      ))}
    </div>
  );
}
