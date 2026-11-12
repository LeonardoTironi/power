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
- **11/11/2026** — Busca de 174 combinações de hiperparâmetros por acurácia. A validação cruzada aninhada usou três divisões internas e as mesmas cinco divisões externas da comparação anterior. A acurácia do Random Forest subiu de 85,48% para 89,70%, com F1 macro de 89,52%. O XGBoost subiu de 84,69% para 88,66%, e o KNN caiu de 86,01% para 83,11%. O Random Forest ajustado é o candidato para o teste separado. Configurações, métricas e arquivos exportados estão registrados em [model_tuning.json](../backend/data/model_tuning.json).
