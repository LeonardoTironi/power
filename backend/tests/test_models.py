import pytest
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from app.models import (
    Avaliacao,
    AvaliacaoEntrada,
    Exercicio,
    NivelForca,
    Sexo,
    Usuario,
    UsuarioCriar,
)

ENTRADA_VALIDA = {
    "exercicio": "Supino",
    "sexo": "M",
    "idade": 30,
    "massa_corporal_kg": 80.0,
    "estatura_m": 1.78,
    "carga_kg": 80.0,
    "repeticoes": 8,
}


def test_entrada_valida_normaliza_categorias():
    entrada = AvaliacaoEntrada(**ENTRADA_VALIDA)
    assert entrada.exercicio is Exercicio.SUPINO
    assert entrada.sexo is Sexo.MASCULINO


def test_estatura_e_opcional():
    dados = {k: v for k, v in ENTRADA_VALIDA.items() if k != "estatura_m"}
    assert AvaliacaoEntrada(**dados).estatura_m is None


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("idade", 15),
        ("idade", 91),
        ("massa_corporal_kg", 29.9),
        ("massa_corporal_kg", 250.1),
        ("estatura_m", 1.19),
        ("estatura_m", 2.31),
        ("carga_kg", 0.5),
        ("carga_kg", 500.5),
        ("repeticoes", 0),
        ("repeticoes", 13),
        ("carga_kg", "abc"),
        ("carga_kg", float("nan")),
        ("exercicio", "rosca"),
        ("sexo", "x"),
    ],
)
def test_faixas_rn03_rejeitam_valores_invalidos(campo, valor):
    with pytest.raises(ValidationError) as erro:
        AvaliacaoEntrada(**{**ENTRADA_VALIDA, campo: valor})
    assert erro.value.errors()[0]["loc"] == (campo,)


def test_catalogo_igual_ao_dataset():
    assert {e.value for e in Exercicio} == {"supino", "agachamento", "deadlift"}
    assert {n.value for n in NivelForca} == {"iniciante", "intermediario", "avancado"}


def test_cadastro_exige_consentimento():
    dados = {"nome": "Ana", "email": " Ana@Exemplo.com ", "senha": "segredo123"}
    assert UsuarioCriar(**dados, consentimento_lgpd=True).email == "ana@exemplo.com"
    with pytest.raises(ValidationError):
        UsuarioCriar(**dados, consentimento_lgpd=False)


def test_ddl_postgresql():
    dialeto = postgresql.dialect()
    ddl_usuario = str(CreateTable(Usuario.__table__).compile(dialect=dialeto))
    ddl_avaliacao = str(CreateTable(Avaliacao.__table__).compile(dialect=dialeto))

    assert "senha_hash" in ddl_usuario
    assert any(ix.unique and "email" in ix.columns for ix in Usuario.__table__.indexes)
    assert "ON DELETE CASCADE" in ddl_avaliacao
    assert "NUMERIC(5, 1)" in ddl_avaliacao
    assert "'supino'" in ddl_avaliacao
    assert "'intermediario'" in ddl_avaliacao
