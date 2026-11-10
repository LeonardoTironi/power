"""RN01: 1RM pela fórmula de Epley, arredondado para 1 casa decimal."""

import pytest

from app.services.avaliacao import calcular_1rm


def test_epley_80kg_por_8_reps_resulta_101_3():
    assert calcular_1rm(80.0, 8) == 101.3


def test_epley_uma_repeticao_devolve_a_propria_carga():
    assert calcular_1rm(100.0, 1) == 100.0


@pytest.mark.parametrize(
    ("carga", "reps", "esperado"),
    [
        (100.0, 5, 116.7),  # 100 * (1 + 5/30) = 116.67
        (60.0, 12, 84.0),  # 60 * (1 + 12/30) = 84.0
        (140.0, 3, 154.0),  # 140 * (1 + 3/30) = 154.0
    ],
)
def test_epley_arredonda_para_uma_casa(carga, reps, esperado):
    assert calcular_1rm(carga, reps) == esperado
