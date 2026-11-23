import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { History, LogOut, Plus, Trash2 } from "lucide-react";
import { queryKeys } from "@/api/queryKeys";
import { excluirConta, obterUsuarioAtual } from "@/api/usuarios";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ExcluirContaDialog } from "@/features/conta/ExcluirContaDialog";
import { useSair } from "@/features/auth/useSair";
import { formatarData } from "@/lib/format";
import { isApiError } from "@/lib/http";
import { useTituloPagina } from "@/lib/useTituloPagina";

function DadosCarregando() {
  return (
    <div aria-busy="true" className="space-y-4">
      <Spinner label="Carregando seus dados…" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-56 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-xs uppercase tracking-widest text-accent">{rotulo}</dt>
      <dd className="break-words text-lg text-foreground">{valor}</dd>
    </div>
  );
}

export function ContaPage() {
  const [dialogAberto, setDialogAberto] = useState(false);
  useTituloPagina("Minha conta");

  // Mesma chave do AuthContext: reaproveita o cache de /usuarios/me.
  const usuarioQuery = useQuery({
    queryKey: queryKeys.usuarioMe,
    queryFn: ({ signal }) => obterUsuarioAtual(signal),
    staleTime: 5 * 60_000,
  });
  const usuario = usuarioQuery.data;

  const exclusao = useMutation({ mutationFn: excluirConta });

  // Sai da rota protegida antes de limpar o token, para não cair no /login?next=/conta.
  const sairPara = useSair();

  const confirmarExclusao = () => {
    exclusao.mutate(undefined, {
      onSuccess: () => {
        sairPara("Sua conta e todas as suas avaliações foram excluídas.");
      },
    });
  };

  const erroExclusao = exclusao.isError
    ? isApiError(exclusao.error)
      ? exclusao.error.detail
      : "Não foi possível excluir a conta. Tente novamente."
    : null;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl uppercase italic tracking-tight md:text-5xl">Minha conta</h1>
      <p className="mt-3 text-foreground/70">Seus dados de cadastro e as opções da sua conta.</p>

      <Card cantos className="mt-8">
        <CardHeader>
          <CardTitle>Dados da conta</CardTitle>
        </CardHeader>
        <CardContent>
          {usuarioQuery.isPending ? (
            <DadosCarregando />
          ) : usuarioQuery.isError || !usuario ? (
            <Alert
              variant="erro"
              title="Não foi possível carregar seus dados"
              action={
                <Button variant="ghost" size="sm" onClick={() => void usuarioQuery.refetch()}>
                  Tentar de novo
                </Button>
              }
            >
              {isApiError(usuarioQuery.error) ? usuarioQuery.error.detail : "Tente novamente em instantes."}
            </Alert>
          ) : (
            <dl className="grid gap-5 sm:grid-cols-2">
              <Dado rotulo="Nome" valor={usuario.nome} />
              <Dado rotulo="E-mail" valor={usuario.email} />
              <Dado rotulo="Membro desde" valor={formatarData(usuario.criado_em)} />
            </dl>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/historico" className={buttonVariants({ variant: "outline" })}>
              <History aria-hidden="true" className="size-5" />
              Ver histórico
            </Link>
            <Link to="/avaliar" className={buttonVariants()}>
              <Plus aria-hidden="true" className="size-5" />
              Nova avaliação
            </Link>
            <Button variant="ghost" onClick={() => sairPara()}>
              <LogOut aria-hidden="true" className="size-4" />
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="zona-perigo" className="mt-10 border border-destructive/60 p-6">
        <h2 id="zona-perigo" className="font-display text-2xl uppercase italic tracking-tight text-destructive">
          Excluir conta
        </h2>
        <p className="mt-2 text-sm text-foreground/80">
          Apaga definitivamente o seu cadastro e todas as suas avaliações, conforme a LGPD. Esta ação não pode ser
          desfeita.
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => {
            exclusao.reset();
            setDialogAberto(true);
          }}
        >
          <Trash2 aria-hidden="true" className="size-5" />
          Excluir minha conta
        </Button>
      </section>

      <ExcluirContaDialog
        open={dialogAberto}
        email={usuario?.email}
        loading={exclusao.isPending}
        erro={erroExclusao}
        onConfirm={confirmarExclusao}
        onCancel={() => setDialogAberto(false)}
      />
    </section>
  );
}
