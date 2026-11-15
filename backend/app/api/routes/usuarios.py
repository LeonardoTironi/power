"""Rotas da conta do usuário autenticado (consulta e exclusão LGPD)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.api.deps import get_session, get_usuario_atual
from app.models.usuario import Usuario, UsuarioPublico
from app.services.usuario import excluir_usuario

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("/me", response_model=UsuarioPublico)
def obter_me(
    usuario_atual: Annotated[Usuario, Depends(get_usuario_atual)],
) -> UsuarioPublico:
    """Retorna os dados públicos do usuário autenticado."""
    return UsuarioPublico.model_validate(usuario_atual)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def excluir_me(
    usuario_atual: Annotated[Usuario, Depends(get_usuario_atual)],
    session: Annotated[Session, Depends(get_session)],
) -> None:
    """Exclui a conta do usuário autenticado e suas avaliações em cascata (RNF05)."""
    excluir_usuario(session, usuario_atual)
