import { useEffect, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { criarAvaliacao } from "@/api/avaliacoes";
import { queryKeys } from "@/api/queryKeys";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { MENSAGEM_SESSAO_EXPIRADA } from "@/features/auth/AuthContext";
import { useAuth } from "@/features/auth/useAuth";
import { isApiError } from "@/lib/http";
import type { AvaliacaoEntrada, AvaliacaoResultado } from "@/types/api";
import { descreverFalha } from "./erros";
import { FormularioAvaliacao } from "./FormularioAvaliacao";
import { ResultadoAvaliacao, type SituacaoHistorico } from "./ResultadoAvaliacao";
import {
  avaliacaoSchema,
  ehCampoAvaliacao,
  MENSAGENS,
  ORDEM_CAMPOS,
  paraEntrada,
  VALORES_INICIAIS,
  type AvaliacaoFormSaida,
  type AvaliacaoFormValores,
  type CampoAvaliacao,
} from "./schema";
import { useExercicios } from "./useExercicios";
import { usePerfilSalvo } from "./usePerfilSalvo";

interface Envio {
  entrada: AvaliacaoEntrada;
  /** Havia sessão ao enviar (para distinguir anônimo de sessão expirada). */
  autenticado: boolean;
}

interface Concluida {
  resultado: AvaliacaoResultado;
  situacao: SituacaoHistorico;
}

function primeiroComErro(campos: Iterable<string>): CampoAvaliacao | undefined {
  const comErro = new Set(campos);
  return ORDEM_CAMPOS.find((campo) => comErro.has(campo));
}

/** Formulário → POST /avaliacoes → resultado, na mesma rota e sem recarregar. */
export function AvaliacaoFluxo() {
  const { isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();
  const exercicios = useExercicios();
  const [concluida, setConcluida] = useState<Concluida | null>(null);
  /** Campo a focar quando o formulário voltar a ser exibido. */
  const focoAoVoltar = useRef<CampoAvaliacao | null>(null);
  /** O envio anterior estourou o tempo: o servidor pode ter gravado a avaliação depois. */
  const houveTimeout = useRef(false);

  const form = useForm<AvaliacaoFormValores, unknown, AvaliacaoFormSaida>({
    resolver: zodResolver(avaliacaoSchema),
    defaultValues: VALORES_INICIAIS,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });
  const { setError, setFocus, handleSubmit } = form;
  const perfilPreenchido = usePerfilSalvo(form, isAuthenticated);

  const mutation = useMutation({
    mutationFn: ({ entrada }: Envio) => criarAvaliacao(entrada),
    onSuccess: (resultado, { autenticado }) => {
      const situacao: SituacaoHistorico = resultado.id ? "salva" : autenticado ? "sessao-expirada" : "anonima";
      setConcluida({ resultado, situacao });
      // Token recusado pelo servidor (avaliação anônima apesar do Bearer): desloga, senão
      // "Entrar para salvar" → /login volta para cá (isAuthenticated continuaria true).
      if (situacao === "sessao-expirada") logout({ mensagem: MENSAGEM_SESSAO_EXPIRADA });
    },
    onSettled: (resultado, erro, { autenticado }) => {
      const timeout = isApiError(erro) && erro.kind === "timeout";
      // Gravou agora, pode ter gravado (timeout) ou pode ter gravado no envio anterior.
      if (resultado?.id || (autenticado && timeout) || houveTimeout.current) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.historico.all });
      }
      houveTimeout.current = autenticado && timeout;
    },
    onError: (erro) => {
      if (!isApiError(erro) || erro.status !== 422) return;
      const campos = Object.entries(erro.fieldErrors).filter(([campo]) => ehCampoAvaliacao(campo));
      for (const [campo, mensagem] of campos) {
        setError(campo as CampoAvaliacao, { type: "server", message: mensagem });
      }
      const primeiro = primeiroComErro(campos.map(([campo]) => campo));
      if (primeiro) setFocus(primeiro);
    },
  });

  const aoValidar = (saida: AvaliacaoFormSaida) => {
    // RF02: só aceita exercícios do catálogo carregado.
    const catalogo = exercicios.data?.map((opcao) => opcao.valor) ?? [];
    if (!catalogo.includes(saida.exercicio)) {
      setError("exercicio", { type: "catalogo", message: MENSAGENS.exercicio });
      setFocus("exercicio");
      return;
    }
    mutation.mutate({ entrada: paraEntrada(saida), autenticado: isAuthenticated });
  };

  const aoInvalidar = (erros: FieldErrors<AvaliacaoFormValores>) => {
    const primeiro = primeiroComErro(Object.keys(erros));
    if (primeiro) setFocus(primeiro);
  };

  const enviar = handleSubmit(aoValidar, aoInvalidar);

  const voltarAoFormulario = (foco: CampoAvaliacao) => {
    mutation.reset();
    focoAoVoltar.current = foco;
    setConcluida(null);
  };

  useEffect(() => {
    if (concluida || !focoAoVoltar.current) return;
    setFocus(focoAoVoltar.current);
    focoAoVoltar.current = null;
  }, [concluida, setFocus]);

  if (concluida) {
    return (
      <ResultadoAvaliacao
        resultado={concluida.resultado}
        situacao={concluida.situacao}
        onNovaAvaliacao={() => voltarAoFormulario("exercicio")}
        onEditarDados={() => voltarAoFormulario("idade")}
      />
    );
  }

  const erroApi = mutation.error;
  const temErrosDeCampo = isApiError(erroApi) && erroApi.status === 422 && Object.keys(erroApi.fieldErrors).some(ehCampoAvaliacao);
  const falha =
    erroApi && !temErrosDeCampo ? descreverFalha(erroApi, { autenticado: mutation.variables?.autenticado }) : null;

  return (
    <FormularioAvaliacao
      form={form}
      onSubmit={(evento) => void enviar(evento)}
      enviando={mutation.isPending}
      perfilPreenchido={perfilPreenchido}
      falha={
        falha && (
          <Alert
            variant="erro"
            title={falha.titulo}
            action={
              <Button variant="ghost" size="sm" onClick={() => void enviar()} loading={mutation.isPending}>
                Tentar novamente
              </Button>
            }
          >
            {falha.mensagem} {falha.indisponivel && "Seus dados foram mantidos; tente novamente em instantes."}
          </Alert>
        )
      }
    />
  );
}
