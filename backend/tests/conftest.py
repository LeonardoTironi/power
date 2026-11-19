"""Fixtures compartilhadas.

Os testes nunca usam PostgreSQL: o banco é um SQLite em memória (StaticPool), injetado
na dependência `get_session` e nas funções de inicialização usadas pelo `lifespan`.
"""

import os
import sys
from collections.abc import Callable, Iterator

# Precisa vir antes de importar `app`: as Settings são lidas na importação do módulo.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "segredo-de-teste-com-mais-de-32-bytes-para-hs256"
# Fixa o modelo para os testes, sem depender do .env local de cada máquina.
os.environ["MODEL_PATH"] = "data/svm_tuned_model.joblib"
os.environ["MODEL_VERSION"] = "svm_tuned-v1"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
from sqlmodel import Session, SQLModel, create_engine  # noqa: E402

import app.models  # noqa: E402, F401  registra as tabelas no metadata

SENHA_PADRAO = "senha-forte-123"
EMAIL_PADRAO = "ana@exemplo.com"


def _substituir_em_modulos(monkeypatch: pytest.MonkeyPatch, nome: str, novo: object) -> None:
    """Troca `nome` em todo módulo `app.*` carregado.

    Rotas e `main.py` importam as funções por nome, então trocar só em `app.core.db`
    não basta: a referência local de cada módulo também precisa ser substituída.
    """
    for nome_modulo, modulo in list(sys.modules.items()):
        if (nome_modulo == "app" or nome_modulo.startswith("app.")) and hasattr(modulo, nome):
            monkeypatch.setattr(modulo, nome, novo)


@pytest.fixture
def engine():
    """Banco SQLite em memória, isolado por teste."""
    motor = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(motor)
    yield motor
    motor.dispose()


@pytest.fixture
def definir_banco(engine, monkeypatch) -> Callable[[bool], None]:
    """Liga/desliga o banco para o teste.

    `True` (padrão): `database_is_up` responde verdadeiro e `create_tables` cria as
    tabelas no SQLite. `False`: simula PostgreSQL fora do ar (usado no /health).
    """
    import app.core.db as db
    import app.main  # noqa: F401  carrega rotas antes do patch: elas importam por nome

    def criar_tabelas() -> None:
        SQLModel.metadata.create_all(engine)

    def definir(ativo: bool) -> None:
        _substituir_em_modulos(monkeypatch, "database_is_up", lambda: ativo)
        _substituir_em_modulos(monkeypatch, "create_tables", criar_tabelas)

    monkeypatch.setattr(db, "create_tables", criar_tabelas)
    definir(True)
    return definir


@pytest.fixture
def client(engine, definir_banco) -> Iterator[TestClient]:
    """Cliente HTTP com o lifespan real (modelo + create_tables) sobre SQLite."""
    from app.core.db import get_session
    from app.main import app as aplicacao

    def sessao_de_teste() -> Iterator[Session]:
        with Session(engine) as sessao:
            yield sessao

    aplicacao.dependency_overrides[get_session] = sessao_de_teste
    try:
        with TestClient(aplicacao) as cliente:
            yield cliente
    finally:
        aplicacao.dependency_overrides.clear()


@pytest.fixture
def cadastrar_usuario(client) -> Callable[..., str]:
    """Cadastra um usuário pela API, faz login e devolve o `access_token`."""

    def cadastrar(
        email: str = EMAIL_PADRAO,
        senha: str = SENHA_PADRAO,
        nome: str = "Ana",
    ) -> str:
        payload = {
            "nome": nome,
            "email": email,
            "senha": senha,
            "consentimento_lgpd": True,
        }
        cadastro = client.post("/api/v1/auth/cadastro", json=payload)
        assert cadastro.status_code == 201, cadastro.text

        login = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
        assert login.status_code == 200, login.text
        return login.json()["access_token"]

    return cadastrar


@pytest.fixture
def usuario_token(cadastrar_usuario) -> str:
    """Token de um usuário já cadastrado e logado."""
    return cadastrar_usuario()


def autenticacao(token: str) -> dict[str, str]:
    """Cabeçalho `Authorization` para requisições autenticadas."""
    return {"Authorization": f"Bearer {token}"}
