import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variantes: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground font-display uppercase italic tracking-wide skew-x-[-12deg] hover:scale-105 active:scale-95 shadow-[0_0_40px_oklch(var(--primary)/0.3)]",
  outline:
    "border-2 border-foreground text-foreground font-display uppercase italic tracking-wide skew-x-[-12deg] hover:bg-foreground hover:text-background",
  ghost: "border border-accent font-mono uppercase tracking-wider text-accent hover:bg-accent/10",
  destructive:
    "bg-destructive-strong text-destructive-foreground font-display uppercase italic tracking-wide skew-x-[-12deg] hover:brightness-110 active:scale-95",
  link: "text-accent underline-offset-4 hover:underline",
};

const tamanhos: Record<ButtonSize, string> = {
  sm: "min-h-9 px-4 py-1.5 text-sm",
  md: "min-h-11 px-6 py-2.5 text-base",
  lg: "min-h-14 px-10 py-4 text-xl",
  icon: "size-11 p-0",
};

/** Classes do Button, para aplicar também em <Link> (ex.: <Link className={buttonVariants()} />). */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(base, variantes[variant], variant !== "link" && tamanhos[size], className);
}
