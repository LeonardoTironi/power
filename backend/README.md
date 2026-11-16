# Scouter Power — API (backend)

API FastAPI que estima o 1RM (fórmula de Epley) e classifica o nível de força de um
atleta com um modelo de Machine Learning. Usuários autenticados podem guardar o
histórico das avaliações; o uso anônimo não grava nada.

## Requisitos

- Python 3.12 ou superior
- PostgreSQL 17 (opcional para os testes; o `docker-compose.yml` sobe um)

## Instalação

Na pasta `backend`:

```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
# Para rodar os testes e o linter:
pip install -r requirements-dev.txt
```

`requirements-ml.txt` e `requirements-training.txt` são usados só para treinar e
comparar modelos (veja a seção "Modelos de força").

## Configuração

Copie o arquivo de exemplo e ajuste os valores:

```bash
cp .env.example .env
```

| Variável | Padrão | Descrição |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173` | Origens do frontend, separadas por vírgula, sem barra final. |
| `DATABASE_URL` | `postgresql+psycopg://scouter:scouter@localhost:5432/scouter_power` | Conexão com o PostgreSQL. |
| `MODEL_PATH` | `data/logistic_regression_tuned_model.joblib` | Pipeline do modelo. Caminho relativo à pasta `backend`. |
| `MODEL_VERSION` | `logistic_regression_tuned-v1` | Versão devolvida em `versao_modelo` (RNF06). |
| `JWT_SECRET` | — | Chave de assinatura dos tokens. Use um valor longo e aleatório em produção. |
| `JWT_EXPIRA_MINUTOS` | `60` | Validade do token de acesso. |

Sem PostgreSQL no ar, a API sobe normalmente: as avaliações anônimas continuam
funcionando, e `/api/v1/health` informa `banco_disponivel: false`.

## Executar

Banco de dados (opcional):

```bash
docker compose up -d db
```

API:

```bash
uvicorn app.main:app --reload
```

Documentação interativa (Swagger): `http://localhost:8000/docs`. O botão
"Authorize" usa o formulário OAuth2 em `/api/v1/auth/token`.

## Endpoints

Todos os caminhos começam com `/api/v1`.

### Sistema

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/health` | Estado da API: `status`, `banco_disponivel`, `modelo_carregado`, `versao_modelo`. |
| GET | `/exercicios` | Catálogo de exercícios suportados (`valor`, `rotulo`). |

### Avaliações

| Método | Caminho | Autenticação | Descrição |
|---|---|---|---|
| POST | `/avaliacoes` | Opcional | Classifica uma avaliação e devolve `nivel`, `rm1_estimado_kg`, `explicacao`, `aviso` e `versao_modelo`. Com token válido, a avaliação é gravada e o `id` é devolvido. |
| GET | `/avaliacoes/historico?exercicio=` | Obrigatória | Histórico agrupado por exercício, em ordem cronológica. `variacao_rm1_kg` (último − primeiro) aparece com duas ou mais avaliações (RF09). |
| GET | `/avaliacoes/{id}` | Obrigatória | Uma avaliação do próprio usuário. Outro usuário recebe 404. |
| DELETE | `/avaliacoes/{id}` | Obrigatória | Remove uma avaliação do próprio usuário (204). Outro usuário recebe 404. |

Entrada de `POST /avaliacoes` (faixas da RN03; fora delas, 422):

| Campo | Tipo | Faixa |
|---|---|---|
| `exercicio` | `supino`, `agachamento`, `deadlift` | — |
| `sexo` | `m`, `f` | — |
| `idade` | inteiro | 16 a 90 |
| `massa_corporal_kg` | número | 30 a 250 |
| `estatura_m` | número, opcional | 1,20 a 2,30 |
| `carga_kg` | número | 1 a 500 |
| `repeticoes` | inteiro | 1 a 12 |

Se o modelo não estiver carregado, a resposta é 503.

### Autenticação e conta

| Método | Caminho | Descrição |
|---|---|---|
| POST | `/auth/cadastro` | Cria a conta (201). Exige `consentimento_lgpd: true` (senão, 422). E-mail repetido: 409. A senha é guardada só como hash Argon2. |
| POST | `/auth/login` | Login em JSON (`{"email", "senha"}`). Devolve `access_token` (Bearer). Credenciais inválidas: 401. |
| POST | `/auth/token` | Mesmo login, em formulário OAuth2 (`username` = e-mail). Usado pelo Swagger. |
| GET | `/usuarios/me` | Dados públicos do usuário logado. |
| DELETE | `/usuarios/me` | Exclui a conta e todas as avaliações em cascata (204) (RNF05). |

### Endpoint legado

| Método | Caminho | Descrição |
|---|---|---|
| POST | `/strength/analyze` | Formato antigo, usado pelo frontend atual. Entrada: `exercicio`, `genero`, `idade`, `peso_corporal`, `peso_exercicio`, `repeticoes`. Saída: `rm1_estimado_kg`, `classificacao`, `formula_utilizada`. |

### Exemplo

```bash
curl -X POST http://localhost:8000/api/v1/avaliacoes \
  -H "Content-Type: application/json" \
  -d '{"exercicio": "supino", "sexo": "m", "idade": 30, "massa_corporal_kg": 80,
       "carga_kg": 80, "repeticoes": 8}'
```

Resposta (resumida): `"rm1_estimado_kg": 101.3`, com `aviso` informativo em todas as
respostas (RN04). O resultado não substitui avaliação médica ou profissional.

## Testes

Os testes não precisam de PostgreSQL: usam SQLite em memória, injetado em
`get_session`, e o modelo `data/logistic_regression_tuned_model.joblib`.

```bash
venv\Scripts\python.exe -m pytest
```

Lint:

```bash
venv\Scripts\python.exe -m ruff check app tests
```

Os testes ficam em `tests/`:

- `test_models.py`: validação das faixas da RN03, enums e DDL do PostgreSQL.
- `test_epley.py`: fórmula de Epley e arredondamento (RN01).
- `test_avaliacoes.py`: classificação anônima e autenticada, 422 nas faixas, 503 sem modelo.
- `test_strength_legacy.py`: endpoint legado `/strength/analyze`.
- `test_auth.py`: cadastro, duplicidade, consentimento, login e hash da senha.
- `test_usuarios.py`: `/usuarios/me` e exclusão em cascata.
- `test_historico.py`: agrupamento, variação de 1RM e isolamento entre usuários.
- `test_health.py`: `/health` com e sem banco.

`tests/conftest.py` fixa o modelo e o banco de teste, então os resultados não
dependem do `.env` local.

## Modelos de força

Os três modelos estão em `data/`:

- KNN (`knn_model.joblib`).
- Regressão logística (`logistic_regression_tuned_model.joblib`), usado pela API por padrão.
- SVM (`svm_tuned_model.joblib`).

Para reproduzir os três modelos, use Python 3.12 em um ambiente virtual e
execute na pasta `backend`:

```bash
python -m pip install -r requirements-training.txt
python train_model.py
python train_logistic_regression.py
python train_svm.py
```

Cada script lê `data/dataset.csv` e grava o pipeline treinado no arquivo Joblib
correspondente. Use `--dataset` para escolher outro CSV e `--output` para gerar
uma cópia em outro caminho. O KNN usa 80% dos registros para treino, com semente
42. A regressão logística e o SVM usam todo o CSV com os hiperparâmetros
selecionados no experimento.

Para experimentar a regressão logística ou o SVM, execute a partir da pasta
`backend` com as dependências de treino instaladas:

```python
import joblib
import pandas as pd

modelo = joblib.load("data/logistic_regression_tuned_model.joblib")
amostra = pd.DataFrame([{
    "levantamento": "supino", "genero": "m", "idade": 30,
    "peso": 80.0, "carga": 100.0,
}])
print(modelo.predict(amostra)[0])
```

Para reproduzir os experimentos, instale `requirements-ml.txt` na pasta
`backend`. Execute `python tune_logistic_svm.py` para comparar as buscas inicial e
ampliada de regressão logística e SVM em seis sementes. As duas buscas usam
as mesmas divisões externas em cada semente. O relatório
`data/logistic_svm_tuning.json` inclui métricas por semente e os parâmetros
dos modelos exportados após o ajuste com o CSV completo.

Os relatórios `data/model_comparison.json` e `data/model_tuning.json`
registram os experimentos anteriores. Para reproduzi-los, execute
`python compare_models.py --output-dir ../tmp/model-comparison` ou
`python tune_models.py --output-dir ../tmp/model-tuning`.
