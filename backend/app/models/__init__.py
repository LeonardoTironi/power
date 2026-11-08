"""Modelos SQLModel. Importar este pacote registra todas as tabelas no metadata."""

from app.models.avaliacao import (
    Avaliacao,
    AvaliacaoEntrada,
    AvaliacaoPublica,
    AvaliacaoResultado,
    HistoricoExercicio,
)
from app.models.enums import Exercicio, NivelForca, Sexo
from app.models.usuario import Usuario, UsuarioCriar, UsuarioPublico

__all__ = [
    "Avaliacao",
    "AvaliacaoEntrada",
    "AvaliacaoPublica",
    "AvaliacaoResultado",
    "Exercicio",
    "HistoricoExercicio",
    "NivelForca",
    "Sexo",
    "Usuario",
    "UsuarioCriar",
    "UsuarioPublico",
]
