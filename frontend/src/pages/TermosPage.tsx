import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Alert } from "@/components/ui/Alert";
import { useTituloPagina } from "@/lib/useTituloPagina";

/** Mesma versão gravada pelo backend no cadastro (VERSAO_TERMO_ATUAL). */
const VERSAO_TERMO = "1.0";

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="font-display text-2xl uppercase italic tracking-tight text-foreground">
        {titulo}
      </h2>
      <div className="space-y-3 text-foreground/80">{children}</div>
    </section>
  );
}

const estiloLista = "list-disc space-y-1 pl-6 marker:text-accent";
const estiloLink = "text-accent underline underline-offset-4 hover:text-primary";

export function TermosPage() {
  useTituloPagina("Termo de Consentimento e Privacidade");

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Versão {VERSAO_TERMO}</p>
        <h1 className="font-display text-4xl uppercase italic tracking-tight md:text-5xl">
          Termo de Consentimento e Privacidade
        </h1>
        <p className="text-foreground/70">
          Este termo explica como o Scouter Power trata os seus dados pessoais, em conformidade com a Lei Geral de
          Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD). Ao criar uma conta, você declara que leu e concorda
          com as condições abaixo.
        </p>
      </header>

      <div className="mt-10 space-y-10 leading-relaxed">
        <Secao id="termos-dados" titulo="1. Dados coletados">
          <p>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
          <ul className={estiloLista}>
            <li>
              <strong>Dados de cadastro:</strong> nome, e-mail e senha. A senha é armazenada somente na forma de hash
              (resumo criptográfico irreversível) e nunca em texto puro.
            </li>
            <li>
              <strong>Dados das avaliações:</strong> idade, sexo, massa corporal, estatura (opcional), exercício
              avaliado, carga utilizada e número de repetições, além do resultado calculado (1RM estimado e nível de
              força) e da data da avaliação.
            </li>
            <li>
              <strong>Registro do consentimento:</strong> data e versão deste termo aceitas no cadastro.
            </li>
          </ul>
          <p>
            Avaliações feitas sem login não são armazenadas: os dados são usados apenas para calcular e exibir o
            resultado.
          </p>
        </Secao>

        <Secao id="termos-finalidade" titulo="2. Finalidade do tratamento">
          <p>Os dados são utilizados exclusivamente para:</p>
          <ul className={estiloLista}>
            <li>estimar a sua carga máxima para uma repetição (1RM);</li>
            <li>classificar o seu nível de força no exercício avaliado;</li>
            <li>manter o histórico das suas avaliações e mostrar a sua evolução ao longo do tempo;</li>
            <li>identificar você no acesso à sua conta.</li>
          </ul>
          <p>Os dados não são vendidos, compartilhados com terceiros nem usados para publicidade.</p>
        </Secao>

        <Secao id="termos-base-legal" titulo="3. Base legal">
          <p>
            O tratamento é realizado com base no seu <strong>consentimento</strong> (art. 7º, inciso I, da LGPD),
            manifestado de forma livre, informada e inequívoca ao marcar a caixa de aceite no cadastro. Os dados de
            saúde informados (como massa corporal e estatura) são tratados apenas para as finalidades descritas acima.
          </p>
        </Secao>

        <Secao id="termos-retencao" titulo="4. Armazenamento e retenção">
          <p>
            Os dados ficam armazenados enquanto a sua conta existir. Ao excluir a conta, o seu cadastro e todas as
            suas avaliações são apagados de forma definitiva.
          </p>
          <p>
            Adotamos medidas técnicas razoáveis de segurança, como senhas com hash e acesso às avaliações somente
            mediante autenticação.
          </p>
        </Secao>

        <Secao id="termos-direitos" titulo="5. Seus direitos">
          <p>Como titular dos dados, você pode a qualquer momento:</p>
          <ul className={estiloLista}>
            <li>
              <strong>acessar</strong> os seus dados de cadastro na página{" "}
              <Link to="/conta" className={estiloLink}>
                Minha conta
              </Link>{" "}
              e as suas avaliações no{" "}
              <Link to="/historico" className={estiloLink}>
                Histórico
              </Link>
              ;
            </li>
            <li>
              <strong>solicitar a correção</strong> de dados incorretos pelo contato da equipe do projeto;
            </li>
            <li>
              <strong>excluir</strong> a sua conta e todas as suas avaliações pela página Minha conta, o que também
              revoga o consentimento;
            </li>
            <li>obter informações sobre o tratamento realizado.</li>
          </ul>
        </Secao>

        <Secao id="termos-aviso" titulo="6. Aviso importante">
          <Alert variant="aviso" title="O resultado não substitui orientação profissional">
            O 1RM e o nível de força são estimativas geradas por um modelo estatístico para fins educacionais. Antes de
            realizar testes de carga máxima ou mudar o seu treino, procure um profissional de Educação Física ou da
            saúde.
          </Alert>
        </Secao>

        <Secao id="termos-contato" titulo="7. Responsável e contato">
          <p>
            O Scouter Power é um projeto acadêmico desenvolvido por estudantes do Instituto Federal do Paraná (IFPR).
            Dúvidas ou solicitações sobre os seus dados podem ser encaminhadas à equipe do projeto pelos canais
            institucionais do curso.
          </p>
        </Secao>

        <Secao id="termos-alteracoes" titulo="8. Alterações deste termo">
          <p>
            Este termo pode ser atualizado. Mudanças relevantes recebem uma nova versão, e o aceite registrado no
            cadastro indica a versão que você aceitou.
          </p>
        </Secao>
      </div>
    </article>
  );
}
