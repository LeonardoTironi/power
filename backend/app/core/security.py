"""Utilitários de segurança: hash Argon2 de senhas e tokens JWT (HS256)."""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

ALGORITMO_JWT = "HS256"
_password_hash = PasswordHash.recommended()


def gerar_hash_senha(senha: str) -> str:
    """Gera o hash Argon2 da senha em texto puro."""
    return _password_hash.hash(senha)


def verificar_senha(senha: str, senha_hash: str) -> bool:
    """Verifica se a senha em texto puro corresponde ao hash armazenado."""
    return _password_hash.verify(senha, senha_hash)


def criar_token_acesso(
    sujeito: str,
    expira_em: timedelta | None = None,
    claims_extras: dict[str, Any] | None = None,
) -> str:
    """Cria um token JWT assinado com HS256."""
    agora = datetime.now(UTC)
    expiracao = agora + (expira_em or timedelta(minutes=settings.jwt_expira_minutos))
    payload: dict[str, Any] = {
        "sub": sujeito,
        "iat": agora,
        "exp": expiracao,
    }
    if claims_extras:
        payload.update(claims_extras)
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITMO_JWT)


def decodificar_token_acesso(token: str) -> dict[str, Any] | None:
    """Decodifica e valida o token JWT. Retorna None se inválido ou expirado."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITMO_JWT])
    except jwt.PyJWTError:
        return None
