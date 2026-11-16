"""Relatório de baixas manuais (ApprovedBy="admin") — pedido do cliente
Império Prêmios, via founder (2026-10-19): quantidade por ação, se
contemplaram, valor da contemplação. Reusa a lógica JÁ VALIDADA de
bi_aggregator.py (_anexar_baixa_manual/_numeros_premiados_por_sorteio) —
não reimplementa a regra de negócio, só agrega/formata diferente (por
ação, não por dia).

Fonte: dados_brutos_completos_120dias.csv (coletado agora, 120 dias,
cobre desde 11/07/2026 — primeiro pedido real encontrado — até hoje) +
client.get_sorteios(days=120) ao vivo (só pra pegar `winners[]`, que o
CSV do collector não carrega).
"""
import json
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from client_api import SorteiosAPIClient  # noqa: E402
from bi_aggregator import _anexar_baixa_manual, _numeros_premiados_por_sorteio  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, "dados_brutos_completos_120dias.csv")
DIAS = 120

print("🔑 login...")
client = SorteiosAPIClient()
if not client.login():
    print("❌ falha no login")
    sys.exit(1)

print(f"📊 buscando sorteios ({DIAS} dias) pra pegar winners[]...")
sorteios_meta = client.get_sorteios(days=DIAS)
print(f"✅ {len(sorteios_meta)} sorteios")

# título/status por product_id (pra nomear a ação no relatório)
meta_por_id = {}
for s in sorteios_meta:
    pid = s.get("_id") or s.get("id")
    if pid:
        meta_por_id[pid] = {"title": s.get("title") or "(sem título)", "status": s.get("status") or ""}

print(f"📄 lendo {CSV_PATH}...")
df = pd.read_csv(CSV_PATH, sep=";", encoding="utf-8-sig", dtype=str, low_memory=False)
df["Valor"] = pd.to_numeric(df["Valor"], errors="coerce").fillna(0.0)
print(f"✅ {len(df)} pedidos")

df = _anexar_baixa_manual(df, sorteios_meta)

baixas = df[df["_eh_baixa_manual"]].copy()
print(f"🔎 {len(baixas)} PEDIDOS com baixa manual (ApprovedBy=admin)")

premiados = _numeros_premiados_por_sorteio(sorteios_meta)

# ── Agregação POR AÇÃO (sorteio) — o que o cliente pediu ──────────────────
por_acao = []
for pid, grupo in baixas.groupby("ProductId"):
    meta = meta_por_id.get(pid, {"title": f"(sorteio {pid}, fora da janela de 120 dias)", "status": ""})
    qtd_pedidos = len(grupo)
    qtd_numeros = int(grupo["_baixa_manual_numeros"].sum())
    valor_pedidos = float(grupo["Valor"].sum())
    premio_recuperado = float(grupo["_baixa_manual_premio"].sum())
    contemplou = premio_recuperado > 0
    # Datas dos pedidos de baixa manual desta ação (pra contexto no relatório)
    datas = sorted(grupo["Data"].dropna().tolist())
    por_acao.append({
        "product_id": pid,
        "title": meta["title"],
        "status": meta["status"],
        "qtd_pedidos_baixa_manual": qtd_pedidos,
        "qtd_numeros_baixa_manual": qtd_numeros,
        "valor_pedidos_baixa_manual": round(valor_pedidos, 2),
        "contemplou": contemplou,
        "valor_contemplacao": round(premio_recuperado, 2),
        "primeira_data": datas[0] if datas else "",
        "ultima_data": datas[-1] if datas else "",
    })

por_acao.sort(key=lambda r: r["ultima_data"], reverse=True)

resumo = {
    "janela_dias": DIAS,
    "data_min_pedidos": df["Data"].dropna().min(),
    "data_max_pedidos": df["Data"].dropna().max(),
    "total_pedidos_periodo": len(df),
    "total_acoes_periodo": len(meta_por_id),
    "total_pedidos_baixa_manual": len(baixas),
    "total_acoes_com_baixa_manual": len(por_acao),
    "total_numeros_baixa_manual": int(baixas["_baixa_manual_numeros"].sum()),
    "total_valor_baixa_manual": round(float(baixas["Valor"].sum()), 2),
    "acoes_contempladas": sum(1 for r in por_acao if r["contemplou"]),
    "valor_total_contemplacao": round(sum(r["valor_contemplacao"] for r in por_acao), 2),
}

out_json = os.path.join(HERE, "baixas_manuais_por_acao.json")
with open(out_json, "w", encoding="utf-8") as f:
    json.dump({"resumo": resumo, "acoes": por_acao}, f, ensure_ascii=False, indent=2)

print(json.dumps(resumo, ensure_ascii=False, indent=2))
print(f"\n💾 {out_json}")
