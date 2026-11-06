"""GET /api/v1/health: estado do banco e do modelo (RNF06)."""

CHAVES = {"status", "banco_disponivel", "modelo_carregado", "versao_modelo"}


def test_health_com_banco_no_ar(client):
    resposta = client.get("/api/v1/health")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert set(corpo) == CHAVES
    assert corpo["banco_disponivel"] is True
    assert isinstance(corpo["modelo_carregado"], bool)


def test_health_informa_banco_fora_do_ar(client, definir_banco):
    definir_banco(False)

    resposta = client.get("/api/v1/health")

    assert resposta.status_code == 200
    assert resposta.json()["banco_disponivel"] is False
