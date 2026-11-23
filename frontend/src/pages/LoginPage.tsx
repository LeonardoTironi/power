import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { entrar } from "@/api/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { CampoSenha } from "@/features/conta/CampoSenha";
import { destinoSeguro, sufixoNext } from "@/features/conta/redirecionamento";
import { loginSchema, type LoginForm } from "@/features/conta/schemas";
import { useAuth } from "@/features/auth/useAuth";
import { isApiError } from "@/lib/http";
import { useTituloPagina } from "@/lib/useTituloPagina";

const MENSAGEM_CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos.";

/** Estado opcional ao chegar no login (ex.: vindo do cadastro). */
interface EstadoLogin {
  mensagem?: string;
  email?: string;
}

function mensagemDeErro(erro: unknown): { titulo?: string; texto: string } {
  if (isApiError(erro)) {
    if (erro.status === 401) return { texto: MENSAGEM_CREDENCIAIS_INVALIDAS };
    if (erro.kind !== "http" || erro.status >= 500) return { titulo: "Serviço indisponível", texto: erro.detail };
    return { texto: erro.detail };
  }
  return { titulo: "Serviço indisponível", texto: "Não foi possível entrar agora. Tente novamente." };
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const estado = (location.state ?? {}) as EstadoLogin;
  const next = params.get("next");
  const destino = destinoSeguro(next);
  useTituloPagina("Entrar");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: estado.email ?? "", senha: "" },
  });

  const mutacao = useMutation({
    mutationFn: entrar,
    onSuccess: (resposta) => {
      login(resposta.access_token);
      toast.success("Você entrou na sua conta.");
    },
  });

  // Já logado (inclusive logo após o login): segue para o destino.
  if (isAuthenticated) return <Navigate to={destino} replace />;

  const erro = mutacao.isError ? mensagemDeErro(mutacao.error) : null;

  return (
    <section className="mx-auto w-full max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl uppercase italic tracking-tight md:text-5xl">Entrar</h1>
      <p className="mt-3 text-foreground/70">Acesse sua conta para salvar e acompanhar suas avaliações.</p>

      <Card cantos className="mt-8">
        <CardContent>
          <form
            noValidate
            aria-label="Entrar"
            onSubmit={handleSubmit((dados) => mutacao.mutate(dados))}
            className="space-y-5"
          >
            {estado.mensagem && !erro && <Alert variant="sucesso">{estado.mensagem}</Alert>}
            {erro && (
              <Alert variant="erro" title={erro.titulo}>
                {erro.texto}
              </Alert>
            )}

            <FormField label="E-mail" error={errors.email?.message} required>
              <Input type="email" autoComplete="email" inputMode="email" {...register("email")} />
            </FormField>

            <FormField label="Senha" error={errors.senha?.message} required>
              <CampoSenha autoComplete="current-password" {...register("senha")} />
            </FormField>

            <Button type="submit" className="w-full" loading={mutacao.isPending} loadingText="Entrando…">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-foreground/70">
        Ainda não tem conta?{" "}
        <Link to={`/cadastro${sufixoNext(next)}`} className="text-accent underline underline-offset-4 hover:text-primary">
          Criar conta
        </Link>
      </p>
    </section>
  );
}
