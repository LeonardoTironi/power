# Scouter Power

Aplicação web que estima a carga máxima para uma repetição (1RM) e classifica o
nível de força em musculação como iniciante, intermediário ou avançado. A
classificação usa um modelo de Machine Learning treinado com dados de supino,
agachamento e levantamento terra.

Projeto da disciplina Construção de Aplicações Utilizando Frameworks, do curso
de Análise e Desenvolvimento de Sistemas do Instituto Federal do Paraná.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `backend/` | API em FastAPI, banco PostgreSQL, modelos de classificação e scripts de treino |
| `project/` | Requisitos, tecnologias, planejamento e registro de progresso |

O planejamento das sprints e o registro de progresso estão em
[project/PLANEJAMENTO.md](project/PLANEJAMENTO.md).

## Tecnologias

- **Backend:** Python, FastAPI, Uvicorn, Pydantic e SQLModel.
- **Persistência:** PostgreSQL.
- **Machine Learning:** scikit-learn, pandas e Joblib.
- **Testes:** pytest.

## Como executar o backend

Com Python 3.12 e Docker instalados, execute na pasta `backend`:

```bash
python -m venv venv
venv\Scripts\activate        # Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
docker compose up -d
uvicorn app.main:app --reload
```

A API fica em `http://localhost:8000` e a documentação interativa em
`http://localhost:8000/docs`. Configuração, endpoints, testes, desempenho e
modelos estão no [README do backend](backend/README.md).

## Modelos

A API usa um SVM ajustado (`backend/data/svm_tuned_model.joblib`). Também ficam
no repositório o KNN e a regressão logística. Os três passam de 80% de acurácia
e F1 macro no conjunto de teste separado (RNF03). Os resultados e os comandos
para reproduzir o treino estão no [README do backend](backend/README.md#modelos-de-força).

## Equipe

| Integrante | Responsabilidades |
|---|---|
| Leonardo Tironi Neto | Liderança técnica, backend, regras de negócio, banco e autenticação |
| Marcelo Ribeiro Martins | Frontend, experiência do usuário e acessibilidade |
| Luiz Gustavo Silva Kryszczun | Critérios de aceite, métricas e testes de Machine Learning, auditoria do dataset |

## Licença

Distribuído sob a licença Apache 2.0. Veja [LICENSE](LICENSE).
