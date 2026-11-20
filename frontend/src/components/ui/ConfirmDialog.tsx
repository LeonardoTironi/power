import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" para exclusões. */
  variant?: "primary" | "destructive";
  /** Desabilita os botões e mostra spinner no de confirmar. */
  loading?: boolean;
  /** Desabilita só o botão de confirmar (ex.: até o usuário digitar uma confirmação). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  /** Cancelar, Esc ou clique no fundo. */
  onCancel: () => void;
  children?: ReactNode;
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo de confirmação com <dialog> nativo (modal): foco preso, Esc cancela,
 * foco inicial no botão "Cancelar" e devolvido ao elemento anterior ao fechar.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const anteriorRef = useRef<HTMLElement | null>(null);
  /** O último pointerdown foi no próprio <dialog> (fundo)? Evita fechar ao arrastar uma seleção até o fundo. */
  const pressionouNoFundoRef = useRef(false);
  const tituloId = useId();
  const descricaoId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      anteriorRef.current = document.activeElement as HTMLElement | null;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      cancelarRef.current?.focus();
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      anteriorRef.current?.focus?.();
    }
  }, [open]);

  const aoTeclar = (evento: KeyboardEvent<HTMLDialogElement>) => {
    if (evento.key === "Escape") {
      evento.preventDefault();
      if (!loading) onCancel();
      return;
    }
    if (evento.key !== "Tab") return;
    const focaveis = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? []);
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={tituloId}
      aria-describedby={description ? descricaoId : undefined}
      onKeyDown={aoTeclar}
      onCancel={(evento) => {
        // Esc nativo: mantém o estado controlado pelo pai.
        evento.preventDefault();
        if (!loading) onCancel();
      }}
      onPointerDown={(evento) => {
        pressionouNoFundoRef.current = evento.target === dialogRef.current;
      }}
      onClick={(evento) => {
        const noFundo = pressionouNoFundoRef.current && evento.target === dialogRef.current;
        pressionouNoFundoRef.current = false;
        if (noFundo && !loading) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md border border-border bg-card p-0 text-card-foreground shadow-[0_0_40px_oklch(var(--accent)/0.15)]"
    >
      {open && (
        <div className="space-y-4 p-6">
          <h2 id={tituloId} className="font-display text-2xl uppercase italic tracking-tight">
            {title}
          </h2>
          {description && (
            <div id={descricaoId} className="text-sm text-foreground/80">
              {description}
            </div>
          )}
          {children}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button ref={cancelarRef} variant="ghost" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={variant} onClick={onConfirm} loading={loading} disabled={confirmDisabled}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
