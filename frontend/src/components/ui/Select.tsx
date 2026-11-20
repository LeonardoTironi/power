import type { Ref, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { estiloCampo } from "./Input";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Opções; alternativa a passar <option> como children. */
  options?: SelectOption[];
  /** Primeira opção vazia (value=""), ex.: "Selecione…". */
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ className, options, placeholder, children, ref, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(estiloCampo, "appearance-none pr-10", className)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options?.map((opcao) => (
          <option key={opcao.value} value={opcao.value} disabled={opcao.disabled}>
            {opcao.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-accent"
      />
    </div>
  );
}
