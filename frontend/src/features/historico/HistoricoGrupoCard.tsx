import { useId } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { NivelBadge } from "@/components/domain/NivelBadge";
import { Card } from "@/components/ui/Card";
import { formatarData, formatarKg } from "@/lib/format";
import type { AvaliacaoPublica, HistoricoExercicio } from "@/types/api";
import { GraficoEvolucao } from "./GraficoEvolucao";
import { rotuloRepeticoes } from "./rotulos";
import { VariacaoRm1 } from "./VariacaoRm1";

export const MENSAGEM_UMA_AVALIACAO = "Faça outra avaliação deste exercício para ver sua evolução";

function ordenarCrescente(avaliacoes: AvaliacaoPublica[]): AvaliacaoPublica[] {
  return [...avaliacoes].sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());
}

interface HistoricoGrupoCardProps {
  grupo: HistoricoExercicio;
  nomeExercicio: string;
}

export function HistoricoGrupoCard({ grupo, nomeExercicio }: HistoricoGrupoCardProps) {
  const tituloId = useId();
  const listaId = useId();
  const crescente = ordenarCrescente(grupo.avaliacoes);
  const recentesPrimeiro = [...crescente].reverse();
  const ultima = crescente[crescente.length - 1];
  const total = crescente.length;
  const variacao =
    total >= 2
      ? (grupo.variacao_rm1_kg ??
        Math.round((ultima.rm1_estimado_kg - crescente[0].rm1_estimado_kg) * 10) / 10)
      : null;

  if (!ultima) return null;

  return (
    <Card cantos>
      <section aria-labelledby={tituloId} className="space-y-6 p-5 sm:p-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={tituloId} className="font-display text-3xl uppercase italic tracking-tight">
            {nomeExercicio}
          </h2>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {total} {total === 1 ? "avaliação" : "avaliações"}
          </p>
        </header>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="font-mono text-xs uppercase tracking-widest text-accent">Último 1RM</dt>
            <dd className="flex flex-wrap items-center gap-3">
              <span className="font-display text-3xl italic">{formatarKg(ultima.rm1_estimado_kg)}</span>
              <NivelBadge nivel={ultima.nivel} />
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-mono text-xs uppercase tracking-widest text-accent">Variação do 1RM</dt>
            <dd>
              {variacao !== null ? (
                <VariacaoRm1 valor={variacao} />
              ) : (
                <span className="text-sm text-foreground/80">{MENSAGEM_UMA_AVALIACAO}</span>
              )}
            </dd>
          </div>
        </dl>

        {total >= 2 && (
          <div className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-widest text-accent">Evolução do 1RM</h3>
            <GraficoEvolucao avaliacoes={crescente} nomeExercicio={nomeExercicio} />
          </div>
        )}

        <div className="space-y-2">
          <h3 id={listaId} className="font-mono text-xs uppercase tracking-widest text-accent">
            Avaliações (mais recentes primeiro)
          </h3>
          <ol aria-labelledby={listaId} className="divide-y divide-border border-y border-border">
            {recentesPrimeiro.map((a) => (
              <li key={a.id}>
                {/* Sem aria-label: o nome acessível é o próprio texto visível (WCAG 2.5.3),
                    "15/11/2026, 90 kg × 6 repetições, 1RM 105 kg, nível Intermediário"; as
                    vírgulas e "nível" ficam só para leitores de tela. */}
                <Link
                  to={`/historico/${a.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 text-sm transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Os {" "} entre os itens flex não aparecem na tela, mas separam as partes do nome. */}
                  <span className="min-w-[6.5rem] font-mono">
                    {formatarData(a.criado_em)}
                    <span className="sr-only">,</span>
                  </span>{" "}
                  <span className="min-w-[10rem]">
                    {formatarKg(a.carga_kg)} × {rotuloRepeticoes(a.repeticoes)}
                    <span className="sr-only">,</span>
                  </span>{" "}
                  <span className="min-w-[7rem] font-bold">
                    1RM {formatarKg(a.rm1_estimado_kg)}
                    <span className="sr-only">,</span>
                  </span>{" "}
                  <span className="sr-only">nível</span> <NivelBadge nivel={a.nivel} />
                  <ChevronRight aria-hidden="true" className="ml-auto size-4 text-accent" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </Card>
  );
}
