"""Dependências compartilhadas da API (sessão de banco e autenticação)."""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.core.db import get_session
from app.core.security import decodificar_token_acesso
from app.models.usuario import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


def get_usuario_opcional(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    session: Annotated[Session, Depends(get_session)],
) -> Usuario | None:
    """Retorna o usuário autenticado ou None se o token estiver ausente ou inválido."""
    if not token:
        return None
    payload = decodificar_token_acesso(token)
    if not payload:
        return None
    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        return None
    try:
        usuario_id = uuid.UUID(sub)
    except ValueError:
        return None
    return session.get(Usuario, usuario_id)


def get_usuario_atual(
    usuario: Annotated[Usuario | None, Depends(get_usuario_opcional)],
) -> Usuario:
    """Exige usuário autenticado; retorna 401 caso contrário."""
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado ou token inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


__all__ = ["get_session", "get_usuario_atual", "get_usuario_opcional", "oauth2_scheme"]
