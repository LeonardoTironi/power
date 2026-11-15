"""Rotas de histórico e consulta individual de avaliações do usuário (RF09)."""

import uuid
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import get_session, get_usuario_atual
from app.models.avaliacao import Avaliacao, AvaliacaoPublica, HistoricoExercicio
from app.models.enums import Exercicio
from app.models.usuario import Usuario

router = APIRouter(prefix="/avaliacoes", tags=["historico"])


def _obter_avaliacao_propria(
    session: Session,
    avaliacao_id: uuid.UUID,
    usuario_id: uuid.UUID,
) -> Avaliacao:
    avaliacao = session.get(Avaliacao, avaliacao_id)
    if avaliacao is None or avaliacao.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada.",
        )
    return avaliacao


@router.get("/historico", response_model=list[HistoricoExercicio])
def listar_historico(
    usuario_atual: Annotated[Usuario, Depends(get_usuario_atual)],
    session: Annotated[Session, Depends(get_session)],
    exercicio: Annotated[Exercicio | None, Query()] = None,
) -> list[HistoricoExercicio]:
    """Lista o histórico agrupado por exercício, ordenado por `criado_em`."""
    stmt = select(Avaliacao).where(Avaliacao.usuario_id == usuario_atual.id)
    if exercicio is not None:
        stmt = stmt.where(Avaliacao.exercicio == exercicio)
    stmt = stmt.order_by(Avaliacao.criado_em.asc())

    avaliacoes = session.exec(stmt).all()
    agrupado: dict[Exercicio, list[AvaliacaoPublica]] = defaultdict(list)
    for item in avaliacoes:
        agrupado[item.exercicio].append(AvaliacaoPublica.model_validate(item))

    resultado: list[HistoricoExercicio] = []
    for ex, itens in agrupado.items():
        variacao = (
            round(itens[-1].rm1_estimado_kg - itens[0].rm1_estimado_kg, 1)
            if len(itens) >= 2
            else None
        )
        resultado.append(
            HistoricoExercicio(
                exercicio=ex,
                avaliacoes=itens,
                variacao_rm1_kg=variacao,
            )
        )
    return resultado


@router.get("/{avaliacao_id}", response_model=AvaliacaoPublica)
def obter_avaliacao(
    avaliacao_id: uuid.UUID,
    usuario_atual: Annotated[Usuario, Depends(get_usuario_atual)],
    session: Annotated[Session, Depends(get_session)],
) -> AvaliacaoPublica:
    """Retorna uma avaliação específica do usuário autenticado."""
    avaliacao = _obter_avaliacao_propria(session, avaliacao_id, usuario_atual.id)
    return AvaliacaoPublica.model_validate(avaliacao)


@router.delete("/{avaliacao_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_avaliacao(
    avaliacao_id: uuid.UUID,
    usuario_atual: Annotated[Usuario, Depends(get_usuario_atual)],
    session: Annotated[Session, Depends(get_session)],
) -> None:
    """Exclui uma avaliação específica do usuário autenticado."""
    avaliacao = _obter_avaliacao_propria(session, avaliacao_id, usuario_atual.id)
    session.delete(avaliacao)
    session.commit()
