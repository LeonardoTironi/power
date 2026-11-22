import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { NivelBadge } from "@/components/domain/NivelBadge";
import { formatarNumero, rotuloExercicio, rotuloNivel } from "@/lib/format";
import type { AvaliacaoResultado } from "@/types/api";
import { CantosScouter } from "./CantosScouter";

/** Situação de gravação no histórico, decidida no envio. */
export type SituacaoHistorico = "salva" | "anonima" | "sessao-expirada";

interface ResultadoAvaliacaoProps {
  resultado: AvaliacaoResultado;
  situacao: SituacaoHistorico;
  onNovaAvaliacao: () => void;
  onEditarDados: () => void;
}

const LINK_LOGIN = `/login?next=${encodeURIComponent("/avaliar")}`;

function AvisoHistorico({ resultado, situacao }: Pick<ResultadoAvaliacaoProps, "resultado" | "situacao">) {
  if (situacao === "salva" && resultado.id) {
    return (
      <Alert
        variant="sucesso"
        title="Avaliação salva no seu histórico."
        action={
          <Link to={`/historico/${encodeURIComponent(resultado.id)}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Ver no histórico
          </Link>
        }
      />
    );
  }
  if (situacao === "sessao-expirada") {
    return (
      <Alert
        variant="aviso"
        title="Esta avaliação não foi salva."
        action={
          <Link to={LINK_LOGIN} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Entrar para salvar
          </Link>
        }
      >
        Sua sessão expirou. Entre novamente para guardar as próximas avaliações no histórico.
      </Alert>
    );
  }
  return (
    <Alert
      variant="info"
      title="Esta avaliação não foi salva."
      action={
        <div className="flex flex-wrap gap-3">
          <Link to="/cadastro" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Criar conta
          </Link>
          <Link to={LINK_LOGIN} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Entrar para salvar
          </Link>
        </div>
      }
    >
      Crie uma conta ou entre para guardar suas avaliações e acompanhar sua evolução.
    </Alert>
  );
}

/** RF06: resultado na própria rota /avaliar. Recebe o foco ao aparecer. */
export function ResultadoAvaliacao({ resultado, situacao, onNovaAvaliacao, onEditarDados }: ResultadoAvaliacaoProps) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  const exercicio = rotuloExercicio(resultado.exercicio);

  return (
    <section aria-labelledby="resultado-titulo" className="duration-500 animate-in fade-in zoom-in-95">
      <div className="relative overflow-hidden border border-border bg-card">
        <CantosScouter destaque />

        <div className="flex flex-col gap-10 p-6 md:flex-row md:items-center md:p-12">
          <div className="hidden justify-center md:flex md:w-2/5">
            <img
              src="/result.svg"
              alt=""
              className="h-auto w-full max-w-sm drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] duration-700 animate-in slide-in-from-left"
            />
          </div>

          <div className="flex w-full flex-col gap-6 md:w-3/5">
            <div className="self-start rounded-sm border border-primary/30 bg-primary/10 px-3 py-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Análise concluída</span>
            </div>

            <h2
              id="resultado-titulo"
              ref={tituloRef}
              tabIndex={-1}
              className="font-display text-3xl uppercase italic tracking-tight focus:outline-none md:text-4xl"
            >
              Seu resultado
            </h2>

            <dl className="grid gap-4">
              <div className="border-l-4 border-accent bg-background/40 p-5">
                <dt className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/60">
                  Nível de força · {exercicio}
                </dt>
                <dd className="space-y-2">
                  <span className="block font-display text-4xl uppercase leading-none text-accent drop-shadow-[0_0_12px_oklch(var(--accent)/0.4)] md:text-5xl">
                    {rotuloNivel(resultado.nivel)}
                  </span>
                  <NivelBadge nivel={resultado.nivel} />
                </dd>
              </div>

              <div className="border-l-4 border-primary bg-background/40 p-5">
                <dt className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/60">
                  1RM estimado
                </dt>
                <dd className="font-display text-5xl leading-none tracking-tighter text-primary drop-shadow-[0_0_15px_oklch(var(--primary)/0.5)] md:text-6xl">
                  {formatarNumero(resultado.rm1_estimado_kg)}{" "}
                  <span className="text-2xl text-primary/70 md:text-3xl">kg</span>
                </dd>
              </div>
            </dl>

            <p className="text-sm text-foreground/70">
              1RM é a carga máxima que você conseguiria levantar uma única vez no {exercicio.toLowerCase()}.
            </p>

            <div className="space-y-2">
              <h3 className="font-mono text-xs uppercase tracking-widest text-accent">Como chegamos nisso</h3>
              <p className="text-base text-foreground/85">{resultado.explicacao}</p>
            </div>

            <Alert variant="aviso" title="Importante">
              {resultado.aviso}
            </Alert>

            <AvisoHistorico resultado={resultado} situacao={situacao} />

            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:flex-wrap">
              <Button onClick={onNovaAvaliacao}>Nova avaliação</Button>
              <Button variant="ghost" onClick={onEditarDados}>
                Editar dados
              </Button>
            </div>

            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Modelo: {resultado.versao_modelo}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
