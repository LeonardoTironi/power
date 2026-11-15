"""Histórico por exercício, variação de 1RM e isolamento entre usuários (RF09)."""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session

from app.models import Avaliacao, Exercicio, NivelForca, Sexo
from tests.conftest import autenticacao

HISTORICO = "/api/v1/avaliacoes/historico"


def _inserir(engine, usuario_id, exercicio, rm1, dia):
    """Insere uma avaliação direto no banco, com `criado_em` controlado."""
    with Session(engine) as sessao:
        avaliacao = Avaliacao(
            usuario_id=usuario_id,
            exercicio=exercicio,
            sexo=Sexo.MASCULINO,
            idade=30,
            massa_corporal_kg=80.0,
            carga_kg=rm1,
            repeticoes=1,
            rm1_estimado_kg=rm1,
            nivel=NivelForca.INTERMEDIARIO,
            versao_modelo="teste-v1",
            criado_em=datetime(2026, 1, dia, tzinfo=UTC),
        )
        sessao.add(avaliacao)
        sessao.commit()
        sessao.refresh(avaliacao)
        return avaliacao.id


def _id_do_usuario(client, token) -> uuid.UUID:
    return uuid.UUID(client.get("/api/v1/usuarios/me", headers=autenticacao(token)).json()["id"])


def test_historico_sem_token_retorna_401(client):
    assert client.get(HISTORICO).status_code == 401


def test_historico_vazio_para_usuario_sem_avaliacoes(client, usuario_token):
    resposta = client.get(HISTORICO, headers=autenticacao(usuario_token))

    assert resposta.status_code == 200
    assert resposta.json() == []


def test_historico_agrupa_por_exercicio(client, engine, usuario_token):
    usuario_id = _id_do_usuario(client, usuario_token)
    _inserir(engine, usuario_id, Exercicio.SUPINO, 100.0, 1)
    _inserir(engine, usuario_id, Exercicio.SUPINO, 105.0, 2)
    _inserir(engine, usuario_id, Exercicio.AGACHAMENTO, 140.0, 3)

    corpo = client.get(HISTORICO, headers=autenticacao(usuario_token)).json()

    por_exercicio = {grupo["exercicio"]: grupo for grupo in corpo}
    assert set(por_exercicio) == {"supino", "agachamento"}
    assert len(por_exercicio["supino"]["avaliacoes"]) == 2
    assert len(por_exercicio["agachamento"]["avaliacoes"]) == 1


def test_historico_ordena_por_criado_em(client, engine, usuario_token):
    usuario_id = _id_do_usuario(client, usuario_token)
    _inserir(engine, usuario_id, Exercicio.SUPINO, 110.0, 5)
    _inserir(engine, usuario_id, Exercicio.SUPINO, 100.0, 1)
    _inserir(engine, usuario_id, Exercicio.SUPINO, 105.0, 3)

    corpo = client.get(HISTORICO, headers=autenticacao(usuario_token)).json()

    rm1s = [item["rm1_estimado_kg"] for item in corpo[0]["avaliacoes"]]
    assert rm1s == [100.0, 105.0, 110.0]


def test_historico_variacao_e_ultimo_menos_primeiro(client, engine, usuario_token):
    usuario_id = _id_do_usuario(client, usuario_token)
    _inserir(engine, usuario_id, Exercicio.SUPINO, 100.0, 1)
    _inserir(engine, usuario_id, Exercicio.SUPINO, 107.5, 2)
    _inserir(engine, usuario_id, Exercicio.SUPINO, 110.0, 3)

    corpo = client.get(HISTORICO, headers=autenticacao(usuario_token)).json()

    assert corpo[0]["variacao_rm1_kg"] == 10.0


def test_historico_variacao_nula_com_uma_avaliacao(client, engine, usuario_token):
    usuario_id = _id_do_usuario(client, usuario_token)
    _inserir(engine, usuario_id, Exercicio.DEADLIFT, 150.0, 1)

    corpo = client.get(HISTORICO, headers=autenticacao(usuario_token)).json()

    assert corpo[0]["variacao_rm1_kg"] is None


def test_historico_filtra_por_exercicio(client, engine, usuario_token):
    usuario_id = _id_do_usuario(client, usuario_token)
    _inserir(engine, usuario_id, Exercicio.SUPINO, 100.0, 1)
    _inserir(engine, usuario_id, Exercicio.AGACHAMENTO, 140.0, 2)

    corpo = client.get(
        f"{HISTORICO}?exercicio=agachamento",
        headers=autenticacao(usuario_token),
    ).json()

    assert [grupo["exercicio"] for grupo in corpo] == ["agachamento"]


def test_historico_isolado_entre_usuarios(client, engine, cadastrar_usuario):
    token_a = cadastrar_usuario(email="a@exemplo.com")
    token_b = cadastrar_usuario(email="b@exemplo.com")
    _inserir(engine, _id_do_usuario(client, token_a), Exercicio.SUPINO, 100.0, 1)

    corpo_b = client.get(HISTORICO, headers=autenticacao(token_b)).json()

    assert corpo_b == []


def test_obter_avaliacao_propria_retorna_200(client, engine, usuario_token):
    usuario_id = _id_do_usuario(client, usuario_token)
    avaliacao_id = _inserir(engine, usuario_id, Exercicio.SUPINO, 100.0, 1)

    resposta = client.get(f"/api/v1/avaliacoes/{avaliacao_id}", headers=autenticacao(usuario_token))

    assert resposta.status_code == 200
    assert resposta.json()["id"] == str(avaliacao_id)


def test_obter_avaliacao_de_outro_usuario_retorna_404(client, engine, cadastrar_usuario):
    token_a = cadastrar_usuario(email="a@exemplo.com")
    token_b = cadastrar_usuario(email="b@exemplo.com")
    avaliacao_id = _inserir(engine, _id_do_usuario(client, token_a), Exercicio.SUPINO, 100.0, 1)

    resposta = client.get(f"/api/v1/avaliacoes/{avaliacao_id}", headers=autenticacao(token_b))

    assert resposta.status_code == 404


def test_excluir_avaliacao_de_outro_usuario_retorna_404_e_preserva(
    client, engine, cadastrar_usuario
):
    token_a = cadastrar_usuario(email="a@exemplo.com")
    token_b = cadastrar_usuario(email="b@exemplo.com")
    avaliacao_id = _inserir(engine, _id_do_usuario(client, token_a), Exercicio.SUPINO, 100.0, 1)

    resposta = client.delete(f"/api/v1/avaliacoes/{avaliacao_id}", headers=autenticacao(token_b))

    assert resposta.status_code == 404
    assert (
        client.get(f"/api/v1/avaliacoes/{avaliacao_id}", headers=autenticacao(token_a)).status_code
        == 200
    )


def test_excluir_avaliacao_propria_retorna_204(client, engine, usuario_token):
    usuario_id = _id_do_usuario(client, usuario_token)
    avaliacao_id = _inserir(engine, usuario_id, Exercicio.SUPINO, 100.0, 1)

    resposta = client.delete(
        f"/api/v1/avaliacoes/{avaliacao_id}", headers=autenticacao(usuario_token)
    )

    assert resposta.status_code == 204
    assert (
        client.get(
            f"/api/v1/avaliacoes/{avaliacao_id}", headers=autenticacao(usuario_token)
        ).status_code
        == 404
    )
