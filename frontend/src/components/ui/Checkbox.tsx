import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  ref?: Ref<HTMLInputElement>;
}

/** Checkbox nativo estilizado. Use com <FormField orientacao="horizontal"> para rótulo e erro. */
export function Checkbox({ className, ref, ...props }: CheckboxProps) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "mt-0.5 size-5 shrink-0 cursor-pointer rounded-sm border border-input bg-background accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:outline aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-destructive",
        className,
      )}
      {...props}
    />
  );
}
