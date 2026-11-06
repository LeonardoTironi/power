"""Conexão com o PostgreSQL via SQLModel.

As tabelas `usuario` (RF08) e `avaliacao` (RF09) ficam em `app.models`. O modelo de
usuário já reserva os campos da RNF05 (hash de senha, consentimento e exclusão em
cascata). O hash e o fluxo de exclusão serão implementados na camada de serviço.
"""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, create_engine, text

from app.core.config import settings


@lru_cache
def get_engine() -> Engine:
    return create_engine(
        settings.database_url, pool_pre_ping=True, connect_args={"connect_timeout": 3}
    )


def create_tables() -> None:
    import app.models  # noqa: F401  registra as tabelas no metadata

    SQLModel.metadata.create_all(get_engine())


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session


def database_is_up() -> bool:
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
