"""RNF02: mede o tempo de resposta de POST /api/v1/avaliacoes.

O script envia avaliações a uma API já em execução e mede o tempo de cada requisição no
cliente. Em seguida, soma a cada medição o custo de rede de perfis de conexão móvel 4G
(latência de ida e volta e banda de subida e descida) e calcula o percentil 95.

O custo de rede é estimado, não medido em um aparelho real:

- conexão reaproveitada: 1 RTT + bytes enviados ÷ banda de subida + bytes recebidos ÷
  banda de descida;
- conexão nova: mais 3 RTT (DNS, TCP e TLS 1.3).

Uso, na pasta `backend`, com a API rodando em outro terminal:

    python benchmark_api.py --url http://127.0.0.1:8000
"""

import argparse
import json
import math
import platform
import random
import statistics
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import httpx

CAMINHO_AVALIACOES = "/api/v1/avaliacoes"
META_SEGUNDOS = 4.0
META_PERCENTIL = 95
RTT_CONEXAO_NOVA = 3  # DNS + handshake TCP + handshake TLS 1.3


@dataclass(frozen=True)
class PerfilRede:
    nome: str
    descricao: str
    rtt_ms: float
    descida_kbps: float
    subida_kbps: float


PERFIS = (
    PerfilRede(
        "4g_lento",
        "Throttling móvel padrão do Lighthouse (Slow 4G): 150 ms de RTT, "
        "1.638,4 kbit/s de descida e 750 kbit/s de subida.",
        150, 1638.4, 750,
    ),
    PerfilRede(
        "4g_degradado",
        "Cenário pessimista: 400 ms de RTT, 400 kbit/s de descida e 200 kbit/s de subida.",
        400, 400, 200,
    ),
)


def gerar_entrada(gerador: random.Random) -> dict:
    """Entrada válida aleatória dentro das faixas da RN03."""
    return {
        "exercicio": gerador.choice(["supino", "agachamento", "deadlift"]),
        "sexo": gerador.choice(["m", "f"]),
        "idade": gerador.randint(16, 90),
        "massa_corporal_kg": round(gerador.uniform(45, 140), 1),
        "estatura_m": round(gerador.uniform(1.50, 2.00), 2),
        "carga_kg": round(gerador.uniform(20, 250), 1),
        "repeticoes": gerador.randint(1, 12),
    }


def tamanho_requisicao(requisicao: httpx.Request) -> int:
    linha = f"{requisicao.method} {requisicao.url.raw_path.decode()} HTTP/1.1\r\n"
    cabecalhos = "".join(f"{k}: {v}\r\n" for k, v in requisicao.headers.items())
    return len(linha) + len(cabecalhos) + 2 + len(requisicao.content)


def tamanho_resposta(resposta: httpx.Response) -> int:
    linha = f"HTTP/1.1 {resposta.status_code} {resposta.reason_phrase}\r\n"
    cabecalhos = "".join(f"{k}: {v}\r\n" for k, v in resposta.headers.items())
    return len(linha) + len(cabecalhos) + 2 + len(resposta.content)


def medir(cliente: httpx.Client, entrada: dict, token: str | None) -> dict:
    cabecalhos = {"Authorization": f"Bearer {token}"} if token else {}
    requisicao = cliente.build_request("POST", CAMINHO_AVALIACOES, json=entrada,
                                       headers=cabecalhos)
    inicio = time.perf_counter()
    resposta = cliente.send(requisicao)
    duracao = time.perf_counter() - inicio
    if resposta.status_code != 200:
        raise RuntimeError(f"Resposta {resposta.status_code}: {resposta.text}")
    return {"segundos": duracao, "bytes_enviados": tamanho_requisicao(requisicao),
            "bytes_recebidos": tamanho_resposta(resposta)}


def percentil(valores: list[float], p: float) -> float:
    """Percentil pelo método do posto mais próximo."""
    ordenados = sorted(valores)
    return ordenados[max(0, math.ceil(p / 100 * len(ordenados)) - 1)]


def resumo(segundos: list[float]) -> dict:
    return {
        "media_ms": round(statistics.fmean(segundos) * 1000, 2),
        "p50_ms": round(percentil(segundos, 50) * 1000, 2),
        "p95_ms": round(percentil(segundos, 95) * 1000, 2),
        "p99_ms": round(percentil(segundos, 99) * 1000, 2),
        "max_ms": round(max(segundos) * 1000, 2),
    }


def custo_rede(medicao: dict, perfil: PerfilRede, conexao_nova: bool) -> float:
    rtts = 1 + (RTT_CONEXAO_NOVA if conexao_nova else 0)
    subida = medicao["bytes_enviados"] * 8 / (perfil.subida_kbps * 1000)
    descida = medicao["bytes_recebidos"] * 8 / (perfil.descida_kbps * 1000)
    return rtts * perfil.rtt_ms / 1000 + subida + descida


def avaliar_perfis(medicoes: list[dict]) -> dict:
    resultado = {}
    for perfil in PERFIS:
        for conexao_nova in (False, True):
            totais = [m["segundos"] + custo_rede(m, perfil, conexao_nova) for m in medicoes]
            dentro = sum(t <= META_SEGUNDOS for t in totais) / len(totais)
            chave = f"{perfil.nome}_{'conexao_nova' if conexao_nova else 'conexao_reaproveitada'}"
            resultado[chave] = {
                **resumo(totais),
                "percentual_ate_4s": round(dentro * 100, 2),
                "atende_rnf02": percentil(totais, META_PERCENTIL) <= META_SEGUNDOS,
            }
    return resultado


def executar_cenario(url: str, total: int, concorrencia: int, token: str | None,
                     semente: int) -> list[dict]:
    gerador = random.Random(semente)
    entradas = [gerar_entrada(gerador) for _ in range(total)]
    limites = httpx.Limits(max_connections=concorrencia)
    with httpx.Client(base_url=url, timeout=30, limits=limites) as cliente:
        if concorrencia == 1:
            return [medir(cliente, entrada, token) for entrada in entradas]
        with ThreadPoolExecutor(max_workers=concorrencia) as executor:
            return list(executor.map(lambda e: medir(cliente, e, token), entradas))


def criar_usuario_temporario(url: str) -> str:
    email = f"benchmark-{uuid.uuid4().hex[:12]}@exemplo.com"
    senha = uuid.uuid4().hex
    with httpx.Client(base_url=url, timeout=30) as cliente:
        cadastro = cliente.post("/api/v1/auth/cadastro", json={
            "nome": "Benchmark RNF02", "email": email, "senha": senha,
            "consentimento_lgpd": True,
        })
        cadastro.raise_for_status()
        login = cliente.post("/api/v1/auth/login", json={"email": email, "senha": senha})
        login.raise_for_status()
        return login.json()["access_token"]


def excluir_usuario(url: str, token: str) -> None:
    with httpx.Client(base_url=url, timeout=30) as cliente:
        cliente.delete("/api/v1/usuarios/me",
                       headers={"Authorization": f"Bearer {token}"}).raise_for_status()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--requisicoes", type=int, default=1000,
                        help="Requisições medidas por cenário.")
    parser.add_argument("--aquecimento", type=int, default=50,
                        help="Requisições descartadas antes de medir.")
    parser.add_argument("--concorrencia", type=int, nargs="+", default=[1, 10])
    parser.add_argument("--semente", type=int, default=42)
    parser.add_argument("--output", type=Path, default=Path("data/benchmark_api.json"))
    args = parser.parse_args()

    with httpx.Client(base_url=args.url, timeout=30) as cliente:
        saude = cliente.get("/api/v1/health").json()
    if not saude.get("modelo_carregado"):
        print("A API está no ar, mas o modelo não foi carregado.", file=sys.stderr)
        return 1

    token = criar_usuario_temporario(args.url) if saude.get("banco_disponivel") else None
    tipos = [("anonima", None)] + ([("autenticada", token)] if token else [])
    cenarios = []
    try:
        for tipo, credencial in tipos:
            executar_cenario(args.url, args.aquecimento, 1, credencial, args.semente + 1)
            for concorrencia in args.concorrencia:
                inicio = time.perf_counter()
                medicoes = executar_cenario(args.url, args.requisicoes, concorrencia,
                                            credencial, args.semente)
                duracao = time.perf_counter() - inicio
                cenario = {
                    "avaliacao": tipo,
                    "concorrencia": concorrencia,
                    "requisicoes": len(medicoes),
                    "vazao_req_s": round(len(medicoes) / duracao, 1),
                    "bytes_enviados_medio": round(
                        statistics.fmean(m["bytes_enviados"] for m in medicoes)),
                    "bytes_recebidos_medio": round(
                        statistics.fmean(m["bytes_recebidos"] for m in medicoes)),
                    "servidor_local": resumo([m["segundos"] for m in medicoes]),
                    "estimativa_4g": avaliar_perfis(medicoes),
                }
                cenarios.append(cenario)
                print(f"{tipo:12} concorrência {concorrencia:>3}: "
                      f"p95 local {cenario['servidor_local']['p95_ms']} ms, "
                      f"p95 4G lento (conexão nova) "
                      f"{cenario['estimativa_4g']['4g_lento_conexao_nova']['p95_ms']} ms")
    finally:
        if token:
            excluir_usuario(args.url, token)

    relatorio = {
        "requisito": "RNF02: resposta em até 4 s em 95% das requisições, em conexão 4G",
        "data": datetime.now(UTC).isoformat(timespec="seconds"),
        "endpoint": f"POST {CAMINHO_AVALIACOES}",
        "versao_modelo": saude.get("versao_modelo"),
        "banco_disponivel": saude.get("banco_disponivel"),
        "ambiente": {
            "python": platform.python_version(),
            "sistema": platform.platform(),
            "processador": platform.processor(),
        },
        "metodo": {
            "requisicoes_por_cenario": args.requisicoes,
            "aquecimento_descartado": args.aquecimento,
            "semente": args.semente,
            "percentil": "posto mais próximo",
            "medicao": "Tempo no cliente, do envio ao fim da leitura da resposta, com a API "
                       "e o cliente na mesma máquina.",
            "rede": "Custo de rede estimado e somado a cada medição: 1 RTT por requisição "
                    "em conexão reaproveitada, mais 3 RTT (DNS, TCP e TLS 1.3) em conexão "
                    "nova, e o tempo de transmissão dos bytes da requisição e da resposta.",
            "perfis": {p.nome: p.descricao for p in PERFIS},
        },
        "meta": {"segundos": META_SEGUNDOS, "percentil": META_PERCENTIL},
        "cenarios": cenarios,
        "atende_rnf02": all(
            perfil["atende_rnf02"]
            for cenario in cenarios for perfil in cenario["estimativa_4g"].values()
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(relatorio, ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8")
    print(f"Relatório gravado em {args.output}. Atende RNF02: {relatorio['atende_rnf02']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
