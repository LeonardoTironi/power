import { useId } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { ROTULOS_SEXO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Sexo } from "@/types/api";

interface CampoSexoProps {
  registro: UseFormRegisterReturn<"sexo">;
  error?: string;
  hint?: string;
}

const OPCOES: Sexo[] = ["m", "f"];

/** Grupo de rádios (fieldset + legend) no visual dos campos; erro anunciado com role="alert". */
export function CampoSexo({ registro, error, hint }: CampoSexoProps) {
  const base = useId();
  const hintId = hint ? `${base}-dica` : undefined;
  const erroId = error ? `${base}-erro` : undefined;
  const describedBy = [hintId, erroId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 block font-mono text-xs uppercase tracking-widest text-accent">Sexo</legend>
      <div className="grid grid-cols-2 gap-3">
        {OPCOES.map((valor) => (
          <label
            key={valor}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 border border-input bg-background px-4 py-3 font-mono text-sm transition-colors",
              "hover:border-primary/70 has-[:checked]:border-primary has-[:checked]:bg-primary/10",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
              error && "border-destructive",
            )}
          >
            <input
              type="radio"
              value={valor}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              aria-required="true"
              className="size-4 accent-primary"
              {...registro}
            />
            {ROTULOS_SEXO[valor]}
          </label>
        ))}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={erroId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
