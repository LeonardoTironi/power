import { formatarNumero } from "@/lib/format";

/** "1 repetição", "6 repetições": por extenso, para o texto visível ser também o nome acessível. */
export function rotuloRepeticoes(repeticoes: number): string {
  return `${formatarNumero(repeticoes)} ${repeticoes === 1 ? "repetição" : "repetições"}`;
}
