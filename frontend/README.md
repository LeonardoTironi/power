# Scouter Power — frontend

Interface web do Scouter Power: a pessoa informa idade, sexo, massa corporal (e, se
quiser, a estatura), o exercício (supino, agachamento ou levantamento terra), a carga e as
repetições de uma série, e recebe o **1RM estimado** e o **nível de força** (iniciante,
intermediário ou avançado), calculados pela API do [backend](../backend/README.md).
Sem conta, o resultado aparece na hora; com conta, as avaliações ficam num histórico com a
evolução do 1RM por exercício.

## Stack

- React 19 + TypeScript, empacotado com Vite 8
- React Router 7 (rotas com carregamento sob demanda)
- TanStack Query 5 (chamadas à API e cache)
- React Hook Form + Zod (formulários e validação)
- Tailwind CSS 3, ícones lucide-react, notificações sonner
- Testes: Vitest + Testing Library + MSW (unitários e de integração) e Playwright +
  axe-core (E2E e acessibilidade)

## Requisitos

- **Node.js 20.19+ ou 22.12+** (exigência do Vite 8). Testado com Node 26.
- npm (vem com o Node).
- Para usar com dados reais: o backend rodando em `http://localhost:8000` (Python e
  PostgreSQL via Docker; veja o [README do backend](../backend/README.md)).
- Para os testes E2E: **Microsoft Edge** ou **Google Chrome** instalado. Os testes usam o
  navegador do sistema; não é preciso (nem se deve) rodar `npx playwright install`.

## Configuração

```bash
cd frontend
npm install
cp .env.example .env
```

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | vazio | Origem da API, sem `/api/v1` e sem barra final. **Vazio = proxy**: o frontend chama `/api/v1` na própria origem e o Vite (dev e preview) encaminha `/api` para `http://localhost:8000`. |

Prefira deixar vazio em desenvolvimento. Se preencher (ex.: `http://localhost:8000`), as
chamadas vão direto para a API e o backend precisa liberar a origem do frontend em
`CORS_ORIGINS` (o padrão do backend libera só `http://localhost:5173`, então o `preview`
em `:4173` seria bloqueado). O valor é embutido no build.

## Rodar com o backend

Em um terminal, na pasta `backend`:

```bash
docker compose up -d db
uvicorn app.main:app --reload        # http://localhost:8000
```

Em outro, na pasta `frontend`:

```bash
npm run dev                          # http://localhost:5173
```

Sem o backend a interface abre, mas mostra "Serviço indisponível no momento" e as
avaliações falham com a mensagem "Sem conexão com o servidor".

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga (`:5173`). |
| `npm run build` | Checa os tipos (`tsc -b`) e gera o build de produção em `dist/`. |
| `npm run preview` | Serve o `dist/` em `:4173` (com o mesmo proxy `/api`). |
| `npm run lint` | ESLint em todo o projeto (inclui `e2e/`). |
| `npm run typecheck` | Checa os tipos da aplicação e dos testes E2E. |
| `npm test` | Testes unitários e de integração (Vitest + MSW), uma vez. |
| `npm run test:watch` | Vitest em modo observação. |
| `npm run e2e` | Testes E2E (Playwright) com a API simulada. Faz o build e sobe o preview sozinho. |
| `npm run e2e:ui` | Mesmos testes na interface do Playwright (passo a passo, trace). |
| `npm run e2e:real` | Smoke E2E contra a API real (precisa do backend e do PostgreSQL no ar). |
| `npm run medir:bundles` | Build com manifest e tamanho (bruto e gzip) do JavaScript/CSS de cada rota. |
| `npm run medir:desempenho` | Medição de desempenho com rede Slow 4G emulada (RNF02). |

### Testes E2E

Ficam em `e2e/` e rodam contra o **build de produção** (`vite build` + `vite preview` na
porta 4173), sempre com `VITE_API_URL` em branco, independentemente do seu `.env`.

- **API simulada:** `e2e/fixtures/apiSimulada.ts` atende `**/api/v1/**` via `page.route`,
  com estado em memória (usuários, tokens, avaliações). Nenhuma chamada sai para a rede.
- **Navegador:** Edge por padrão (`channel: "msedge"`). Para usar o Chrome:
  `npx cross-env E2E_CANAL=chrome playwright test`.
- **Cobertura:** avaliação com sucesso (resultado e aviso); validação que bloqueia o envio
  (0 repetições, sem nenhum POST); backend indisponível (mensagem, dados mantidos e
  "Tentar novamente"); 503; navegação só por teclado; cadastro → login automático →
  avaliação salva → histórico → detalhe → exclusão; rota protegida com `?next=`; sair;
  exclusão de conta; axe (sem violações serious/critical, WCAG 2.1 AA) em `/`,
  `/avaliar` (formulário, erros e resultado), `/login`, `/cadastro`, `/historico` e
  `/conta`; layout em 360×800 sem rolagem horizontal.
- **Pulados por padrão:** `real.smoke.spec.ts` (só com `E2E_REAL=1`) e `perf.spec.ts`
  (só com `PERF=1`).
- Violações de acessibilidade já conhecidas ficam listadas em
  `PENDENCIAS_CONHECIDAS` (`e2e/acessibilidade.spec.ts`) e aparecem como anotação no
  relatório; remova a entrada quando o problema for corrigido.
- Falhas deixam screenshot e trace em `test-results/`
  (`npx playwright show-trace <arquivo>`).

Smoke contra a API real (cria um usuário descartável e o exclui no fim):

```bash
# pasta backend
docker compose up -d db
uvicorn app.main:app --port 8000
# pasta frontend
npm run e2e:real
```

## Estrutura de pastas

```
frontend/
├── e2e/                 Testes Playwright (specs, fixtures da API simulada, tsconfig)
├── public/              Arquivos estáticos (favicon.svg, result.svg)
├── scripts/             medir-bundles.mjs (RNF02)
├── src/
│   ├── api/             Uma função por endpoint (+ chaves do React Query)
│   ├── app/             Rotas, providers, QueryClient, telas de carregamento e erro
│   ├── components/
│   │   ├── domain/      Componentes do domínio (selo de nível)
│   │   ├── layout/      Cabeçalho, rodapé, "Pular para o conteúdo"
│   │   └── ui/          Botão, campo, alerta, diálogo de confirmação etc.
│   ├── features/
│   │   ├── auth/        Contexto de autenticação, token, rota protegida
│   │   ├── avaliacao/   Formulário, schema (RN03), resultado, mensagens de falha
│   │   ├── conta/       Login, cadastro, exclusão de conta, redirecionamento seguro
│   │   └── historico/   Consultas, cards por exercício, gráfico de evolução
│   ├── lib/             Cliente HTTP, env, formatação pt-BR, faixas da RN03, título da página
│   ├── pages/           Uma página por rota (carregada sob demanda)
│   ├── test/            Setup do Vitest, servidor MSW e handlers
│   └── types/api.ts     Contrato da API (espelha os modelos do backend)
├── playwright.config.ts
└── vite.config.ts       Alias @ → src, proxy /api e config do Vitest
```

## Rotas

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | público | Apresentação, "Fazer avaliação", status do serviço |
| `/avaliar` | público | Formulário e resultado na mesma tela (salva no histórico se houver sessão) |
| `/login` | público | Entrar; aceita `?next=` para voltar à página de origem |
| `/cadastro` | público | Criar conta com consentimento LGPD; entra automaticamente |
| `/termos` | público | Termo de consentimento e privacidade |
| `/historico` | com login | Avaliações por exercício, variação e gráfico do 1RM; filtro `?exercicio=` |
| `/historico/:id` | com login | Detalhe de uma avaliação e exclusão |
| `/conta` | com login | Dados da conta, sair e excluir a conta |
| `*` | público | Página não encontrada |

Sem sessão, as rotas com login redirecionam para `/login?next=<rota>`.

## Decisões

- **Autenticação:** o backend devolve um JWT (HS256) que **expira em 60 minutos**, sem
  refresh token. O token fica no `localStorage` (`scouter-power:token`) para sobreviver a
  recarregamentos; se o storage estiver bloqueado, fica só em memória. O frontend lê o
  `exp` do token, faz logout automático quando ele vence e também ao receber 401 de uma
  chamada autenticada, avisando "Sua sessão expirou". Login e logout são sincronizados
  entre abas. Trade-off conhecido: `localStorage` é acessível a scripts da página, então a
  proteção contra XSS depende de não injetar HTML de terceiros (o React escapa o conteúdo
  por padrão). O parâmetro `next` só aceita caminhos internos (evita redirecionamento
  aberto).
- **Avaliação sem conta:** a avaliação anônima funciona e mostra o resultado; o aviso
  "Esta avaliação não foi salva." convida a criar conta. Com sessão, a API grava e devolve
  o `id`, e o resultado oferece "Ver no histórico". Se a sessão expirar durante o envio, o
  resultado avisa que não foi salvo.
- **RN03 (faixas de entrada):** as faixas ficam em `src/lib/rn03.ts`, idênticas às do
  backend: idade 16–90 anos (inteiro), massa 30–250 kg, estatura 1,20–2,30 m (opcional),
  carga 1–500 kg, repetições 1–12 (inteiro). O formulário valida antes de enviar (nenhuma
  requisição sai com dado inválido), aceita vírgula ou ponto e detecta estatura em
  centímetros. Erros 422 do servidor são traduzidos e mostrados no campo.
- **Falhas de rede (RF07):** rede, timeout (15 s) e 5xx mostram uma mensagem própria,
  mantêm o que foi digitado e oferecem "Tentar novamente". Consultas repetem até 2 vezes
  em erro de rede/5xx; o envio da avaliação não repete sozinho.
- **Acessibilidade:** rótulos visíveis em todos os campos, erros ligados ao campo
  (`aria-describedby`, `aria-invalid`) e anunciados, foco no primeiro campo com erro e no
  título do resultado, "Pular para o conteúdo", navegação completa por teclado, diálogos
  com foco preso e Esc, menu móvel que fecha com Esc. Verificado com axe nos testes E2E.
- **Desempenho:** cada página é um chunk carregado sob demanda; o resto do JavaScript
  inicial tem ~131 KiB gzip.

## Requisitos não funcionais

- RNF01 (usabilidade): protocolo do teste com usuários em
  [project/USABILIDADE_RNF01.md](../project/USABILIDADE_RNF01.md).
- RNF02 (desempenho): medições do frontend em
  [project/DESEMPENHO_FRONTEND_RNF02.md](../project/DESEMPENHO_FRONTEND_RNF02.md) e da API
  no [README do backend](../backend/README.md#desempenho-rnf02).
