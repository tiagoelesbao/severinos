"""Gera o JSON consolidado (todos os sorteios + detalhamento de baixas
manuais por pedido) que alimenta o relatorio-baixas-manuais-2026.html.
Reusa _anexar_baixa_manual/_numeros_premiados_por_sorteio de
bi_aggregator.py (regra de negocio ja validada em 17/10/2026), nao
reimplementa nada. So agrega por sorteio/pedido pra visualizacao.
"""
import json
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from client_api import SorteiosAPIClient  # noqa: E402
from bi_aggregator import _anexar_baixa_manual, _numeros_premiados_por_sorteio  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DIAS = 120

print("login...")
client = SorteiosAPIClient()
if not client.login():
    print("falha no login")
    sys.exit(1)

print(f"buscando sorteios ({DIAS} dias) pra pegar winners[]...")
sorteios_meta = client.get_sorteios(days=DIAS)
print(f"{len(sorteios_meta)} sorteios")

meta_por_id = {}
for s in sorteios_meta:
    pid = s.get("_id") or s.get("id")
    if pid:
        meta_por_id[pid] = s

premiados = _numeros_premiados_por_sorteio(sorteios_meta)

print("lendo detalhes_sorteios_120dias.csv...")
df_det = pd.read_csv(os.path.join(HERE, "detalhes_sorteios_120dias.csv"), sep=";", encoding="utf-8-sig", dtype=str)
for col in ("valor_premio", "faturamento", "lucro", "total_participantes"):
    df_det[col] = pd.to_numeric(df_det[col], errors="coerce").fillna(0.0)

print("lendo dados_brutos_completos_120dias.csv (pode demorar)...")
df = pd.read_csv(os.path.join(HERE, "dados_brutos_completos_120dias.csv"), sep=";", encoding="utf-8-sig", dtype=str, low_memory=False)
df["Valor"] = pd.to_numeric(df["Valor"], errors="coerce").fillna(0.0)
print(f"{len(df)} pedidos")

df = _anexar_baixa_manual(df, sorteios_meta)
baixas = df[df["_eh_baixa_manual"]].copy()
print(f"{len(baixas)} pedidos com baixa manual")

# data "de fechamento" por sorteio = ultimo pedido PAGO registrado pra aquele produto
datas_por_produto = df.groupby("ProductId")["Data"].max().to_dict()

def _numeros_ganhadores(product_id, numeros):
    mapa = premiados.get(product_id) or {}
    return [n for n in numeros if n in mapa]

# ---- detalhe de pedidos manuais por sorteio --------------------------------
manual_por_produto = {}
for pid, grupo in baixas.groupby("ProductId"):
    pedidos = []
    for _, row in grupo.sort_values("Data").iterrows():
        numeros = [n for n in str(row.get("Numeros", "") or "").split("|") if n]
        ganhadores = _numeros_ganhadores(pid, numeros)
        pedidos.append({
            "data": row.get("Data", ""),
            "nome": (row.get("Nome") or "").strip() or None,
            "numeros": numeros,
            "numeros_premiados": ganhadores,
            "valor": round(float(row.get("Valor", 0.0)), 2),
            "premio": round(float(row.get("_baixa_manual_premio", 0.0)), 2),
        })
    manual_por_produto[pid] = pedidos

# ---- monta a lista de TODOS os sorteios do periodo -------------------------
sorteios = []
for _, row in df_det.iterrows():
    pid = row["product_id"]
    meta = meta_por_id.get(pid, {})
    pedidos_manual = manual_por_produto.get(pid, [])
    qtd_pedidos_manual = len(pedidos_manual)
    qtd_numeros_manual = sum(len(p["numeros"]) for p in pedidos_manual)
    valor_pedidos_manual = round(sum(p["valor"] for p in pedidos_manual), 2)
    valor_contemplacao = round(sum(p["premio"] for p in pedidos_manual), 2)
    contemplou = valor_contemplacao > 0

    sorteios.append({
        "product_id": pid,
        "title": row["title"],
        "status": row["status"],
        "data": datas_por_produto.get(pid, ""),
        "faturamento": round(float(row["faturamento"]), 2),
        "vendas": int(row["total_participantes"]),
        "valor_premio_anunciado": round(float(row["valor_premio"]), 2),
        "baixas_qtd_pedidos": qtd_pedidos_manual,
        "baixas_qtd_numeros": qtd_numeros_manual,
        "baixas_valor": valor_pedidos_manual,
        "contemplou": contemplou,
        "valor_contemplacao": valor_contemplacao,
        "pedidos_manual": pedidos_manual,
    })

# produtos que aparecem nos pedidos mas nao em detalhes_sorteios (fallback raro)
pids_detalhes = set(df_det["product_id"])
for pid, pedidos_manual in manual_por_produto.items():
    if pid in pids_detalhes:
        continue
    valor_contemplacao = round(sum(p["premio"] for p in pedidos_manual), 2)
    sorteios.append({
        "product_id": pid,
        "title": meta_por_id.get(pid, {}).get("title") or f"(sorteio {pid})",
        "status": meta_por_id.get(pid, {}).get("status") or "",
        "data": datas_por_produto.get(pid, ""),
        "faturamento": 0.0,
        "vendas": 0,
        "valor_premio_anunciado": 0.0,
        "baixas_qtd_pedidos": len(pedidos_manual),
        "baixas_qtd_numeros": sum(len(p["numeros"]) for p in pedidos_manual),
        "baixas_valor": round(sum(p["valor"] for p in pedidos_manual), 2),
        "contemplou": valor_contemplacao > 0,
        "valor_contemplacao": valor_contemplacao,
        "pedidos_manual": pedidos_manual,
    })

sorteios.sort(key=lambda s: s["data"] or "", reverse=True)

resumo = {
    "janela_dias": DIAS,
    "data_min_pedidos": df["Data"].dropna().min(),
    "data_max_pedidos": df["Data"].dropna().max(),
    "total_pedidos_periodo": int(len(df)),
    "total_acoes_periodo": len(sorteios),
    "total_pedidos_baixa_manual": int(len(baixas)),
    "total_acoes_com_baixa_manual": sum(1 for s in sorteios if s["baixas_qtd_pedidos"] > 0),
    "total_numeros_baixa_manual": int(baixas["_baixa_manual_numeros"].sum()),
    "total_valor_baixa_manual": round(float(baixas["Valor"].sum()), 2),
    "acoes_contempladas": sum(1 for s in sorteios if s["contemplou"]),
    "valor_total_contemplacao": round(sum(s["valor_contemplacao"] for s in sorteios), 2),
}

out = {"gerado_em": pd.Timestamp.now(tz="America/Sao_Paulo").isoformat(), "resumo": resumo, "sorteios": sorteios}

out_path = os.path.join(HERE, "relatorio_dados.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

print(json.dumps(resumo, ensure_ascii=False, indent=2))
sz = os.path.getsize(out_path)
print(f"gravado em {out_path} ({sz/1024:.0f} KB)")
