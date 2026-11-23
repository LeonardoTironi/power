import type { ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { HistoricoGrupoCard } from "@/features/historico/HistoricoGrupoCard";
import { HistoricoSkeleton } from "@/features/historico/HistoricoSkeleton";
import { exercicioDaUrl, useCatalogoExercicios, useHistorico } from "@/features/historico/queries";
import { isApiError } from "@/lib/http";
import { rotuloExercicio } from "@/lib/format";
import { useTituloPagina } from "@/lib/useTituloPagina";

export function HistoricoPage() {
  const [params, setParams] = useSearchParams();
  const exercicio = exercicioDaUrl(params.get("exercicio"));
  const catalogo = useCatalogoExercicios();
  const historico = useHistorico(exercicio);

  useTituloPagina("Histórico");

  const aoFiltrar = (evento: ChangeEvent<HTMLSelectElement>) => {
    const valor = exercicioDaUrl(evento.target.value);
    setParams(
      (atual) => {
        const novo = new URLSearchParams(atual);
        if (valor) novo.set("exercicio", valor);
        else novo.delete("exercicio");
        return novo;
      },
      { replace: true },
    );
  };

  let conteudo;
  if (historico.isPending) {
    conteudo = <HistoricoSkeleton />;
  } else if (historico.isError) {
    conteudo = (
      <Alert
        variant="erro"
        title="Não foi possível carregar o histórico."
        action={
          <Button variant="ghost" size="sm" onClick={() => void historico.refetch()} loading={historico.isFetching}>
            Tentar novamente
          </Button>
        }
      >
        {isApiError(historico.error) ? historico.error.detail : "Tente novamente em instantes."}
      </Alert>
    );
  } else if (historico.data.length === 0) {
    conteudo = (
      <EmptyState
        icon={ClipboardList}
        title={exercicio ? `Nenhuma avaliação de ${rotuloExercicio(exercicio)}` : "Nenhuma avaliação ainda"}
        description={
          exercicio
            ? "Você ainda não avaliou este exercício. Faça uma avaliação ou veja todos os exercícios."
            : "Suas avaliações feitas com a conta conectada aparecem aqui, com a evolução do 1RM."
        }
        action={
          <Link to="/avaliar" className={buttonVariants()}>
            Fazer avaliação
          </Link>
        }
      />
    );
  } else {
    conteudo = (
      <div
        aria-busy={historico.isPlaceholderData || undefined}
        className={historico.isPlaceholderData ? "space-y-8 opacity-60 transition-opacity" : "space-y-8"}
      >
        {historico.data.map((grupo) => (
          <HistoricoGrupoCard key={grupo.exercicio} grupo={grupo} nomeExercicio={rotuloExercicio(grupo.exercicio)} />
        ))}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 md:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-4xl uppercase italic tracking-tight md:text-5xl">Histórico</h1>
          <p className="text-foreground/70">Acompanhe a evolução do seu 1RM estimado em cada exercício.</p>
        </div>
        <Link to="/avaliar" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Nova avaliação
        </Link>
      </header>

      <FormField label="Exercício" className="max-w-xs">
        <Select value={exercicio ?? ""} onChange={aoFiltrar}>
          <option value="">Todos</option>
          {catalogo.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </Select>
      </FormField>

      {conteudo}
    </section>
  );
}
