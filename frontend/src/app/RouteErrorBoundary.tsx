import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { useTituloPagina } from "@/lib/useTituloPagina";

function ehFalhaDeCarregamento(erro: unknown): boolean {
  return erro instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(erro.message);
}

/** Erro de rota (versão simples). Fica dentro do AppLayout quando o erro é numa página. */
export function RouteErrorBoundary() {
  const erro = useRouteError();

  let titulo = "Algo deu errado";
  let mensagem = "Ocorreu um erro inesperado ao exibir esta página.";
  if (isRouteErrorResponse(erro) && erro.status === 404) {
    titulo = "Página não encontrada";
    mensagem = "O endereço acessado não existe.";
  } else if (ehFalhaDeCarregamento(erro)) {
    mensagem = "Não foi possível carregar esta página. Verifique sua conexão ou recarregue.";
  }

  useTituloPagina(titulo);

  if (import.meta.env.DEV) console.error(erro);

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-6 px-6 py-24 text-center" role="alert">
      <AlertTriangle aria-hidden="true" className="size-12 text-destructive" />
      <h1 className="font-display text-4xl uppercase italic tracking-tight">{titulo}</h1>
      <p className="text-foreground/70">{mensagem}</p>
      <div className="flex flex-wrap justify-center gap-4">
        <button type="button" className={buttonVariants({ variant: "outline" })} onClick={() => window.location.reload()}>
          Recarregar
        </button>
        <Link to="/" className={buttonVariants()}>
          Ir para o início
        </Link>
      </div>
    </section>
  );
}
