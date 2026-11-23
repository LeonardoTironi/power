import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { cadastrar, entrar } from "@/api/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { CampoSenha } from "@/features/conta/CampoSenha";
import { destinoSeguro, sufixoNext } from "@/features/conta/redirecionamento";
import { cadastroSchema, type CadastroForm } from "@/features/conta/schemas";
import { useAuth } from "@/features/auth/useAuth";
import { isApiError } from "@/lib/http";
import { useTituloPagina } from "@/lib/useTituloPagina";

/** Campos do formulário na ordem da tela (para focar o primeiro erro do servidor). */
const ORDEM_CAMPOS = ["nome", "email", "senha", "confirmacao", "consentimento"] as const;
type CampoForm = (typeof ORDEM_CAMPOS)[number];

/** Nome do campo na API → nome no formulário. */
const CAMPO_API: Record<string, CampoForm> = {
  nome: "nome",
  email: "email",
  senha: "senha",
  consentimento_lgpd: "consentimento",
};

const MENSAGEM_CONTA_CRIADA = "Conta criada com sucesso. Entre com seu e-mail e senha.";

export function CadastroPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const destino = destinoSeguro(next);
  useTituloPagina("Criar conta");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: "", email: "", senha: "", confirmacao: "", consentimento: false },
  });

  const mutacao = useMutation({
    mutationFn: async (dados: CadastroForm) => {
      await cadastrar({ nome: dados.nome, email: dados.email, senha: dados.senha, consentimento_lgpd: true });
      // O cadastro não devolve token: entra em seguida com as mesmas credenciais.
      try {
        const resposta = await entrar({ email: dados.email, senha: dados.senha });
        return { token: resposta.access_token, email: dados.email };
      } catch {
        return { token: null, email: dados.email };
      }
    },
    onSuccess: ({ token, email }) => {
      if (token) {
        login(token);
        toast.success("Conta criada! Bem-vindo(a) ao Scouter Power.");
        return;
      }
      navigate(`/login${sufixoNext(next)}`, { replace: true, state: { mensagem: MENSAGEM_CONTA_CRIADA, email } });
    },
    onError: (erro) => {
      if (!isApiError(erro)) return;
      if (erro.status === 409) {
        setError("email", { message: "E-mail já cadastrado." }, { shouldFocus: true });
        return;
      }
      if (erro.status === 422) {
        const porCampo: Partial<Record<CampoForm, string>> = {};
        for (const [campoApi, mensagem] of Object.entries(erro.fieldErrors)) {
          const campo = CAMPO_API[campoApi];
          if (campo && !porCampo[campo]) porCampo[campo] = mensagem;
        }
        let focou = false;
        for (const campo of ORDEM_CAMPOS) {
          const mensagem = porCampo[campo];
          if (!mensagem) continue;
          setError(campo, { message: mensagem }, { shouldFocus: !focou });
          focou = true;
        }
      }
    },
  });

  // Já logado (inclusive logo após o login automático): segue para o destino.
  if (isAuthenticated) return <Navigate to={destino} replace />;

  const erro = mutacao.error;
  const erroTratadoNosCampos =
    isApiError(erro) &&
    (erro.status === 409 || (erro.status === 422 && Object.keys(erro.fieldErrors).some((c) => c in CAMPO_API)));
  const erroGeral = mutacao.isError && !erroTratadoNosCampos ? erro : null;
  const indisponivel = isApiError(erroGeral) ? erroGeral.kind !== "http" || erroGeral.status >= 500 : Boolean(erroGeral);

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl uppercase italic tracking-tight md:text-5xl">Criar conta</h1>
      <p className="mt-3 text-foreground/70">
        Com uma conta você guarda suas avaliações e acompanha a evolução da sua força.
      </p>

      <Card cantos className="mt-8">
        <CardContent>
          <form
            noValidate
            aria-label="Criar conta"
            onSubmit={handleSubmit((dados) => mutacao.mutate(dados))}
            className="space-y-5"
          >
            {erroGeral && (
              <Alert variant="erro" title={indisponivel ? "Serviço indisponível" : undefined}>
                {isApiError(erroGeral) ? erroGeral.detail : "Não foi possível criar a conta. Tente novamente."}
              </Alert>
            )}

            <FormField label="Nome" error={errors.nome?.message} required>
              <Input autoComplete="name" maxLength={120} {...register("nome")} />
            </FormField>

            <FormField label="E-mail" error={errors.email?.message} required>
              <Input type="email" autoComplete="email" inputMode="email" {...register("email")} />
            </FormField>

            <FormField label="Senha" hint="Entre 8 e 128 caracteres." error={errors.senha?.message} required>
              <CampoSenha autoComplete="new-password" {...register("senha")} />
            </FormField>

            <FormField label="Confirmar senha" error={errors.confirmacao?.message} required>
              <CampoSenha
                autoComplete="new-password"
                rotuloAlternar="Mostrar confirmação de senha"
                {...register("confirmacao")}
              />
            </FormField>

            <FormField
              orientacao="horizontal"
              required
              error={errors.consentimento?.message}
              label={
                <>
                  Li e aceito o{" "}
                  <Link
                    to="/termos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-4 hover:text-primary"
                  >
                    Termo de Consentimento e Privacidade
                    <span className="sr-only"> (abre em nova aba)</span>
                  </Link>{" "}
                  e autorizo o tratamento dos meus dados (LGPD).
                </>
              }
            >
              <Checkbox {...register("consentimento")} />
            </FormField>

            <Button type="submit" className="w-full" loading={mutacao.isPending} loadingText="Criando conta…">
              Criar conta
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-foreground/70">
        Já tem conta?{" "}
        <Link to={`/login${sufixoNext(next)}`} className="text-accent underline underline-offset-4 hover:text-primary">
          Entrar
        </Link>
      </p>
    </section>
  );
}
