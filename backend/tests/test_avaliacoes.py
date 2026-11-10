"""POST /api/v1/avaliacoes: classificação (RF05/RF06), faixas RN03, aviso RN04, RNF06."""

import uuid

import pytest
from sqlmodel import Session, func, select

from app.core.config import settings
from app.models import Avaliacao, NivelForca
from tests.conftest import autenticacao

AVALIACOES = "/api/v1/avaliacoes"

ENTRADA_VALIDA = {
    "exercicio": "supino",
    "sexo": "m",
    "idade": 30,
    "massa_corporal_kg": 80.0,
    "estatura_m": 1.78,
    "carga_kg": 80.0,
    "repeticoes": 8,
}


def _entrada(**sobrescrever):
    return {**ENTRADA_VALIDA, **sobrescrever}


def test_exercicios_lista_o_catalogo(client):
    resposta = client.get("/api/v1/exercicios")

    assert resposta.status_code == 200
    valores = {item["valor"] for item in resposta.json()}
    assert valores == {"supino", "agachamento", "deadlift"}
    assert all("rotulo" in item for item in resposta.json())


def test_post_anonimo_retorna_200_com_resultado_completo(client):
    resposta = client.post(AVALIACOES, json=ENTRADA_VALIDA)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["exercicio"] == "supino"
    assert corpo["nivel"] in {n.value for n in NivelForca}
    assert corpo["rm1_estimado_kg"] == 101.3  # RN01: 80 kg x 8 reps
    assert corpo["explicacao"]
    assert "aviso" in corpo and corpo["aviso"]  # RN04
    assert corpo["versao_modelo"] == settings.model_version  # RNF06
    assert corpo.get("id") is None


def test_post_anonimo_nao_persiste(client, engine):
    assert client.post(AVALIACOES, json=ENTRADA_VALIDA).status_code == 200

    with Session(engine) as sessao:
        total = sessao.exec(select(func.count()).select_from(Avaliacao)).one()
    assert total == 0


def test_post_com_token_invalido_trata_como_anonimo(client, engine):
    resposta = client.post(
        AVALIACOES,
        json=ENTRADA_VALIDA,
        headers=autenticacao("token-invalido"),
    )

    assert resposta.status_code == 200
    assert resposta.json().get("id") is None


def test_post_autenticado_persiste_e_devolve_id(client, engine, usuario_token):
    resposta = client.post(AVALIACOES, json=ENTRADA_VALIDA, headers=autenticacao(usuario_token))

    assert resposta.status_code == 200
    avaliacao_id = uuid.UUID(resposta.json()["id"])
    with Session(engine) as sessao:
        gravada = sessao.get(Avaliacao, avaliacao_id)
    assert gravada is not None
    assert gravada.rm1_estimado_kg == 101.3
    assert gravada.versao_modelo == settings.model_version


@pytest.mark.parametrize(
    "sobrescrever",
    [
        {"idade": 15},
        {"idade": 91},
        {"massa_corporal_kg": 29.9},
        {"massa_corporal_kg": 250.1},
        {"carga_kg": 0.5},
        {"carga_kg": 500.5},
        {"repeticoes": 0},
        {"repeticoes": 13},
        {"estatura_m": 1.19},
        {"estatura_m": 2.31},
        {"exercicio": "rosca"},
    ],
)
def test_fora_das_faixas_rn03_retorna_422(client, sobrescrever):
    resposta = client.post(AVALIACOES, json=_entrada(**sobrescrever))

    assert resposta.status_code == 422


@pytest.mark.parametrize(
    "sobrescrever",
    [
        {"idade": 16},
        {"idade": 90},
        {"massa_corporal_kg": 30.0},
        {"massa_corporal_kg": 250.0},
        {"carga_kg": 1.0},
        {"repeticoes": 1},
        {"repeticoes": 12},
    ],
)
def test_limites_das_faixas_rn03_sao_aceitos(client, sobrescrever):
    resposta = client.post(AVALIACOES, json=_entrada(**sobrescrever))

    assert resposta.status_code == 200, resposta.text


def test_sem_modelo_retorna_503(client):
    client.app.state.modelo = None

    resposta = client.post(AVALIACOES, json=ENTRADA_VALIDA)

    assert resposta.status_code == 503
