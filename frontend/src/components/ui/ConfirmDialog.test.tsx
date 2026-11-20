import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("confirmDisabled desabilita só o botão de confirmar", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog open title="Excluir?" confirmLabel="Excluir" confirmDisabled onConfirm={onConfirm} onCancel={onCancel} />,
    );
    const dialogo = screen.getByRole("dialog", { name: "Excluir?" });
    const confirmar = within(dialogo).getByRole("button", { name: "Excluir" });
    expect(confirmar).toBeDisabled();
    await user.click(confirmar);
    expect(onConfirm).not.toHaveBeenCalled();

    const cancelar = within(dialogo).getByRole("button", { name: "Cancelar" });
    expect(cancelar).toBeEnabled();
    await user.click(cancelar);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clique no fundo (pointerdown e click no próprio <dialog>) cancela", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Excluir?" onConfirm={vi.fn()} onCancel={onCancel} />);
    const dialogo = screen.getByRole("dialog", { name: "Excluir?" });
    fireEvent.pointerDown(dialogo);
    fireEvent.click(dialogo);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("arrastar do campo até o fundo não cancela", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="Excluir?" onConfirm={vi.fn()} onCancel={onCancel}>
        <input aria-label="Confirmação" />
      </ConfirmDialog>,
    );
    const dialogo = screen.getByRole("dialog", { name: "Excluir?" });
    const campo = within(dialogo).getByRole("textbox", { name: "Confirmação" });
    // Seleção de texto: pressiona no campo e solta no fundo → o click cai no <dialog>.
    fireEvent.pointerDown(campo);
    fireEvent.click(dialogo);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
