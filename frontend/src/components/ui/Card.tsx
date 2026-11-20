import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Cantos decorativos do tema scouter. */
  cantos?: boolean;
}

export function Card({ className, cantos = false, children, ...props }: CardProps) {
  return (
    <div className={cn("relative border border-border bg-card text-card-foreground", className)} {...props}>
      {cantos && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 size-6 border-l-2 border-t-2 border-accent" />
          <span aria-hidden="true" className="pointer-events-none absolute right-0 top-0 size-6 border-r-2 border-t-2 border-accent" />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 size-6 border-b-2 border-l-2 border-accent" />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 size-6 border-b-2 border-r-2 border-accent" />
        </>
      )}
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 p-6 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-display text-2xl uppercase italic tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center gap-4 p-6 pt-0", className)} {...props} />;
}
