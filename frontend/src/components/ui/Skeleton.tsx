import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Bloco de carregamento (decorativo). Anuncie o carregamento com um Spinner ou aria-busy no contêiner. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("animate-pulse bg-muted", className)} {...props} />;
}
