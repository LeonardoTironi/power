"""Conta do usuário autenticado: consulta e exclusão com cascata (RNF05)."""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, func, select

from app.models import Avaliacao, Exercicio, NivelForca, Sexo, Usuario
from tests.conftest import EMAIL_PADRAO, SENHA_PADRAO, autenticacao


def _inserir_avaliacao(engine, usuario_id: uuid.UUID) -> None:
    with Session(engine) as sessao:
        sessao.add(
            Avaliacao(
                usuario_id=usuario_id,
                exercicio=Exercicio.SUPINO,
                sexo=Sexo.MASCULINO,
                idade=30,
                massa_corporal_kg=80.0,
                carga_kg=80.0,
                repeticoes=8,
                rm1_estimado_kg=101.3,
                nivel=NivelForca.INTERMEDIARIO,
                versao_modelo="teste-v1",
                criado_em=datetime(2026, 1, 1, tzinfo=UTC),
            )
        )
        sessao.commit()


def test_me_retorna_dados_do_usuario_logado(client, usuario_token):
    resposta = client.get("/api/v1/usuarios/me", headers=autenticacao(usuario_token))

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["email"] == EMAIL_PADRAO
    assert corpo["nome"] == "Ana"
    assert "senha_hash" not in corpo
    assert "senha" not in corpo


def test_me_sem_token_retorna_401(client):
    assert client.get("/api/v1/usuarios/me").status_code == 401


def test_me_com_token_invalido_retorna_401(client):
    resposta = client.get("/api/v1/usuarios/me", headers=autenticacao("token.invalido.aqui"))

    assert resposta.status_code == 401


def test_delete_me_retorna_204_e_remove_conta(client, usuario_token):
    resposta = client.delete("/api/v1/usuarios/me", headers=autenticacao(usuario_token))

    assert resposta.status_code == 204
    login = client.post(
        "/api/v1/auth/login",
        json={"email": EMAIL_PADRAO, "senha": SENHA_PADRAO},
    )
    assert login.status_code == 401


def test_delete_me_apaga_avaliacoes_em_cascata(client, engine, usuario_token):
    usuario_id = uuid.UUID(
        client.get("/api/v1/usuarios/me", headers=autenticacao(usuario_token)).json()["id"]
    )
    _inserir_avaliacao(engine, usuario_id)
    _inserir_avaliacao(engine, usuario_id)

    resposta = client.delete("/api/v1/usuarios/me", headers=autenticacao(usuario_token))

    assert resposta.status_code == 204
    with Session(engine) as sessao:
        avaliacoes = sessao.exec(
            select(func.count()).select_from(Avaliacao).where(Avaliacao.usuario_id == usuario_id)
        ).one()
        usuarios = sessao.exec(
            select(func.count()).select_from(Usuario).where(Usuario.id == usuario_id)
        ).one()
    assert avaliacoes == 0
    assert usuarios == 0


def test_delete_me_nao_afeta_outro_usuario(client, engine, cadastrar_usuario):
    token_a = cadastrar_usuario(email="a@exemplo.com")
    token_b = cadastrar_usuario(email="b@exemplo.com")
    id_b = uuid.UUID(client.get("/api/v1/usuarios/me", headers=autenticacao(token_b)).json()["id"])
    _inserir_avaliacao(engine, id_b)

    assert client.delete("/api/v1/usuarios/me", headers=autenticacao(token_a)).status_code == 204

    assert client.get("/api/v1/usuarios/me", headers=autenticacao(token_b)).status_code == 200
    with Session(engine) as sessao:
        restantes = sessao.exec(
            select(func.count()).select_from(Avaliacao).where(Avaliacao.usuario_id == id_b)
        ).one()
    assert restantes == 1


def test_delete_me_sem_token_retorna_401(client):
    assert client.delete("/api/v1/usuarios/me").status_code == 401
