import { Link } from "react-router-dom";
import { ClipboardList, Dumbbell, Gauge } from "lucide-react";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { useAuth } from "@/features/auth/useAuth";
import { HeroScouter } from "@/features/avaliacao/HeroScouter";
import { StatusServico } from "@/features/avaliacao/StatusServico";
import { useTituloPagina } from "@/lib/useTituloPagina";

const PASSOS = [
  {
    icone: ClipboardList,
    titulo: "Conte sobre você",
    texto: "Idade, sexo e massa corporal. A estatura é opcional.",
  },
  {
    icone: Dumbbell,
    titulo: "Informe uma série",
    texto: "Supino, agachamento ou levantamento terra: a carga e quantas repetições você fez.",
  },
  {
    icone: Gauge,
    titulo: "Veja seu nível",
    texto: "Seu 1RM estimado e a classificação: iniciante, intermediário ou avançado.",
  },
] as const;

export function HomePage() {
  const { isAuthenticated } = useAuth();
  useTituloPagina();

  return (
    <>
      <HeroScouter
        acoes={
          <>
            <Link to="/avaliar" className={buttonVariants({ size: "lg" })}>
              Fazer avaliação
            </Link>
            {!isAuthenticated && (
              <Link to="/cadastro" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Criar conta
              </Link>
            )}
          </>
        }
        rodape={<StatusServico />}
      />

      <section aria-labelledby="como-funciona" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 id="como-funciona" className="mb-8 font-display text-3xl uppercase italic tracking-tight md:text-4xl">
          Como funciona
        </h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {PASSOS.map(({ icone: Icone, titulo, texto }, indice) => (
            <li key={titulo} className="relative border border-border bg-card p-6">
              <span aria-hidden="true" className="font-mono text-xs text-accent/70">
                0{indice + 1}
              </span>
              <Icone aria-hidden="true" className="my-3 size-8 text-primary" />
              <h3 className="mb-2 font-display text-xl uppercase italic tracking-tight">{titulo}</h3>
              <p className="text-sm text-foreground/75">{texto}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-3xl text-sm text-muted-foreground">
          Leva menos de 2 minutos. {isAuthenticated
            ? "Suas avaliações ficam salvas no histórico."
            : "Sem conta, você vê o resultado na hora; com conta, ele fica salvo no seu histórico."}
        </p>
      </section>
    </>
  );
}
