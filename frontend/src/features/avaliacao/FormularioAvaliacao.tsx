import type { FormEventHandler, ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { formatarEstatura, rotuloExercicio } from "@/lib/format";
import { RN03 } from "@/lib/rn03";
import type { Exercicio } from "@/types/api";
import { CampoSexo } from "./CampoSexo";
import { CantosScouter } from "./CantosScouter";
import { EXERCICIOS_VALIDOS, type AvaliacaoFormSaida, type AvaliacaoFormValores } from "./schema";
import { useExercicios } from "./useExercicios";

interface FormularioAvaliacaoProps {
  form: UseFormReturn<AvaliacaoFormValores, unknown, AvaliacaoFormSaida>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  enviando: boolean;
  /** Idade, sexo, massa e estatura vieram da última avaliação salva do usuário. */
  perfilPreenchido?: boolean;
  /** Alerta de falha no envio (indisponibilidade etc.), exibido acima do botão. */
  falha?: ReactNode;
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-4 font-display text-xl uppercase italic tracking-tight text-foreground md:text-2xl">
        {titulo}
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function CampoExercicio({ form }: { form: FormularioAvaliacaoProps["form"] }) {
  const exercicios = useExercicios();
  const erro = form.formState.errors.exercicio?.message;
  const dica = "Escolha o exercício que você fez.";

  if (exercicios.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Exercício</p>
        <Skeleton className="h-11 w-full" />
        <Spinner label="Carregando exercícios…" className="size-4" />
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>
    );
  }

  if (exercicios.isError) {
    return (
      <div className="space-y-2 sm:col-span-2">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Exercício</p>
        <Alert
          variant="erro"
          title="Não foi possível carregar os exercícios."
          action={
            <Button variant="ghost" size="sm" onClick={() => void exercicios.refetch()} loading={exercicios.isFetching}>
              Tentar carregar novamente
            </Button>
          }
        >
          Verifique sua conexão. Sem a lista de exercícios não é possível enviar a avaliação.
        </Alert>
      </div>
    );
  }

  const opcoes = exercicios.data
    .filter((opcao) => EXERCICIOS_VALIDOS.includes(opcao.valor as Exercicio))
    .map((opcao) => ({ value: opcao.valor, label: rotuloExercicio(opcao.valor) }));

  return (
    <FormField label="Exercício" hint={dica} error={erro} id="exercicio">
      <Select options={opcoes} placeholder="Selecione…" aria-required="true" {...form.register("exercicio")} />
    </FormField>
  );
}

/** RF01/RF03: formulário em tela única, em duas etapas visuais (perfil e levantamento). */
export function FormularioAvaliacao({ form, onSubmit, enviando, perfilPreenchido, falha }: FormularioAvaliacaoProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Dados da avaliação" className="relative border border-border bg-card p-6 md:p-10">
      <CantosScouter />
      <p className="mb-8 text-sm text-muted-foreground">
        Todos os campos são obrigatórios, exceto a estatura. Use vírgula ou ponto para decimais.
      </p>

      <div className="space-y-10">
        <Grupo titulo="Sobre você">
          {perfilPreenchido && (
            <p role="status" className="text-sm text-muted-foreground sm:col-span-2">
              Preenchemos estes dados com a sua última avaliação. Confira e ajuste se algo mudou.
            </p>
          )}
          <FormField label="Idade (anos)" hint={`De ${RN03.idade.min} a ${RN03.idade.max} anos.`} error={errors.idade?.message} id="idade">
            <Input inputMode="numeric" autoComplete="off" placeholder="ex.: 30" aria-required="true" {...register("idade")} />
          </FormField>

          <CampoSexo registro={register("sexo")} error={errors.sexo?.message} />

          <FormField
            label="Massa corporal (kg)"
            hint="Seu peso corporal, ex.: 72,5."
            error={errors.massa_corporal_kg?.message}
            id="massa_corporal_kg"
          >
            <Input inputMode="decimal" autoComplete="off" placeholder="ex.: 72,5" aria-required="true" {...register("massa_corporal_kg")} />
          </FormField>

          <FormField
            label="Estatura (m, opcional)"
            hint={`Em metros, de ${formatarEstatura(RN03.estatura_m.min)} a ${formatarEstatura(RN03.estatura_m.max)}. Ex.: 1,75.`}
            error={errors.estatura_m?.message}
            id="estatura_m"
          >
            <Input inputMode="decimal" autoComplete="off" placeholder="ex.: 1,75" {...register("estatura_m")} />
          </FormField>
        </Grupo>

        <Grupo titulo="Seu levantamento">
          <CampoExercicio form={form} />

          <FormField
            label="Carga (kg)"
            hint="Peso total levantado, com a barra. Ex.: 80."
            error={errors.carga_kg?.message}
            id="carga_kg"
          >
            <Input inputMode="decimal" autoComplete="off" placeholder="ex.: 80" aria-required="true" {...register("carga_kg")} />
          </FormField>

          <FormField
            label="Repetições"
            hint={`Quantas vezes seguidas você levantou essa carga (${RN03.repeticoes.min} a ${RN03.repeticoes.max}).`}
            error={errors.repeticoes?.message}
            id="repeticoes"
          >
            <Input inputMode="numeric" autoComplete="off" placeholder="ex.: 8" aria-required="true" {...register("repeticoes")} />
          </FormField>
        </Grupo>
      </div>

      {falha && <div className="mt-8">{falha}</div>}

      <div className="mt-10 flex justify-center sm:justify-end">
        <Button type="submit" size="lg" loading={enviando} loadingText="Calculando…" className="w-full sm:w-auto">
          Calcular meu nível
        </Button>
      </div>
    </form>
  );
}
