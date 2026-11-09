# Scouter Power

Registro das tarefas da Sprint 1, com base no backlog e nas reuniões da equipe. O planejamento geral está no PDF da pasta `project/`.

## Como atualizar este documento

Escolha uma tarefa pendente da seção 5. Atualize seu estado e acrescente uma entrada ao registro de progresso no mesmo commit da mudança. Indique o resultado, a evidência e o que falta para o aceite.

## 5. Tarefas

| Sprint | Tarefa | Estado | Próximo passo |
|---|---|---|---|
| 1 | Treinar e comparar ao menos dois algoritmos | Em andamento | Ajustar hiperparâmetros, treinar regressão logística e SVM e testar a redução das variáveis do dataset. |
| 1 | RNF03 · Validar a qualidade do modelo | A fazer | Medir acurácia e F1 macro no conjunto de teste, com meta de 80% para ambas, e reportar desempenho por classe. |
| 1 | RNF02 · Medir o desempenho da API | A fazer | Medir o tempo de resposta da avaliação, com meta de 4 s em 95% das requisições em rede 4G. |

## Registro de progresso

- **09/11/2026** — Comparação de KNN, Random Forest e XGBoost com validação estratificada em cinco partes e 379 registros. F1 macro médio de 85,64%, 85,11% e 84,54%, respectivamente. Os dois modelos alternativos foram exportados com Joblib. As matrizes de confusão e as métricas completas estão em [model_comparison.json](../backend/data/model_comparison.json). A seleção para a API e o aceite do RNF03 dependem da avaliação em um conjunto de teste separado.
