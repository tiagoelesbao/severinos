"""
Unificação local + relatórios finais a partir dos CSVs já coletados pelo
collector.py — não faz nenhuma chamada à API, só processamento local.

Produtizado a partir de C:\\Users\\Pichau\\Desktop\\etc\\gerar_relatorios_90dias.py
(modelo financeiro validado: prêmio + taxa de plataforma, o mesmo usado no
planejamento estratégico real de 90 dias do cliente — MC 17,65%, ROAS_BE
5,67x batem com essa lógica, não com o modelo sintético de COGS/impostos do
extract.py antigo).

Gera, no mesmo diretório dos CSVs de entrada:
- lista_unificada_{dias}dias.csv/.xlsx (participantes agregados + canal + E.164)
- relatorio_canais_{dias}dias.csv (faturamento por canal de atribuição)
- relatorio_financeiro_{dias}dias.csv (MC real + CAC máximo por meta de margem)
- audiencia_recompra_{dias}dias.csv / audiencia_alto_valor_{dias}dias.csv

Uso:
    python reports.py [dias] [--outdir X] [--taxa-plataforma 4.0] [--janela-ativos 30]
"""
import sys
import os
import re
import argparse
import pandas as pd
from datetime import datetime, timedelta, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # Windows cp1252 console quebra em emoji/acentos

TAXA_PLATAFORMA_PCT_DEFAULT = 5.0  # atualizado 2026-10-15, era 4.0
METAS_MARGEM_LIQUIDA = [20, 15, 10, 5]
JANELA_ATIVOS_RECENTES_DIAS_DEFAULT = 30


def normalizar_telefone_e164(telefone):
    if not telefone or pd.isna(telefone):
        return ""
    digitos = re.sub(r"\D", "", str(telefone))
    if not digitos:
        return ""
    if not digitos.startswith("55"):
        digitos = "55" + digitos
    return f"+{digitos}"


def gerar_relatorios(dias=90, outdir=None, taxa_plataforma_pct=TAXA_PLATAFORMA_PCT_DEFAULT,
                      janela_ativos_dias=JANELA_ATIVOS_RECENTES_DIAS_DEFAULT):
    outdir = outdir or os.path.dirname(os.path.abspath(__file__))
    raw_path = os.path.join(outdir, f"dados_brutos_completos_{dias}dias.csv")
    det_path = os.path.join(outdir, f"detalhes_sorteios_{dias}dias.csv")

    # dtype=str nas colunas de identidade/telefone é obrigatório: sem isso o
    # pandas infere Telefone_E164 como int64 e DESCARTA o "+" silenciosamente
    # (confirmado em teste real — "+5546*****2974" virava "5546*****2974"),
    # quebrando o formato que o Meta CAPI/Custom Audiences espera.
    str_cols = ["OrderId", "PaymentId", "PaymentEndToEndId", "Telefone", "Telefone_E164",
                "Email", "Cpf", "ProductId", "Ip"]
    print("📥 Lendo dados brutos...")
    df = pd.read_csv(raw_path, sep=";", encoding="utf-8-sig", dtype={c: str for c in str_cols})
    print(f"   {len(df)} pedidos carregados")
    df_det = pd.read_csv(det_path, sep=";", encoding="utf-8-sig", dtype={"product_id": str})
    print(f"   {len(df_det)} sorteios carregados")

    # ---------- Unificação por participante ----------
    print("\n🔄 Unificando participantes...")

    def canal_principal(serie):
        return serie.value_counts().idxmax()

    # Telefone_E164 já vem calculado linha a linha pelo client_api (prioriza
    # o e164 pronto da API); aqui só herdamos o primeiro valor não-vazio por
    # participante, sem recalcular.
    agg = df.groupby(["Nome", "Telefone"], dropna=False).agg(
        Valor_Total_Gasto=("Valor", "sum"),
        Quantidade_Titulos=("Quantidade", "sum"),
        Quantidade_Compras=("Valor", "count"),
        Total_Sorteios=("ProductId", "nunique"),
        Canal_Principal=("Canal_Atribuicao", canal_principal),
        Comprou_Via_Anuncio=("Veio_De_Anuncio", "any"),
        Primeira_Compra=("Data", "min"),
        Ultima_Compra=("Data", "max"),
        Telefone_E164=("Telefone_E164", "first"),
    ).reset_index()

    agg["Telefone_E164"] = agg["Telefone_E164"].fillna("")
    sem_e164 = agg["Telefone_E164"] == ""
    agg.loc[sem_e164, "Telefone_E164"] = agg.loc[sem_e164, "Telefone"].apply(normalizar_telefone_e164)
    agg = agg.sort_values("Valor_Total_Gasto", ascending=False)
    print(f"   {len(agg)} participantes únicos")

    uni_csv = os.path.join(outdir, f"lista_unificada_{dias}dias.csv")
    agg.to_csv(uni_csv, index=False, sep=";", encoding="utf-8-sig")
    try:
        agg.to_excel(os.path.join(outdir, f"lista_unificada_{dias}dias.xlsx"), index=False)
    except Exception as e:
        print(f"   ⚠️ Excel não gerado: {e}")
    print(f"✅ {uni_csv}")

    # ---------- Relatório de canais ----------
    print("\n🔄 Relatório de canais...")
    canais = df.groupby("Canal_Atribuicao").agg(
        Faturamento=("Valor", "sum"),
        Pedidos=("Valor", "count"),
        Participantes_Unicos=("Telefone", "nunique"),
        Ticket_Medio=("Valor", "mean"),
    ).reset_index().sort_values("Faturamento", ascending=False)
    fat_total_canais = canais["Faturamento"].sum()
    canais["Pct_Faturamento"] = (canais["Faturamento"] / fat_total_canais * 100).round(2)
    canais_csv = os.path.join(outdir, f"relatorio_canais_{dias}dias.csv")
    canais.to_csv(canais_csv, index=False, sep=";", encoding="utf-8-sig")
    print(f"✅ {canais_csv}")
    for _, row in canais.iterrows():
        print(f"   {row['Canal_Atribuicao']:<40} R$ {row['Faturamento']:>13,.2f} "
              f"({row['Pct_Faturamento']:>5.1f}%)  {int(row['Pedidos']):>6} pedidos")

    # ---------- Audiências (recompra >=2 compras / alto valor top 20%) ----------
    print("\n🔄 Audiências...")
    recompra = agg[agg["Quantidade_Compras"] >= 2][["Nome", "Telefone_E164"]].copy()
    recompra.columns = ["nome", "phone"]
    recompra_csv = os.path.join(outdir, f"audiencia_recompra_{dias}dias.csv")
    recompra.to_csv(recompra_csv, index=False, encoding="utf-8-sig")
    print(f"✅ {recompra_csv} ({len(recompra)} contatos)")

    limite_top20 = agg["Valor_Total_Gasto"].quantile(0.80)
    alto_valor = agg[agg["Valor_Total_Gasto"] >= limite_top20][["Nome", "Telefone_E164"]].copy()
    alto_valor.columns = ["nome", "phone"]
    alto_valor_csv = os.path.join(outdir, f"audiencia_alto_valor_{dias}dias.csv")
    alto_valor.to_csv(alto_valor_csv, index=False, encoding="utf-8-sig")
    print(f"✅ {alto_valor_csv} ({len(alto_valor)} contatos)")

    # Geral: todo participante com telefone válido, já ordenado por valor
    # gasto (herdado do sort_values de `agg`) — pra exclusão ampla de
    # clientes existentes (Audience Controls) ou lookalike geral, não só
    # o recorte de alto valor/recompra acima.
    geral = agg[agg["Telefone_E164"] != ""][["Nome", "Telefone_E164"]].copy()
    geral.columns = ["nome", "phone"]
    geral_csv = os.path.join(outdir, f"audiencia_geral_{dias}dias.csv")
    geral.to_csv(geral_csv, index=False, encoding="utf-8-sig")
    print(f"✅ {geral_csv} ({len(geral)} contatos)")

    # Clientes Ativos Recentes — exclusão de prospecção (B4 do setup-guide
    # de 09/10): sem isso, campanhas de prospecção (Campanhas 2 e 3) pagam
    # pra "converter" cliente que já compraria por conta própria — achado
    # de 07/10 (ROAS agregado ~7x mascarando prospecção real em 0,47x).
    # Fonte: pedidos pagos nos últimos N dias (default 30), mesma base da
    # audiencia_recompra, sem o filtro de >=2 compras — aqui QUALQUER
    # compra recente já torna o cliente "ativo" pro efeito de exclusão.
    ultima_compra_dt = pd.to_datetime(agg["Ultima_Compra"], errors="coerce", utc=True)
    corte_ativos = datetime.now(timezone.utc) - timedelta(days=janela_ativos_dias)
    ativos_recentes = agg[ultima_compra_dt >= corte_ativos][["Nome", "Telefone_E164"]].copy()
    ativos_recentes.columns = ["nome", "phone"]
    ativos_csv = os.path.join(outdir, f"audiencia_clientes_ativos_recentes_{janela_ativos_dias}dias.csv")
    ativos_recentes.to_csv(ativos_csv, index=False, encoding="utf-8-sig")
    print(f"✅ {ativos_csv} ({len(ativos_recentes)} contatos, últimos {janela_ativos_dias} dias)")

    # ---------- Relatório financeiro (prêmio + taxa de plataforma) ----------
    print("\n🔄 Relatório financeiro...")
    faturamento_total = df["Valor"].sum()
    custo_premios = df_det["valor_premio"].sum()
    taxa_plataforma = faturamento_total * (taxa_plataforma_pct / 100)
    margem_contribuicao = faturamento_total - (custo_premios + taxa_plataforma)
    margem_contribuicao_pct = margem_contribuicao / faturamento_total * 100 if faturamento_total else 0
    roas_break_even = faturamento_total / margem_contribuicao if margem_contribuicao > 0 else 0

    total_usuarios = len(agg)
    total_compras = agg["Quantidade_Compras"].sum()
    total_titulos = agg["Quantidade_Titulos"].sum()
    ticket_medio = faturamento_total / total_usuarios if total_usuarios else 0
    ticket_medio_compra = faturamento_total / total_compras if total_compras else 0

    linhas = [
        ("faturamento_total", faturamento_total),
        ("custo_total_premios", custo_premios),
        ("taxa_plataforma_pct", taxa_plataforma_pct),
        ("taxa_plataforma_valor", taxa_plataforma),
        ("margem_contribuicao", margem_contribuicao),
        ("margem_contribuicao_pct", margem_contribuicao_pct),
        ("roas_break_even", roas_break_even),
        ("ticket_medio", ticket_medio),
        ("ticket_medio_por_compra", ticket_medio_compra),
        ("total_usuarios", total_usuarios),
        ("total_compras", total_compras),
        ("total_titulos", total_titulos),
        ("total_sorteios", len(df_det)),
    ]

    print(f"\n💰 FATURAMENTO TOTAL ({dias} dias): R$ {faturamento_total:,.2f}")
    print(f"🎁 CUSTO TOTAL PRÊMIOS: R$ {custo_premios:,.2f}")
    print(f"💳 TAXA PLATAFORMA ({taxa_plataforma_pct}%): R$ {taxa_plataforma:,.2f}")
    print(f"📊 MARGEM DE CONTRIBUIÇÃO: R$ {margem_contribuicao:,.2f} ({margem_contribuicao_pct:.2f}%)")
    print(f"🎯 ROAS BREAK-EVEN: {roas_break_even:.2f}x")
    print(f"👥 Usuários únicos: {total_usuarios:,} | Compras: {total_compras:,} | Ticket médio: R$ {ticket_medio:,.2f}")

    print("\n🎯 CAC MÁXIMO POR META DE MARGEM LÍQUIDA:")
    for meta in METAS_MARGEM_LIQUIDA:
        margem_desejada_valor = faturamento_total * (meta / 100)
        cac_max = margem_contribuicao - margem_desejada_valor
        linhas.append((f"cac_maximo_meta_{meta}pct", cac_max))
        viavel = "✅" if cac_max > 0 else "❌"
        print(f"   {viavel} Meta {meta:>2}%: CAC máximo = R$ {cac_max:,.2f}")

    fin_csv = os.path.join(outdir, f"relatorio_financeiro_{dias}dias.csv")
    with open(fin_csv, "w", encoding="utf-8-sig") as f:
        f.write("Métrica;Valor\n")
        for k, v in linhas:
            f.write(f"{k};{v}\n")
    print(f"\n✅ {fin_csv}")

    return {
        "lista_unificada": uni_csv,
        "relatorio_canais": canais_csv,
        "audiencia_recompra": recompra_csv,
        "audiencia_alto_valor": alto_valor_csv,
        "audiencia_geral": geral_csv,
        "audiencia_clientes_ativos_recentes": ativos_csv,
        "relatorio_financeiro": fin_csv,
        "metricas": dict(linhas),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dias", nargs="?", type=int, default=90)
    parser.add_argument("--outdir", default=None)
    parser.add_argument("--taxa-plataforma", type=float, default=TAXA_PLATAFORMA_PCT_DEFAULT)
    parser.add_argument("--janela-ativos", type=int, default=JANELA_ATIVOS_RECENTES_DIAS_DEFAULT)
    args = parser.parse_args()
    gerar_relatorios(dias=args.dias, outdir=args.outdir, taxa_plataforma_pct=args.taxa_plataforma,
                      janela_ativos_dias=args.janela_ativos)
