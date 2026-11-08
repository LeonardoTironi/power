"""Usuário (RF08) com os requisitos de privacidade da RNF05 (LGPD).

- A senha é armazenada só como hash (`senha_hash`). O hash é gerado na camada de serviço.
- O cadastro exige consentimento explícito. A data e a versão do termo aceito ficam
  registradas.
- A exclusão da conta apaga as avaliações em cascata, no ORM e no banco (`ON DELETE CASCADE`).
- Minimização de dados: o usuário não guarda sexo, idade nem massa. Esses dados ficam
  apenas nas avaliações que ele decidir registrar.
"""

import re
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Literal

from pydantic import field_validator
from sqlalchemy import DateTime, func
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.avaliacao import Avaliacao

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def agora_utc() -> datetime:
    return datetime.now(UTC)


class UsuarioBase(SQLModel):
    nome: str = Field(min_length=1, max_length=120)
    email: str = Field(max_length=254)

    @field_validator("nome", mode="before")
    @classmethod
    def limpar_nome(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip().lower()
            if not EMAIL_REGEX.match(value):
                raise ValueError("e-mail inválido")
        return value


class Usuario(UsuarioBase, table=True):
    __tablename__ = "usuario"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(max_length=254, unique=True, index=True)
    senha_hash: str = Field(max_length=255)
    consentimento_em: datetime = Field(sa_type=DateTime(timezone=True))
    versao_termo: str = Field(max_length=20)
    criado_em: datetime = Field(
        default_factory=agora_utc,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now()},
    )
    atualizado_em: datetime = Field(
        default_factory=agora_utc,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "onupdate": func.now()},
    )

    avaliacoes: list["Avaliacao"] = Relationship(back_populates="usuario", cascade_delete=True)


class UsuarioCriar(UsuarioBase):
    """Payload de cadastro. Sem `consentimento_lgpd = true` o cadastro é rejeitado (422)."""

    senha: str = Field(min_length=8, max_length=128)
    consentimento_lgpd: Literal[True]


class UsuarioPublico(UsuarioBase):
    """Resposta da API: nunca expõe `senha_hash`."""

    id: uuid.UUID
    criado_em: datetime
