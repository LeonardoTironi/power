import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export const estiloCampo =
  "flex w-full min-h-11 bg-background border border-input px-4 py-3 font-mono text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:ring-destructive";

export function Input({ className, type = "text", ref, ...props }: InputProps) {
  return <input ref={ref} type={type} className={cn(estiloCampo, className)} {...props} />;
}
