"""Carregamento do pipeline de classificação (RNF06: caminho e versão vêm das settings)."""
import logging
from pathlib import Path

import joblib

from app.core.config import BASE_DIR, settings

logger = logging.getLogger(__name__)


def carregar_modelo():
    caminho = Path(settings.model_path)
    if not caminho.is_absolute():
        caminho = BASE_DIR / caminho
    try:
        return joblib.load(caminho)
    except Exception:
        logger.exception("Não foi possível carregar o modelo em %s", caminho)
        return None
