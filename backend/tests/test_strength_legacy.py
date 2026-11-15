"""Endpoint legado POST /api/v1/strength/analyze, usado pelo frontend atual."""

import pytest

STRENGTH = "/api/v1/strength/analyze"

PAYLOAD = {
    "exercicio": "supino",
    "genero": "m",
    "idade": 30,
    "peso_corporal": 80.0,
    "peso_exercicio": 100.0,
    "repeticoes": 5,
}


def test_analyze_retorna_formato_legado(client):
    resposta = client.post(STRENGTH, json=PAYLOAD)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert set(corpo) == {"rm1_estimado_kg", "classificacao", "formula_utilizada"}
    assert corpo["formula_utilizada"] == "epley"
    assert corpo["classificacao"] in {"Iniciante", "Intermediario", "Avancado"}


def test_analyze_aplica_epley_com_uma_casa_decimal(client):
    # RN01: 100 kg x 5 reps -> 100 * (1 + 5/30) = 116.67 -> 116.7
    resposta = client.post(STRENGTH, json=PAYLOAD)

    assert resposta.json()["rm1_estimado_kg"] == 116.7


def test_analyze_com_uma_repeticao_devolve_a_carga(client):
    resposta = client.post(STRENGTH, json={**PAYLOAD, "repeticoes": 1})

    assert resposta.json()["rm1_estimado_kg"] == 100.0


@pytest.mark.parametrize(
    "sobrescrever",
    [
        {"idade": -5},  # abaixo de 16 (RN03)
        {"idade": 91},
        {"peso_corporal": 29.0},
        {"repeticoes": 13},
        {"exercicio": "rosca"},
        {"genero": "x"},
    ],
)
def test_analyze_fora_das_faixas_retorna_422(client, sobrescrever):
    resposta = client.post(STRENGTH, json={**PAYLOAD, **sobrescrever})

    assert resposta.status_code == 422


def test_analyze_sem_modelo_retorna_503(client):
    client.app.state.modelo = None

    assert client.post(STRENGTH, json=PAYLOAD).status_code == 503
