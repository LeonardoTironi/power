import { useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

const PALAVRA_CONFIRMACAO = "EXCLUIR";

interface ExcluirContaDialogProps {
  open: boolean;
  /** E-mail do usuário (aceito como alternativa a "EXCLUIR"). */
  email?: string;
  loading: boolean;
  /** Mensagem de erro da exclusão (exibida no diálogo). */
  erro?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function confirmacaoValida(texto: string, email?: string): boolean {
  const valor = texto.trim();
  if (valor === PALAVRA_CONFIRMACAO) return true;
  return email ? valor.toLowerCase() === email.trim().toLowerCase() : false;
}

/**
 * Confirmação destrutiva da exclusão da conta (RNF05). Exige digitar "EXCLUIR" ou o e-mail.
 * O botão de confirmar fica desabilitado até a confirmação ser válida; a validação no clique
 * (e no Enter do campo) continua como defesa, com mensagem no campo e foco nele.
 */
export function ExcluirContaDialog({ open, email, loading, erro, onConfirm, onCancel }: ExcluirContaDialogProps) {
  const [texto, setTexto] = useState("");
  const [erroCampo, setErroCampo] = useState<string | undefined>();
  const campoId = useId();

  const fechar = () => {
    setTexto("");
    setErroCampo(undefined);
    onCancel();
  };

  const confirmar = () => {
    if (!confirmacaoValida(texto, email)) {
      setErroCampo(`Digite ${PALAVRA_CONFIRMACAO}${email ? " ou o seu e-mail" : ""} para confirmar.`);
      document.getElementById(campoId)?.focus();
      return;
    }
    setErroCampo(undefined);
    onConfirm();
  };

  return (
    <ConfirmDialog
      open={open}
      variant="destructive"
      title="Excluir conta?"
      description={
        <p>
          Esta ação apaga <strong>a sua conta e todas as suas avaliações</strong> de forma permanente. Não é possível
          desfazer nem recuperar os dados depois.
        </p>
      }
      confirmLabel="Excluir definitivamente"
      cancelLabel="Cancelar"
      loading={loading}
      confirmDisabled={!confirmacaoValida(texto, email)}
      onConfirm={confirmar}
      onCancel={fechar}
    >
      <div className="space-y-4">
        {erro && <Alert variant="erro">{erro}</Alert>}
        <FormField
          id={campoId}
          label={`Digite ${PALAVRA_CONFIRMACAO} para confirmar`}
          hint={email ? `Você também pode digitar o seu e-mail (${email}).` : undefined}
          error={erroCampo}
        >
          <Input
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={texto}
            disabled={loading}
            onChange={(evento) => {
              setTexto(evento.target.value);
              if (erroCampo) setErroCampo(undefined);
            }}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                evento.preventDefault();
                if (!loading) confirmar();
              }
            }}
          />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}
