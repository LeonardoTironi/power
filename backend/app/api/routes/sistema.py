from fastapi import APIRouter, Request

from app.core.config import settings
from app.core.db import database_is_up

router = APIRouter(tags=["sistema"])


@router.get("/health")
def health(request: Request):
    banco = database_is_up()
    modelo = getattr(request.app.state, "modelo", None) is not None
    return {"status": "ok", "banco_disponivel": banco, "modelo_carregado": modelo,
            "versao_modelo": settings.model_version}
