from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from app.api.deps import get_usuario_opcional
from app.core.db import get_session
from app.models import AvaliacaoEntrada, AvaliacaoResultado, Exercicio, Usuario
from app.services.avaliacao import classificar

router = APIRouter(tags=["avaliações"])


@router.get("/exercicios")
def listar_exercicios():
    rotulos = {Exercicio.SUPINO: "Supino", Exercicio.AGACHAMENTO: "Agachamento",
               Exercicio.DEADLIFT: "Deadlift"}
    return [{"valor": exercicio.value, "rotulo": rotulos[exercicio]} for exercicio in Exercicio]


@router.post("/avaliacoes", response_model=AvaliacaoResultado)
def avaliar(entrada: AvaliacaoEntrada, request: Request,
            usuario: Annotated[Usuario | None, Depends(get_usuario_opcional)],
            session: Annotated[Session, Depends(get_session)]):
    return classificar(entrada, getattr(request.app.state, "modelo", None), usuario, session)
