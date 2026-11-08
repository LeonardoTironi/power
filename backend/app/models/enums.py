"""Domínios fechados do Scouter Power.

Os valores são idênticos aos rótulos de `dataset.csv`. Assim, a saída do modelo e a
entrada do pipeline usam os mesmos textos e dispensam conversão.
"""

from enum import StrEnum


class Exercicio(StrEnum):
    """Catálogo de exercícios suportados (RF02, RN05): apenas os presentes na base."""

    SUPINO = "supino"
    AGACHAMENTO = "agachamento"
    DEADLIFT = "deadlift"


class Sexo(StrEnum):
    MASCULINO = "m"
    FEMININO = "f"


class NivelForca(StrEnum):
    INICIANTE = "iniciante"
    INTERMEDIARIO = "intermediario"
    AVANCADO = "avancado"


def enum_values(enum_cls: type[StrEnum]) -> list[str]:
    """Faz o SQLAlchemy gravar o valor (`supino`) em vez do nome (`SUPINO`)."""
    return [member.value for member in enum_cls]
