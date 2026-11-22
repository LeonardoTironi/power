import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { excluirAvaliacao, obterAvaliacao } from "@/api/avaliacoes";
import { listarExercicios } from "@/api/exercicios";
import { listarHistorico } from "@/api/historico";
import { queryKeys } from "@/api/queryKeys";
import { ROTULOS_EXERCICIO, rotuloExercicio } from "@/lib/format";
import { isApiError } from "@/lib/http";
import type { Exercicio, ExercicioOpcao } from "@/types/api";

export const EXERCICIOS = Object.keys(ROTULOS_EXERCICIO) as Exercicio[];

/** Valida o ?exercicio= da URL; valor desconhecido vira "todos" (null). */
export function exercicioDaUrl(valor: string | null): Exercicio | null {
  return valor && (EXERCICIOS as string[]).includes(valor) ? (valor as Exercicio) : null;
}

/**
 * Exercícios do filtro: o catálogo de GET /exercicios define QUAIS existem (só os que o app
 * conhece); o nome exibido vem sempre de rotuloExercicio() (lib/format), como no resto do app.
 * Enquanto carrega ou se falhar, usa a lista local.
 */
export function useCatalogoExercicios(): ExercicioOpcao[] {
  const { data } = useQuery({
    queryKey: queryKeys.exercicios,
    queryFn: ({ signal }) => listarExercicios(signal),
    staleTime: Infinity,
  });
  const valores = (data ?? []).map((o) => o.valor).filter((valor) => (EXERCICIOS as string[]).includes(valor));
  return (valores.length > 0 ? valores : EXERCICIOS).map((valor) => ({ valor, rotulo: rotuloExercicio(valor) }));
}

export function useHistorico(exercicio: Exercicio | null) {
  return useQuery({
    queryKey: queryKeys.historico.lista(exercicio),
    queryFn: ({ signal }) => listarHistorico(exercicio, signal),
    placeholderData: keepPreviousData,
  });
}

/** `ativa=false` evita buscar de novo a avaliação logo após excluí-la (a query é removida do cache). */
export function useAvaliacao(id: string, ativa = true) {
  return useQuery({
    queryKey: queryKeys.avaliacao.detalhe(id),
    queryFn: ({ signal }) => obterAvaliacao(id, signal),
    enabled: ativa && id !== "",
  });
}

export function useExcluirAvaliacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await excluirAvaliacao(id);
      } catch (erro) {
        // 404: já foi excluída (ex.: em outra aba). O resultado é o mesmo, então é sucesso.
        if (isApiError(erro) && erro.status === 404) return;
        throw erro;
      }
    },
    onSuccess: async (_dados, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.avaliacao.detalhe(id), exact: true });
      await queryClient.invalidateQueries({ queryKey: queryKeys.historico.all });
    },
  });
}
