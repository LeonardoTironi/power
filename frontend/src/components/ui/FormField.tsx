import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./Label";

interface ControleProps {
  id?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  "aria-required"?: boolean | "true" | "false";
}

export interface FormFieldProps {
  label: ReactNode;
  /** Um único controle (Input, Select, Checkbox, textarea…). Recebe id/aria-* injetados. */
  children: ReactElement<ControleProps>;
  /** Mensagem de erro (ex.: errors.idade?.message ou ApiError.fieldErrors.idade). */
  error?: string;
  /** Dica exibida abaixo do controle (ex.: faixa aceita). */
  hint?: ReactNode;
  /** Mostra "*" e marca aria-required. */
  required?: boolean;
  /** id do controle; gerado se omitido (ou usa o id que o controle já tiver). */
  id?: string;
  /** "horizontal": controle antes do rótulo (checkbox). */
  orientacao?: "vertical" | "horizontal";
  className?: string;
}

export function FormField({
  label,
  children,
  error,
  hint,
  required = false,
  id,
  orientacao = "vertical",
  className,
}: FormFieldProps) {
  const gerado = useId();
  const controleId = id ?? children.props.id ?? `campo-${gerado}`;
  const hintId = hint ? `${controleId}-dica` : undefined;
  const erroId = error ? `${controleId}-erro` : undefined;
  const describedBy = [children.props["aria-describedby"], hintId, erroId].filter(Boolean).join(" ") || undefined;

  const controle = isValidElement(children)
    ? cloneElement(children, {
        id: controleId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        ...(required ? { "aria-required": true } : {}),
      })
    : children;

  const rotulo = (
    <Label htmlFor={controleId} className={cn(orientacao === "horizontal" && "normal-case tracking-normal font-body text-sm text-foreground")}>
      {label}
      {required && (
        <span aria-hidden="true" className="ml-1 text-primary">
          *
        </span>
      )}
    </Label>
  );

  return (
    <div className={cn("space-y-2", className)}>
      {orientacao === "horizontal" ? (
        <div className="flex items-start gap-3">
          {controle}
          {rotulo}
        </div>
      ) : (
        <>
          {rotulo}
          {controle}
        </>
      )}
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
    </div>
  );
}
