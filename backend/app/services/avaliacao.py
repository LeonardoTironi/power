"""Cálculo do 1RM (RN01) e classificação do nível de força (RF04, RF05, RF06)."""

from fastapi import HTTPException
from sqlmodel import Session

from app.core.config import settings
from app.ml.preprocessamento import preparar_entrada
from app.models import Avaliacao, AvaliacaoEntrada, AvaliacaoResultado, NivelForca, Usuario

EXPLICACOES = {
    NivelForca.INICIANTE: (
        "Nível iniciante: sua força relativa neste exercício está na faixa de quem está "
        "começando ou treina há pouco tempo. Há bastante espaço para progressão com treino "
        "regular e aumento gradual de carga."
    ),
    NivelForca.INTERMEDIARIO: (
        "Nível intermediário: sua força relativa neste exercício está acima da faixa inicial, "
        "típica de quem treina com regularidade há algum tempo. A progressão tende a ser mais "
        "lenta e se beneficia de um planejamento de cargas."
    ),
    NivelForca.AVANCADO: (
        "Nível avançado: sua força relativa neste exercício está na faixa mais alta da base "
        "de referência para pessoas com o mesmo sexo, idade e massa corporal. Ganhos adicionais "
        "costumam exigir treino específico e acompanhamento."
    ),
}
AVISO = (
    "Resultado informativo: a classificação e a estimativa de 1RM não substituem avaliação "
    "física profissional nem orientação médica."
)


def calcular_1rm(carga: float, repeticoes: int) -> float:
    """RN01 (Epley): 1RM = carga × (1 + repetições ÷ 30), com uma casa decimal."""
    return round(carga if repeticoes == 1 else carga * (1 + repeticoes / 30), 1)


def classificar(
    entrada: AvaliacaoEntrada,
    modelo,
    usuario: Usuario | None = None,
    session: Session | None = None,
) -> AvaliacaoResultado:
    if modelo is None:
        raise HTTPException(status_code=503, detail="Modelo de classificação indisponível.")
    rm1 = calcular_1rm(entrada.carga_kg, entrada.repeticoes)
    nivel = NivelForca(str(modelo.predict(preparar_entrada(entrada, rm1))[0]))
    resultado = AvaliacaoResultado(
        exercicio=entrada.exercicio,
        nivel=nivel,
        rm1_estimado_kg=rm1,
        explicacao=EXPLICACOES[nivel],
        aviso=AVISO,
        versao_modelo=settings.model_version,
    )
    if usuario is not None:
        if session is None:
            raise ValueError("Sessão necessária para salvar a avaliação.")
        avaliacao = Avaliacao(
            **entrada.model_dump(),
            usuario_id=usuario.id,
            rm1_estimado_kg=rm1,
            nivel=nivel,
            versao_modelo=settings.model_version,
        )
        session.add(avaliacao)
        session.commit()
        session.refresh(avaliacao)
        resultado.id = avaliacao.id
    return resultado
