"""Cadastro, login e hash de senha (RF08, RNF05)."""

from sqlmodel import Session, select

from app.models.usuario import Usuario
from tests.conftest import EMAIL_PADRAO, SENHA_PADRAO

CADASTRO = "/api/v1/auth/cadastro"
LOGIN = "/api/v1/auth/login"
TOKEN = "/api/v1/auth/token"


def _payload(**sobrescrever):
    dados = {
        "nome": "Ana",
        "email": EMAIL_PADRAO,
        "senha": SENHA_PADRAO,
        "consentimento_lgpd": True,
    }
    return {**dados, **sobrescrever}


def test_cadastro_retorna_201_sem_expor_senha(client):
    resposta = client.post(CADASTRO, json=_payload())

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["email"] == EMAIL_PADRAO
    assert corpo["nome"] == "Ana"
    assert "id" in corpo
    assert "senha" not in corpo
    assert "senha_hash" not in corpo


def test_cadastro_email_duplicado_retorna_409(client):
    assert client.post(CADASTRO, json=_payload()).status_code == 201

    resposta = client.post(CADASTRO, json=_payload(nome="Outra"))

    assert resposta.status_code == 409


def test_cadastro_email_duplicado_ignora_maiusculas(client):
    assert client.post(CADASTRO, json=_payload()).status_code == 201

    resposta = client.post(CADASTRO, json=_payload(email="ANA@Exemplo.com"))

    assert resposta.status_code == 409


def test_cadastro_sem_consentimento_retorna_422(client):
    resposta = client.post(CADASTRO, json=_payload(consentimento_lgpd=False))

    assert resposta.status_code == 422


def test_cadastro_sem_campo_consentimento_retorna_422(client):
    payload = _payload()
    del payload["consentimento_lgpd"]

    resposta = client.post(CADASTRO, json=payload)

    assert resposta.status_code == 422


def test_cadastro_senha_curta_retorna_422(client):
    resposta = client.post(CADASTRO, json=_payload(senha="curta"))

    assert resposta.status_code == 422


def test_login_ok_retorna_token_bearer(client):
    client.post(CADASTRO, json=_payload())

    resposta = client.post(LOGIN, json={"email": EMAIL_PADRAO, "senha": SENHA_PADRAO})

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["token_type"] == "bearer"
    assert isinstance(corpo["access_token"], str) and corpo["access_token"]


def test_login_senha_errada_retorna_401(client):
    client.post(CADASTRO, json=_payload())

    resposta = client.post(LOGIN, json={"email": EMAIL_PADRAO, "senha": "senha-errada-999"})

    assert resposta.status_code == 401


def test_login_email_inexistente_retorna_401(client):
    resposta = client.post(LOGIN, json={"email": "ninguem@exemplo.com", "senha": SENHA_PADRAO})

    assert resposta.status_code == 401


def test_token_oauth2_form_aceita_email_como_username(client):
    client.post(CADASTRO, json=_payload())

    resposta = client.post(
        TOKEN,
        data={"username": EMAIL_PADRAO, "password": SENHA_PADRAO},
    )

    assert resposta.status_code == 200
    assert resposta.json()["token_type"] == "bearer"


def test_token_oauth2_senha_errada_retorna_401(client):
    client.post(CADASTRO, json=_payload())

    resposta = client.post(TOKEN, data={"username": EMAIL_PADRAO, "password": "errada-999"})

    assert resposta.status_code == 401


def test_senha_e_armazenada_so_como_hash(client, engine):
    client.post(CADASTRO, json=_payload())

    with Session(engine) as sessao:
        usuario = sessao.exec(select(Usuario).where(Usuario.email == EMAIL_PADRAO)).one()

    assert usuario.senha_hash != SENHA_PADRAO
    assert SENHA_PADRAO not in usuario.senha_hash
    assert usuario.senha_hash.startswith("$argon2")
    assert usuario.consentimento_em is not None
    assert usuario.versao_termo
