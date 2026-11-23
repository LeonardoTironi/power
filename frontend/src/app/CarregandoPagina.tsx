import { Spinner } from "@/components/ui/Spinner";

/** Fallback enquanto uma página lazy carrega. */
export function CarregandoPagina() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label="Carregando página…" />
    </div>
  );
}
