import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { listarHistorico } from "@/api/historico";
import { queryKeys } from "@/api/queryKeys";
import { formatarNumero } from "@/lib/format";
import type { AvaliacaoPublica, HistoricoExercicio } from "@/types/api";
import type { AvaliacaoFormSaida, AvaliacaoFormValores } from "./schema";

/** Campos do perfil que podem vir da última avaliação salva. */
export const CAMPOS_PERFIL = ["idade", "sexo", "massa_corporal_kg", "estatura_m"] as const;
type CampoPerfil = (typeof CAMPOS_PERFIL)[number];

/** Avaliação mais recente do histórico (todos os exercícios). */
export function ultimaAvaliacao(grupos: HistoricoExercicio[]): AvaliacaoPublica | null {
  let ultima: AvaliacaoPublica | null = null;
  for (const avaliacao of grupos.flatMap((g) => g.avaliacoes)) {
    if (!ultima || new Date(avaliacao.criado_em).getTime() > new Date(ultima.criado_em).getTime()) {
      ultima = avaliacao;
    }
  }
  return ultima;
}

/** Valores do perfil como texto do formulário (pt-BR). Estatura ausente fica de fora. */
export function perfilDaAvaliacao(avaliacao: AvaliacaoPublica): Partial<Record<CampoPerfil, string>> {
  const perfil: Partial<Record<CampoPerfil, string>> = {
    idade: String(avaliacao.idade),
    sexo: avaliacao.sexo,
    massa_corporal_kg: formatarNumero(avaliacao.massa_corporal_kg),
  };
  if (avaliacao.estatura_m != null) perfil.estatura_m = avaliacao.estatura_m.toFixed(2).replace(".", ",");
  return perfil;
}

/**
 * Usuário logado: preenche idade, sexo, massa corporal e estatura com a última avaliação salva.
 * O usuário não guarda esses dados (RNF05, minimização), então a fonte é o histórico (RF09).
 * Só preenche campos vazios que o usuário ainda não tocou, e uma vez por sessão de login.
 * Retorna true se algum campo foi preenchido.
 */
export function usePerfilSalvo(
  form: UseFormReturn<AvaliacaoFormValores, unknown, AvaliacaoFormSaida>,
  autenticado: boolean,
): boolean {
  const queryClient = useQueryClient();
  const [preenchido, setPreenchido] = useState(false);

  useEffect(() => {
    if (!autenticado) return;
    let ativo = true;
    // Busca única (sem observar a query): salvar uma avaliação não reaplica o preenchimento.
    queryClient
      .fetchQuery({
        queryKey: queryKeys.historico.lista(null),
        queryFn: ({ signal }) => listarHistorico(null, signal),
      })
      .then((grupos) => {
        const ultima = ativo ? ultimaAvaliacao(grupos) : null;
        if (!ultima) return;
        let algum = false;
        for (const [campo, valor] of Object.entries(perfilDaAvaliacao(ultima)) as [CampoPerfil, string][]) {
          if (form.getValues(campo) !== "" || form.getFieldState(campo).isDirty) continue;
          // resetField: vira o valor padrão do campo, sem marcá-lo como editado.
          form.resetField(campo, { defaultValue: valor });
          algum = true;
        }
        setPreenchido(algum);
      })
      // Sem histórico (rede, sessão expirada): o formulário segue em branco.
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [autenticado, form, queryClient]);

  return autenticado && preenchido;
}
