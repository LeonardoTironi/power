"""Aplicação FastAPI do Scouter Power."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, avaliacoes, sistema
from app.core.config import settings
from app.core.db import create_tables, database_is_up
from app.ml.modelo import carregar_modelo

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.modelo = carregar_modelo()
    if database_is_up():
        create_tables()
    else:
        logger.warning("Banco de dados indisponível; avaliações anônimas continuam disponíveis.")
    yield


app = FastAPI(
    title=settings.app_name,
    description="Estimativa de 1RM e classificação do nível de força em musculação.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)
for router in (
    sistema.router,
    auth.router,
    avaliacoes.router,
):
    app.include_router(router, prefix="/api/v1")
