import type { ButtonHTMLAttributes, Ref } from "react";
import { buttonVariants, type ButtonSize, type ButtonVariant } from "./buttonVariants";
import { Spinner } from "./Spinner";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mostra spinner, desabilita o botão e marca aria-busy. */
  loading?: boolean;
  /** Texto exibido durante o loading (padrão: o próprio conteúdo). */
  loadingText?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  disabled,
  type = "button",
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner decorativo className="size-4" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
