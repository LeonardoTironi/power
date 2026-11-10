"""RNF04: entrada bruta com as colunas do treino; o pipeline aplica as mesmas transformações."""
import pandas as pd

from app.models import AvaliacaoEntrada


def preparar_entrada(entrada: AvaliacaoEntrada, rm1: float) -> pd.DataFrame:
    return pd.DataFrame([{
        "levantamento": entrada.exercicio.value,
        "genero": entrada.sexo.value,
        "idade": entrada.idade,
        "peso": entrada.massa_corporal_kg,
        "carga": rm1,
    }])
