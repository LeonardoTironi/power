"""Serviço de usuários: cadastro (RF08/RNF05), autenticação e exclusão em cascata."""

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, delete, select

from app.core.security import gerar_hash_senha, verificar_senha
from app.models.avaliacao import Avaliacao
from app.models.usuario import Usuario, UsuarioCriar, agora_utc

VERSAO_TERMO_ATUAL = "1.0"


class EmailJaCadastradoError(Exception):
    """Erro lançado ao tentar cadastrar um e-mail já existente."""


def buscar_por_email(session: Session, email: str) -> Usuario | None:
    """Busca um usuário pelo e-mail normalizado."""
    email_normalizado = email.strip().lower()
    return session.exec(select(Usuario).where(Usuario.email == email_normalizado)).first()


def criar_usuario(session: Session, dados: UsuarioCriar) -> Usuario:
    """Cria um novo usuário com senha Argon2 e registro de consentimento LGPD."""
    if buscar_por_email(session, dados.email) is not None:
        raise EmailJaCadastradoError("E-mail já cadastrado.")

    usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=gerar_hash_senha(dados.senha),
        consentimento_em=agora_utc(),
        versao_termo=VERSAO_TERMO_ATUAL,
    )
    session.add(usuario)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise EmailJaCadastradoError("E-mail já cadastrado.") from exc
    session.refresh(usuario)
    return usuario


def autenticar_usuario(session: Session, email: str, senha: str) -> Usuario | None:
    """Valida credenciais e retorna o usuário, ou None se inválidas."""
    usuario = buscar_por_email(session, email)
    if usuario is None or not verificar_senha(senha, usuario.senha_hash):
        return None
    return usuario


def excluir_usuario(session: Session, usuario: Usuario) -> None:
    """Exclui a conta do usuário e suas avaliações em cascata (RNF05)."""
    session.exec(delete(Avaliacao).where(Avaliacao.usuario_id == usuario.id))
    session.delete(usuario)
    session.commit()
