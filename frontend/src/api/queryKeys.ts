import type { Exercicio } from "@/types/api";

/** Chaves do React Query. Invalide por prefixo (ex.: queryKeys.historico.all). */
export const queryKeys = {
  health: ["health"] as const,
  exercicios: ["exercicios"] as const,
  usuarioMe: ["usuarios", "me"] as const,
  historico: {
    all: ["historico"] as const,
    lista: (exercicio?: Exercicio | null) => ["historico", "lista", exercicio ?? "todos"] as const,
  },
  avaliacao: {
    all: ["avaliacao"] as const,
    detalhe: (id: string) => ["avaliacao", id] as const,
  },
};
