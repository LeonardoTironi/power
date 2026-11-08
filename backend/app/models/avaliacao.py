"""Avaliação de força: entrada (RF01/RF03), resultado (RF05/RF06) e histórico (RF09).

Nomes dos campos (backlog) e colunas do `dataset.csv` usadas pelo modelo:

| API / banco         | dataset.csv    | Observação                                   |
|---------------------|----------------|----------------------------------------------|
| exercicio           | levantamento   | mesmos valores                               |
| sexo                | genero         | mesmos valores (`m`, `f`)                    |
| idade               | idade          |                                              |
| massa_corporal_kg   | peso           |                                              |
| rm1_estimado_kg     | carga          | carga x repetições convertidas por Epley     |
| nivel               | nivel          | mesmos valores                               |
| estatura_m          | (não usada)    | a base só tem `altura_sintetica_cm`          |
"""

import uuid
from datetime import datetime

from pydantic import field_validator
from sqlalchemy import DateTime, Enum, Index, Numeric, SmallInteger, func
from sqlmodel import Field, Relationship, SQLModel

from app.models.enums import Exercicio, NivelForca, Sexo, enum_values
from app.models.usuario import Usuario, agora_utc

# Tipos de coluna: kg com uma casa decimal, igual ao CSV e ao arredondamento da RN01.
KG = Numeric(5, 1, asdecimal=False)
ESTATURA = Numeric(3, 2, asdecimal=False)


def _enum(enum_cls: type, nome: str) -> Enum:
    # VARCHAR + CHECK em vez de ENUM nativo: incluir um exercício exige só retreinar
    # o modelo e migrar a constraint, sem ALTER TYPE.
    return Enum(
        enum_cls,
        name=nome,
        native_enum=False,
        create_constraint=True,
        values_callable=enum_values,
        validate_strings=True,
    )


class AvaliacaoEntrada(SQLModel):
    """Payload de avaliação com as faixas da RN03. Fora delas, a API responde 422."""

    exercicio: Exercicio = Field(sa_type=_enum(Exercicio, "exercicio"))
    sexo: Sexo = Field(sa_type=_enum(Sexo, "sexo"))
    idade: int = Field(ge=16, le=90, sa_type=SmallInteger)
    massa_corporal_kg: float = Field(ge=30, le=250, sa_type=KG)
    estatura_m: float | None = Field(default=None, ge=1.20, le=2.30, sa_type=ESTATURA)
    carga_kg: float = Field(ge=1, le=500, sa_type=KG)
    repeticoes: int = Field(ge=1, le=12, sa_type=SmallInteger)

    @field_validator("exercicio", "sexo", mode="before")
    @classmethod
    def normalizar_texto(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class Avaliacao(AvaliacaoEntrada, table=True):
    """Avaliação persistida. Só é gravada para usuário autenticado (RF09, RNF05)."""

    __tablename__ = "avaliacao"
    __table_args__ = (
        Index("ix_avaliacao_usuario_exercicio_data", "usuario_id", "exercicio", "criado_em"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    usuario_id: uuid.UUID = Field(foreign_key="usuario.id", ondelete="CASCADE")
    rm1_estimado_kg: float = Field(sa_type=KG)
    nivel: NivelForca = Field(sa_type=_enum(NivelForca, "nivel_forca"))
    versao_modelo: str = Field(max_length=50)
    criado_em: datetime = Field(
        default_factory=agora_utc,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now()},
    )

    usuario: Usuario = Relationship(back_populates="avaliacoes")


class AvaliacaoResultado(SQLModel):
    """Resposta da classificação (RF05, RF06, RNF06).

    O contrato não depende do algoritmo usado: trocar o modelo altera só `versao_modelo`.
    """

    id: uuid.UUID | None = None
    exercicio: Exercicio
    nivel: NivelForca
    rm1_estimado_kg: float
    explicacao: str
    aviso: str
    versao_modelo: str


class AvaliacaoPublica(AvaliacaoEntrada):
    """Item do histórico do usuário."""

    id: uuid.UUID
    rm1_estimado_kg: float
    nivel: NivelForca
    versao_modelo: str
    criado_em: datetime


class HistoricoExercicio(SQLModel):
    """Histórico por exercício (RF09). `variacao_rm1_kg` exige duas ou mais avaliações."""

    exercicio: Exercicio
    avaliacoes: list[AvaliacaoPublica]
    variacao_rm1_kg: float | None = None
