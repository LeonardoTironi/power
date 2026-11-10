"""Rotas de autenticação: cadastro, login JSON e token OAuth2."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, SQLModel

from app.api.deps import get_session
from app.core.security import criar_token_acesso
from app.models.usuario import UsuarioCriar, UsuarioPublico
from app.services.usuario import EmailJaCadastradoError, autenticar_usuario, criar_usuario

router = APIRouter(prefix="/auth", tags=["autenticacao"])


class LoginEntrada(SQLModel):
    """Payload JSON de login."""

    email: str
    senha: str


class TokenResposta(SQLModel):
    """Resposta padrão com token Bearer."""

    access_token: str
    token_type: str = "bearer"


def _autenticar_e_emitir_token(session: Session, email: str, senha: str) -> TokenResposta:
    usuario = autenticar_usuario(session, email, senha)
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = criar_token_acesso(str(usuario.id))
    return TokenResposta(access_token=token)


@router.post("/cadastro", response_model=UsuarioPublico, status_code=status.HTTP_201_CREATED)
def cadastrar(
    dados: UsuarioCriar,
    session: Annotated[Session, Depends(get_session)],
) -> UsuarioPublico:
    """Cadastra um novo usuário com consentimento LGPD explícito."""
    try:
        usuario = criar_usuario(session, dados)
    except EmailJaCadastradoError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado.",
        ) from exc
    return UsuarioPublico.model_validate(usuario)


@router.post("/login", response_model=TokenResposta)
def login(
    dados: LoginEntrada,
    session: Annotated[Session, Depends(get_session)],
) -> TokenResposta:
    """Autentica via JSON (`email` e `senha`) e retorna um JWT Bearer."""
    return _autenticar_e_emitir_token(session, dados.email, dados.senha)


@router.post("/token", response_model=TokenResposta)
def token_oauth2(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Annotated[Session, Depends(get_session)],
) -> TokenResposta:
    """Autentica via formulário OAuth2 (`username` = e-mail) para o Swagger UI."""
    return _autenticar_e_emitir_token(session, form_data.username, form_data.password)
