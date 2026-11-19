# Scouter Power

Registro das tarefas da Sprint 1, com base no backlog e nas reuniões da equipe. O planejamento geral está no PDF da pasta `project/`.

## Como atualizar este documento

Escolha uma tarefa pendente da seção 5. Atualize seu estado e acrescente uma entrada ao registro de progresso no mesmo commit da mudança. Indique o resultado, a evidência e o que falta para o aceite.

## 5. Tarefas

| Sprint | Tarefa | Estado | Próximo passo |
|---|---|---|---|
| 1 | Treinar e comparar ao menos dois algoritmos | Concluída | Cinco algoritmos comparados. O SVM é o modelo padrão da API, escolhido pelo teste separado do RNF03. |
| 1 | RNF03 · Validar a qualidade do modelo | Concluída | Os três modelos passam de 80% de acurácia e F1 macro no conjunto de teste separado. |
| 1 | RNF02 · Medir o desempenho da API | Em andamento | Meta atingida com rede 4G estimada. Para o aceite, repetir a medição com a API publicada e um aparelho em 4G real ou com throttling do navegador. |

## Registro de progresso

- **09/11/2026** — Comparação de KNN, Random Forest e XGBoost com validação estratificada em cinco partes e 379 registros. F1 macro médio de 85,64%, 85,11% e 84,54%, respectivamente. Os dois modelos alternativos foram exportados com Joblib. As matrizes de confusão e as métricas completas estão em [model_comparison.json](../backend/data/model_comparison.json). A seleção para a API e o aceite do RNF03 dependem da avaliação em um conjunto de teste separado.
- **11/11/2026** — Busca de 174 combinações de hiperparâmetros por acurácia. A validação cruzada aninhada usou três divisões internas e as mesmas cinco divisões externas da comparação anterior. A acurácia do Random Forest subiu de 85,48% para 89,70%, com F1 macro de 89,52%. O XGBoost subiu de 84,69% para 88,66%, e o KNN caiu de 86,01% para 83,11%. O Random Forest ajustado é o candidato para o teste separado. Configurações, métricas e arquivos exportados estão registrados em [model_tuning.json](../backend/data/model_tuning.json).
- **12/11/2026** — A busca ampliada de regressão logística e SVM avaliou 130 configurações em seis repetições de validação cruzada aninhada. A acurácia média passou de 92,70% para 92,74% na regressão logística e de 91,86% para 92,21% no SVM. A regressão logística obteve o maior F1 macro médio, de 92,57%, e segue como primeira candidata ao teste separado. As métricas por semente e os parâmetros dos modelos exportados estão no [relatório](../backend/data/logistic_svm_tuning.json).
- **13/11/2026** — Teste da redução das variáveis do dataset. Para cada modelo, 16 subconjuntos de variáveis foram avaliados, sempre com levantamento e carga, em validação cruzada aninhada com seis sementes. A acurácia do KNN subiu de 84,74% para 90,98%. A regressão logística caiu de 92,83% para 92,21%, e o SVM ficou estável, de 92,30% para 92,39%. A regressão logística segue com todas as variáveis. Resultados em [feature_selection_tuning.json](../backend/data/feature_selection_tuning.json).
- **14/11/2026** — Mantidos os arquivos Joblib do KNN usado pela API, da regressão logística ajustada e do SVM ajustado. Removidas as duas versões exportadas de Random Forest e XGBoost e a variante ajustada do KNN, que teve acurácia menor na comparação. Os relatórios anteriores registram o histórico dos experimentos.
- **16/11/2026** — Preparados três scripts de treino no backend para a entrega da atividade, com versões de dependências fixadas e comandos no README. Os modelos gerados em uma pasta de verificação produziram as mesmas previsões que os arquivos versionados em todos os 379 registros.
- **19/11/2026** — Medido o tempo de resposta de `POST /api/v1/avaliacoes` (RNF02) com o script `benchmark_api.py`: 1.000 requisições por cenário, anônimas e autenticadas, com 1 e 10 simultâneas, API e PostgreSQL 17 locais. O p95 local ficou entre 16,5 ms e 250,7 ms. Somando a rede estimada do perfil Slow 4G do Lighthouse com conexão nova, o p95 máximo foi de 859,9 ms; no perfil 4G degradado (400 ms de RTT), de 1.886,3 ms. Todas as requisições ficaram abaixo de 4 s. Método e números no [README do backend](../backend/README.md#desempenho-rnf02) e em [benchmark_api.json](../backend/data/benchmark_api.json). Falta confirmar com a API publicada e uma conexão 4G real.
- **19/11/2026** — Avaliação do RNF03 em conjunto de teste separado, com o script `evaluate_models.py`: 76 dos 379 registros, a mesma divisão de teste do KNN. A regressão logística, modelo padrão da API, teve 90,79% de acurácia e 90,47% de F1 macro. O SVM teve 96,05% e 95,99%, e o KNN, 86,84% e 86,83%. Todos atingem a meta de 80%. O SVM teve o melhor resultado no teste, principalmente na classe intermediária (94,55% de F1, contra 86,27% da regressão logística), e é o modelo recomendado para a API. Os hiperparâmetros da regressão logística e do SVM foram escolhidos com o CSV inteiro, o que pode deixar esses resultados um pouco otimistas. Métricas por classe no [README do backend](../backend/README.md#qualidade-do-modelo-rnf03) e em [test_evaluation.json](../backend/data/test_evaluation.json).
- **19/11/2026** — A API passou a usar o SVM ajustado (`svm_tuned_model.joblib`, versão `svm_tuned-v1`) no lugar da regressão logística, conforme a avaliação do RNF03. Os 91 testes do backend passam com o SVM, e uma previsão leva cerca de 2 ms, como na regressão logística.
