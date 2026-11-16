import json
import io
from collections import defaultdict

with open("baixas_manuais_por_acao.json", encoding="utf-8") as f:
    data = json.load(f)
acoes = data["acoes"]
resumo = data["resumo"]

contempladas = sorted([a for a in acoes if a["contemplou"]], key=lambda a: -a["valor_contemplacao"])

# Corte mensal (ano-mes da ULTIMA data de baixa manual da acao)
por_mes = defaultdict(lambda: {"acoes": set(), "pedidos": 0, "numeros": 0, "valor_pedidos": 0.0, "acoes_contempladas": 0, "valor_contemplacao": 0.0})
for a in acoes:
    mes = (a["ultima_data"] or "0000-00")[:7]
    m = por_mes[mes]
    m["acoes"].add(a["product_id"])
    m["pedidos"] += a["qtd_pedidos_baixa_manual"]
    m["numeros"] += a["qtd_numeros_baixa_manual"]
    m["valor_pedidos"] += a["valor_pedidos_baixa_manual"]
    if a["contemplou"]:
        m["acoes_contempladas"] += 1
        m["valor_contemplacao"] += a["valor_contemplacao"]

with io.open("cortes.txt", "w", encoding="utf-8") as out:
    out.write("=== RESUMO GERAL ===\n")
    out.write(json.dumps(resumo, ensure_ascii=False, indent=2) + "\n\n")

    out.write("=== POR MES (acao, pedidos, numeros, valor pedidos, acoes contempladas, valor contemplacao) ===\n")
    for mes in sorted(por_mes.keys()):
        m = por_mes[mes]
        out.write(f"{mes} | acoes={len(m['acoes']):4d} | pedidos={m['pedidos']:5d} | numeros={m['numeros']:5d} | "
                   f"valor_pedidos=R$ {m['valor_pedidos']:>10,.2f} | contempladas={m['acoes_contempladas']:3d} | "
                   f"valor_contemplacao=R$ {m['valor_contemplacao']:>10,.2f}\n")

    out.write(f"\n=== TODAS as {len(contempladas)} acoes CONTEMPLADAS por baixa manual (maior valor primeiro) ===\n")
    for a in contempladas:
        out.write(f"{a['ultima_data'][:10]} | {a['status']:10s} | {a['title'][:60]:60s} | "
                   f"pedidos={a['qtd_pedidos_baixa_manual']:3d} nums={a['qtd_numeros_baixa_manual']:3d} | "
                   f"premio=R$ {a['valor_contemplacao']:>10,.2f} | product_id={a['product_id']}\n")

print("ok, gravado em cortes.txt")
