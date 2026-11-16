"""Injeta relatorio_dados.json dentro do template HTML autossuficiente
(relatorio_template.html) e grava relatorio-baixas-manuais-2026.html final,
pronto pra enviar ao cliente."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, "relatorio_dados.json"), encoding="utf-8") as f:
    dados_raw = f.read()

with open(os.path.join(HERE, "relatorio_template.html"), encoding="utf-8") as f:
    template = f.read()

# evita que um nome de comprador com "</script" quebre o parser do HTML
dados_seguro = dados_raw.replace("</script", "<\\/script").replace("</SCRIPT", "<\\/SCRIPT")

out = template.replace("__DADOS_JSON__", dados_seguro)

out_path = os.path.join(HERE, "relatorio-baixas-manuais-2026.html")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(out)

print(f"gravado em {out_path} ({os.path.getsize(out_path)/1024:.0f} KB)")
