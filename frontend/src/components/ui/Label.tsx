import type { LabelHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  ref?: Ref<HTMLLabelElement>;
}

export function Label({ className, ref, ...props }: LabelProps) {
  return (
    <label
      ref={ref}
      className={cn("block font-mono text-xs uppercase tracking-widest text-accent", className)}
      {...props}
    />
  );
}
