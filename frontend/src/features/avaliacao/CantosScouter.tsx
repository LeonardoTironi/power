import { cn } from "@/lib/utils";

/** Cantos decorativos do cartão "scouter". `destaque` troca o acento pelo primário. */
export function CantosScouter({ destaque = false }: { destaque?: boolean }) {
  const cor = destaque ? "border-primary" : "border-accent";
  const base = "pointer-events-none absolute h-8 w-8 transition-colors duration-500";
  return (
    <>
      <span aria-hidden="true" className={cn(base, "left-0 top-0 border-l-2 border-t-2", cor)} />
      <span aria-hidden="true" className={cn(base, "right-0 top-0 border-r-2 border-t-2", cor)} />
      <span aria-hidden="true" className={cn(base, "bottom-0 left-0 border-b-2 border-l-2", cor)} />
      <span aria-hidden="true" className={cn(base, "bottom-0 right-0 border-b-2 border-r-2", cor)} />
    </>
  );
}
