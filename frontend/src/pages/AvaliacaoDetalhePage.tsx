import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { NivelBadge } from "@/components/domain/NivelBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { useAvaliacao, useExcluirAvaliacao } from "@/features/historico/queries";
import {
  formatarDataHora,
  formatarEstatura,
  formatarKg,
  formatarNumero,
  rotuloExercicio,
  rotuloSexo,
} from "@/lib/format";
import { isApiError } from "@/lib/http";
import { useTituloPagina } from "@/lib/useTituloPagina";

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-xs uppercase tracking-widest text-accent">{rotulo}</dt>
      <dd className="text-lg">{children}</dd>
    </div>
  );
}

const linkVoltar = (
  <Link to="/historico" className={buttonVariants({ variant: "link", className: "px-0" })}>
    <ArrowLeft aria-hidden="true" className="size-4" />
    Voltar ao histórico
  </Link>
);

export function AvaliacaoDetalhePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [excluida, setExcluida] = useState(false);
  const avaliacao = useAvaliacao(id, !excluida);
  const excluir = useExcluirAvaliacao();
  const [confirmando, setConfirmando] = useState(false);
  const data = avaliacao.data;

  useTituloPagina(data ? `Avaliação de ${rotuloExercicio(data.exercicio)}` : "Detalhe da avaliação");

  const aoConfirmarExclusao = () => {
    excluir.mutate(id, {
      onSuccess: () => {
        setExcluida(true);
        setConfirmando(false);
        toast.success("Avaliação excluída.");
        navigate("/historico", { replace: true });
      },
      onError: (erro) => {
        setConfirmando(false);
        toast.error(isApiError(erro) ? erro.detail : "Não foi possível excluir a avaliação.");
      },
    });
  };

  let conteudo: ReactNode;
  if (avaliacao.isPending) {
    conteudo = (
      <div aria-busy="true" className="space-y-6">
        <p role="status" className="sr-only">
          Carregando avaliação…
        </p>
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  } else if (avaliacao.isError) {
    const naoEncontrada = isApiError(avaliacao.error) && [404, 422].includes(avaliacao.error.status);
    conteudo = naoEncontrada ? (
      <EmptyState
        headingLevel="h2"
        title="Avaliação não encontrada"
        description="Ela pode ter sido excluída ou não pertence à sua conta."
        action={
          <Link to="/historico" className={buttonVariants()}>
            Ir para o histórico
          </Link>
        }
      />
    ) : (
      <Alert
        variant="erro"
        title="Não foi possível carregar a avaliação."
        action={
          <Button variant="ghost" size="sm" onClick={() => void avaliacao.refetch()} loading={avaliacao.isFetching}>
            Tentar novamente
          </Button>
        }
      >
        {isApiError(avaliacao.error) ? avaliacao.error.detail : "Tente novamente em instantes."}
      </Alert>
    );
  } else {
    const a = avaliacao.data;
    conteudo = (
      <>
        <Card cantos>
          <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
            <section aria-labelledby="resultado-titulo" className="space-y-4">
              <h2 id="resultado-titulo" className="font-display text-2xl uppercase italic tracking-tight">
                Resultado
              </h2>
              <dl className="space-y-4">
                <Dado rotulo="1RM estimado">
                  <span className="font-display text-4xl italic">{formatarKg(a.rm1_estimado_kg)}</span>
                </Dado>
                <Dado rotulo="Nível">
                  <NivelBadge nivel={a.nivel} />
                </Dado>
                <Dado rotulo="Versão do modelo">
                  <span className="font-mono text-sm">{a.versao_modelo}</span>
                </Dado>
              </dl>
            </section>
            <section aria-labelledby="dados-titulo" className="space-y-4">
              <h2 id="dados-titulo" className="font-display text-2xl uppercase italic tracking-tight">
                Dados informados
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <Dado rotulo="Exercício">{rotuloExercicio(a.exercicio)}</Dado>
                <Dado rotulo="Idade">{formatarNumero(a.idade)} anos</Dado>
                <Dado rotulo="Sexo">{rotuloSexo(a.sexo)}</Dado>
                <Dado rotulo="Massa corporal">{formatarKg(a.massa_corporal_kg)}</Dado>
                <Dado rotulo="Estatura">{a.estatura_m !== null ? formatarEstatura(a.estatura_m) : "Não informada"}</Dado>
                <Dado rotulo="Carga">{formatarKg(a.carga_kg)}</Dado>
                <Dado rotulo="Repetições">{formatarNumero(a.repeticoes)}</Dado>
              </dl>
            </section>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {linkVoltar}
          <Button variant="destructive" onClick={() => setConfirmando(true)}>
            <Trash2 aria-hidden="true" className="size-4" />
            Excluir avaliação
          </Button>
        </div>

        <ConfirmDialog
          open={confirmando}
          variant="destructive"
          title="Excluir avaliação?"
          description="Esta avaliação será removida do seu histórico. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          loading={excluir.isPending}
          onConfirm={aoConfirmarExclusao}
          onCancel={() => setConfirmando(false)}
        />
      </>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 md:py-16">
      {!data && linkVoltar}
      <header className="space-y-2">
        <h1 className="font-display text-4xl uppercase italic tracking-tight md:text-5xl">
          {data ? `Avaliação de ${rotuloExercicio(data.exercicio)}` : "Detalhe da avaliação"}
        </h1>
        {data && (
          <p className="font-mono text-sm text-muted-foreground">
            <time dateTime={data.criado_em}>{formatarDataHora(data.criado_em)}</time>
          </p>
        )}
      </header>
      {conteudo}
    </section>
  );
}
