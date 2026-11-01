# Pesquisa de bases reais para o Scouter Power

Consulta realizada em 20/10/2026 e complementada em 24/10/2026 (seções 4 a 6). Relacionada a S1-ML-01 e às decisões abertas D1 e D2. Este levantamento não substitui o dataset nem define decisões da equipe.

## Resultado

**Existem dados reais com os seis campos pedidos.** A base acadêmica do Zenodo abaixo atende a idade, sexo, massa corporal, estatura, exercício e carga, mas é pequena e não cobre os três exercícios atuais. O OpenPowerlifting cobre supino, agachamento e levantamento terra em escala muito maior, porém não contém estatura.

Não foi confirmada nesta pesquisa uma base ampla, com os seis campos e os três exercícios do projeto, pronta para treinar a classificação prevista.

**Complemento de 24/10/2026:** a base de remadores juniores da Confederação Brasileira de Remo (seção 4) tem sexo, idade, massa corporal, estatura e 1RM nos três exercícios, com 235 atletas de 14 a 18 anos. Nenhuma fonte consultada traz carga e repetições junto com todos os dados antropométricos e um rótulo de nível validado.

| Fonte | Exercícios do projeto | Sexo | Idade | Massa | Estatura | Carga | Repetições | Rótulo de nível | Tamanho |
|---|---|---|---|---|---|---|---|---|---|
| Zenodo / Aalborg (1) | Supino | Sim | Sim | Sim | Sim | Sim | Sim | Não | 28 pessoas |
| OpenPowerlifting (2) | Os três | Sim | Opcional | Sim | Não | 1RM | — | Não | Muito grande |
| CrossFit (3) | Agachamento e terra | Sim | Sim | Sim | Sim | 1RM | — | Tempo de treino (`howlong`) | 1.640 linhas na cópia limpa |
| Remadores CBR (4) | Os três | Sim | Sim | Sim | Sim | 1RM | — | Não | 235 atletas |
| VBT powerlifting (5) | Os três | Não | Não | Só razão 1RM/massa | Não | Sim | Sim | Nível competitivo e anos de treino | 22 pessoas |
| Gym Members Exercise (6) | Nenhum | Sim | Sim | Sim | Sim | Não | Não | Experiência 1–3 | 973 |

## 1. Zenodo / Aalborg University — seis campos confirmados

Fonte: [3–7-repetition-maximum weight and repetitions from strength exercise tests](https://zenodo.org/records/3253731), DOI `10.5281/zenodo.3253731`, publicado em 2019.

Os arquivos públicos foram lidos diretamente, sem alterar ou importar dados no projeto:

- `Data.xlsx`: aba `3-7RM` com carga e repetições por exercício; `General descriptives` com dados demográficos.
- `ScalingData_all_measure_variables.xlsx`: `SUBJECT_NUMBER`, `GENDER`, `AGE-ANSUR88`, `WEIGHT`, `STATURE`.
- `README.txt` e `TestProtocol.txt`: descrição dos campos e protocolo de testes.

Conferência: **28 participantes**, **21 homens e 7 mulheres**, idades **21–58 anos**; 28 registros completos nos quatro campos demográficos e 28 com carga e repetições no supino. Sexo codificado como 1 = masculino e 2 = feminino. São 15 exercícios; há supino, mas não agachamento nem levantamento terra. Licença **CC BY 4.0**, confirmada nos metadados da API do Zenodo.

**Aplicação:** estudo piloto com todos os campos, especialmente supino. A quantidade de pessoas e o desequilíbrio por sexo limitam a avaliação. Vários exercícios de uma mesma pessoa não equivalem a participantes independentes.

## 2. OpenPowerlifting — melhor compatibilidade com o catálogo atual

Fontes: [download oficial](https://openpowerlifting.gitlab.io/opl-csv/bulk-csv.html), [dicionário oficial](https://openpowerlifting.gitlab.io/opl-csv/bulk-csv-docs.html) e [espelho no Kaggle](https://www.kaggle.com/datasets/open-powerlifting/powerlifting-database).

Resultados reais de competições. O espelho do Kaggle informa licença CC0 e snapshot de janeiro de 2024; prefira a distribuição oficial para selecionar e registrar uma versão.

| Campo do projeto | Campo na fonte |
|---|---|
| Idade | `Age`, opcional; há idades aproximadas |
| Sexo | `Sex`, categoria de competição |
| Massa corporal | `BodyweightKg` |
| Estatura | **Ausente** |
| Exercício | Transformar colunas de supino, agachamento e terra em linhas |
| Carga | `Best3BenchKg`, `Best3SquatKg`, `Best3DeadliftKg` ou tentativas individuais |

**Aplicação:** principal candidata para os três exercícios, se a equipe aceitar estatura fora dos atributos do modelo. São levantamentos de competição de uma repetição, não séries de academia. Filtrar cargas positivas, tratar ausências e distinguir equipamento. Valores negativos representam falhas. Atletas competitivos podem não representar iniciantes do público do produto.

## 3. CrossFit — alternativa com estatura, ainda exige auditoria

Há [CSV e dicionário no GitHub](https://github.com/Umair-Salim/Crossfit-Athletes-analysis) com `age`, `gender`, `height`, `weight`, `deadlift` e `backsq`. O dicionário informa polegadas para altura e libras para peso. O [relato do responsável por uma coleta de perfis do Open 2015](https://swift.pw/whats-normal-or-top-5-for-a-crossfit-athlete/) explica que os dados são opcionais e autodeclarados, sujeitos a viés de preenchimento.

**Aplicação:** candidata exploratória para altura e desempenho. Não foi auditado o CSV completo nem confirmada a licença de redistribuição desta cópia. Não há confirmação de supino nesse esquema. Não tratar os valores como medições supervisionadas. A [página Crossfit Games no Kaggle](https://www.kaggle.com/datasets/jeanmidev/crossfit-games) não forneceu conteúdo suficiente nesta consulta para validar o esquema; versões diferentes não devem ser consideradas equivalentes.

**Auditoria de 24/10/2026:** o repositório declara que os dados vêm do Kaggle [CrossFit Athletes](https://www.kaggle.com/datasets/ulrikthygepedersen/crossfit-athletes). O arquivo `cleaned_athletes.csv` tem 1.640 linhas e as colunas `gender`, `age`, `height`, `weight`, `deadlift`, `backsq`, `candj`, `snatch` e `howlong`, entre outras. Não há supino. Distribuição de `howlong`: menos de 6 meses 13, 6–12 meses 39, 1–2 anos 278, 2–4 anos 681, 4+ anos 620, recusou responder 9. O tempo de treino pode apoiar a definição de rótulos, mas é autodeclarado e tem poucos iniciantes. A licença da cópia continua sem confirmação.

## 4. Remadores juniores da CBR — seis campos e os três exercícios

Fonte: [figshare, DOI `10.6084/m9.figshare.21528798`](https://doi.org/10.6084/m9.figshare.21528798), base usada em [artigo da PLOS ONE de 2023](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0286687). Licença **CC BY 4.0**, confirmada nos metadados da API do figshare. Os dados vêm do Sistema Nacional de Avaliação do Remo (SNAR) da Confederação Brasileira de Remo.

O arquivo `raw.data.csv` (28 KB, separador `;`, decimal com vírgula) foi baixado e conferido: **235 linhas**. Colunas relevantes:

| Campo do projeto | Campo na fonte |
|---|---|
| Idade | `Age (yrs)`, com decimais |
| Sexo | `Sex` (`M`/`F`) |
| Massa corporal | `Weight (Kg)` |
| Estatura | `Stature (cm)` |
| Exercício e carga | `1_RM_Squat (kg)`, `1_RM_Deadlift (kg)`, `1_RM_Bench_Press (kg)` |
| Repetições | **Ausente**; o valor já é 1RM |

O artigo informa 171 homens e 64 mulheres, idade média 17,0 ± 1,1 ano. Há também remoada no ergômetro, envergadura e maturação biológica.

**Aplicação:** única fonte encontrada com estatura e os três exercícios do catálogo. Serve para testar estatura como atributo. Limites: atletas de remo adolescentes, fora do público do produto; não há rótulo de nível; o 1RM medido corresponde ao 1RM estimado por Epley a partir das séries do usuário, não às repetições.

## 5. VBT powerlifting (Zenodo) — referência para validar rótulos

Fonte: [Raw data + R-code: Sources of prediction error in velocity-based 1RM estimation for squat, bench press, and deadlift](https://zenodo.org/records/22184533). Licença **CC BY 4.0**, confirmada nos metadados da API do Zenodo.

Arquivos conferidos:

- `desc_data_public.csv`: 22 participantes com `rt.exp` (anos de treino resistido), `pl.exp` (anos de powerlifting), `pl.level` (`REC`, `REG`, `NAT`, `INT`) e razão 1RM/massa corporal em agachamento, supino e terra (`1RMSQ/BM`, `1RMBP/BM`, `1RMDL/BM`).
- `data_public.csv`: 16.303 repetições com `participant`, `exercise`, `set`, `rep`, `load`, velocidade média e RPE.

Sem idade, sexo, massa corporal absoluta ou estatura.

**Aplicação:** não serve como base de treino do formulário, mas permite comparar faixas de força relativa com experiência e nível competitivo reais ao justificar os critérios da RN02.

## 6. Bases descartadas

- [Gym Members Exercise Dataset](https://baselight.app/u/kaggle/dataset/valakhorasani_gym_members_exercise_dataset) (Kaggle, 973 registros): tem idade, sexo, peso, altura e nível de experiência 1–3, mas nenhuma carga ou exercício de força. Colunas conferidas apenas em páginas de agregadores.
- [PERSIST](https://zenodo.org/record/7437230): antropometria de praticantes treinados, mas acesso restrito a pesquisadores.
- Registros de treino em formato aberto ([OpenWeight](https://awesome.ecosyste.ms/projects/github.com%2Fradupana%2Fopenweight), [MasterMedo/workouts](https://github.com/MasterMedo/workouts)): são formatos de log, sem dados de população nem rótulos.

## Implicações para o treinamento

O código atual aprende `nivel` a partir de `levantamento`, `genero`, `idade`, `peso` e `carga`. Não usa estatura. A origem e o significado da carga e dos rótulos do CSV atual continuam sem comprovação.

1. **Definir o alvo:** carga observada, 1RM e nível de força são conceitos distintos. Para comparar séries do usuário com resultados de competição, usar uma definição consistente de desempenho, considerando também as repetições.
2. **Definir os rótulos:** as fontes verificadas não entregam uma classificação validada nos três níveis do projeto. Percentis podem gerar rótulos relativos à população escolhida, mas não demonstram experiência de treinamento. A equipe precisa definir e justificar os critérios da RN02.
3. **Evitar avaliação circular:** se os rótulos forem criados por uma regra que usa os mesmos atributos do modelo, alta acurácia pode apenas mostrar que o modelo reproduz essa regra. Comparar com a própria regra como referência.
4. **Separar por participante:** manter todos os exercícios e participações da mesma pessoa em um único conjunto de treino ou teste para reduzir vazamento.
5. **Não fabricar estatura:** juntar dados de pessoas diferentes por idade, sexo e peso não recupera a altura real de um atleta.

Recomendação técnica: avaliar OpenPowerlifting para o catálogo atual e Zenodo como piloto com todos os campos. Se estatura for obrigatória no treinamento dos três exercícios, ainda será necessário localizar outra fonte verificada ou coletar dados próprios. D1 e D2 permanecem abertas.

Atualização de 24/10/2026: a base da CBR (seção 4) atende estatura nos três exercícios, mas só para atletas adolescentes. Para manter as mesmas entradas no treino e na inferência, treinar com 1RM e converter carga e repetições do usuário pela fórmula de Epley antes do modelo. Os rótulos continuam a depender da regra da RN02; a seção 5 e o `howlong` do CrossFit servem para conferi-los.

## Evidência e limites da consulta

As planilhas do Zenodo foram inspecionadas em memória com pandas: cabeçalhos, quantidade de participantes, campos completos, distribuição por sexo e faixa etária; a licença foi consultada em `https://zenodo.org/api/records/3253731`. Nenhuma base foi incorporada ao repositório e nenhum modelo foi retreinado. OpenPowerlifting foi verificado pelo dicionário e páginas de distribuição, sem baixar o arquivo integral. O levantamento é de viabilidade, não uma auditoria completa de qualidade de todas as bases.

Em 24/10/2026, os arquivos da CBR (figshare), do VBT (Zenodo) e a cópia limpa do CrossFit (GitHub) foram baixados para uma pasta temporária fora do repositório e lidos para conferir cabeçalhos, contagens e a distribuição de `howlong`. As licenças da CBR e do VBT foram consultadas em `https://api.figshare.com/v2/articles/21528798` e `https://zenodo.org/api/records/22184533`. A base original do Kaggle do CrossFit não foi baixada. Nenhum dado foi incorporado ao projeto e nenhum modelo foi retreinado.
