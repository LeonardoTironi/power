from fastapi import APIRouter, Request
from pydantic import BaseModel, Field, field_validator

from app.models import AvaliacaoEntrada, Exercicio, Sexo
from app.services.avaliacao import classificar

router = APIRouter(prefix="/strength", tags=["strength"])


class StrengthAnalysisRequest(BaseModel):
    exercicio: Exercicio
    genero: Sexo
    idade: int = Field(ge=16, le=90)
    peso_corporal: float = Field(ge=30, le=250)
    peso_exercicio: float = Field(ge=1, le=500)
    repeticoes: int = Field(ge=1, le=12)

    @field_validator("exercicio", "genero", mode="before")
    @classmethod
    def normalizar(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class StrengthAnalysisResponse(BaseModel):
    rm1_estimado_kg: float
    classificacao: str
    formula_utilizada: str


@router.post("/analyze", response_model=StrengthAnalysisResponse)
def analyze_strength(dados: StrengthAnalysisRequest, request: Request):
    entrada = AvaliacaoEntrada(exercicio=dados.exercicio, sexo=dados.genero, idade=dados.idade,
        massa_corporal_kg=dados.peso_corporal, carga_kg=dados.peso_exercicio,
        repeticoes=dados.repeticoes)
    resultado = classificar(entrada, getattr(request.app.state, "modelo", None))
    return StrengthAnalysisResponse(rm1_estimado_kg=resultado.rm1_estimado_kg,
        classificacao=resultado.nivel.value.capitalize(), formula_utilizada="epley")
