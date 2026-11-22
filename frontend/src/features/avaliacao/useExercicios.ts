import { useQuery } from "@tanstack/react-query";
import { listarExercicios } from "@/api/exercicios";
import { queryKeys } from "@/api/queryKeys";

/** Catálogo de exercícios (GET /exercicios). Muda raramente: cache longo. */
export function useExercicios() {
  return useQuery({
    queryKey: queryKeys.exercicios,
    queryFn: ({ signal }) => listarExercicios(signal),
    staleTime: 60 * 60_000,
  });
}
