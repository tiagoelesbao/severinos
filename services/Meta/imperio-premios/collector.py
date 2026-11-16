"""
Coletor resumível do Império Prêmios para janelas longas (ex: 90 dias).

Produtizado a partir de C:\\Users\\Pichau\\Desktop\\etc\\coletar_resumivel.py
(mesma lógica de checkpoint/CSV incremental, validada em produção — foi este
script, não o extract.py interativo, que gerou a base real de 90 dias usada
no planejamento estratégico do cliente).

Uso:
    python collector.py [dias]            # default 90
    python collector.py 90 --outdir X      # customiza diretório de saída
"""
import sys
import os
import json
import time
import argparse
import pandas as pd
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # Windows cp1252 console quebra em emoji/acentos

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from client_api import SorteiosAPIClient  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env"))


def carregar_checkpoint(checkpoint_file):
    if os.path.exists(checkpoint_file):
        with open(checkpoint_file, encoding="utf-8") as f:
            return json.load(f)
    return {"processados": [], "sorteios_detalhados": []}


# Status em que o sorteio não pode mais receber pedido novo. Só nesses o
# checkpoint pode travar o sorteio como definitivo — ver _deve_travar().
STATUS_TERMINAIS = {"done", "canceled", "cancelled"}


def _deve_travar(sorteio):
    """Um sorteio só vira 'processado' definitivo quando ENCERRA.

    Bug corrigido em 2026-10-10 (P0): o collector marcava TODO sorteio como
    processado após uma única passagem e nunca mais o revisitava. Mas sorteio
    é recurso vivo — participantes entram ao longo de horas. O collector
    fotografava o sorteio recém-criado (vazio) e travava ali para sempre.
    Dano medido no dia do achado: CSV com 64 pedidos contra ~584 reais (11%),
    42 sorteios com zero participantes e 85 ainda `active` congelados.

    Agravante histórico: a correção de paginação de 07/10 (`page=1`→`page=0`)
    piorou este bug — antes o collector só via o sorteio já envelhecido (e
    portanto cheio); depois passou a pegá-lo minutos após a criação, vazio.

    Consumidor mais afetado: reports.py, que gera as Custom Audiences
    (Lookalike e exclusão de Clientes Existentes) a partir deste CSV.
    """
    return (sorteio.get("status") or "").lower() in STATUS_TERMINAIS


def _order_ids_existentes(raw_csv):
    """OrderIds já gravados no CSV, para deduplicar o append.

    Necessário por causa da correção acima: sorteio `active` passa a ser
    revisitado a cada ciclo, então sem isso cada revisita regravaria os
    pedidos que já estavam lá e inflaria o faturamento com duplicata — um
    problema PIOR que o bug original, porque silencioso e cumulativo.
    """
    if not os.path.exists(raw_csv):
        return set()
    try:
        df = pd.read_csv(raw_csv, sep=";", encoding="utf-8-sig", usecols=["OrderId"], dtype=str)
        return set(df["OrderId"].dropna().astype(str))
    except Exception as e:
        # Melhor abortar que duplicar: sem a lista de ids, o append cego
        # corromperia o CSV de faturamento.
        raise RuntimeError(f"Não consegui ler OrderIds de {raw_csv} para deduplicar: {e}") from e


def salvar_checkpoint(checkpoint_file, cp):
    tmp = checkpoint_file + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cp, f, ensure_ascii=False)
    # Retry: em runs longos, algo (antivírus/indexador) prende o .tmp por uma
    # fração de segundo logo após a escrita e o replace falha com
    # PermissionError — transitório, nunca persistente. Sem isso, um coletor
    # de 90 dias (horas de execução) tinha boa chance de morrer no meio.
    for tentativa in range(5):
        try:
            os.replace(tmp, checkpoint_file)
            return
        except PermissionError:
            if tentativa == 4:
                raise
            time.sleep(0.5 * (tentativa + 1))


def _alinhar_schema(raw_csv, colunas_novas):
    """Migra o CSV existente ANTES de um append quando o schema mudou (ex:
    client_api.py ganhou um campo novo). Sem isso, to_csv(mode="a") escreve
    linhas com mais colunas que o header já gravado, corrompendo o arquivo
    de forma que só quebra visivelmente dias depois, no consumidor (achado
    real 2026-10-07: UserId virou coluna nova, send_backlog.py ficou 2h+
    sem conseguir ler o CSV e o pipeline de CAPI parou de enviar eventos
    sem ninguém perceber até o EMQ cair no Events Manager)."""
    with open(raw_csv, encoding="utf-8-sig") as f:
        header_atual = f.readline().rstrip("\r\n").split(";")
    colunas_novas = list(colunas_novas)
    if header_atual == colunas_novas:
        return
    df_existente = pd.read_csv(raw_csv, sep=";", encoding="utf-8-sig", dtype=str)
    for col in colunas_novas:
        if col not in df_existente.columns:
            df_existente[col] = ""
    df_existente = df_existente.reindex(columns=colunas_novas, fill_value="")
    df_existente.to_csv(raw_csv, index=False, sep=";", encoding="utf-8-sig")
    print(f"⚠️ Schema do CSV mudou — {raw_csv} migrado para as colunas atuais antes do append.")


def coletar(dias=90, outdir=None):
    outdir = outdir or os.path.dirname(os.path.abspath(__file__))
    os.makedirs(outdir, exist_ok=True)
    checkpoint_file = os.path.join(outdir, f"checkpoint_{dias}dias.json")
    raw_csv = os.path.join(outdir, f"dados_brutos_completos_{dias}dias.csv")
    sorteios_csv = os.path.join(outdir, f"detalhes_sorteios_{dias}dias.csv")

    print(f"🚀 Coleta resumível — últimos {dias} dias")
    api = SorteiosAPIClient()
    if not api.login():
        print("❌ Falha no login.")
        sys.exit(1)

    sorteios = api.get_sorteios(days=dias)
    if not sorteios:
        print("❌ Nenhum sorteio encontrado.")
        sys.exit(1)

    cp = carregar_checkpoint(checkpoint_file)
    processados = set(cp["processados"])
    # Indexado por product_id: o sorteio `active` é revisitado a cada ciclo e
    # precisa SOBRESCREVER sua entrada, não acumular uma nova (antes era lista
    # com append, o que duplicava a mesma rifa a cada passagem).
    detalhes_por_id = {d["product_id"]: d for d in cp["sorteios_detalhados"] if d.get("product_id")}

    # Auto-cura do checkpoint legado: antes da correção de 2026-10-10 TODO
    # sorteio entrava em `processados`, inclusive os que ainda estavam
    # vendendo. Corrigir só a gravação não bastaria — os sorteios já
    # envenenados continuariam travados para sempre. Aqui destravamos
    # qualquer um que a API ainda reporta como não-encerrado. Idempotente:
    # numa base já sadia não remove nada.
    abertos_agora = {
        (s.get("_id") or s.get("id")) for s in sorteios if not _deve_travar(s)
    }
    presos = processados & abertos_agora
    if presos:
        processados -= presos
        print(f"🔓 Destravados {len(presos)} sorteios ainda abertos que o checkpoint legado havia congelado.")

    print(f"📊 Total de sorteios no período: {len(sorteios)}")
    print(f"📌 Encerrados e travados em execução anterior: {len(processados)}")

    raw_existe = os.path.exists(raw_csv)
    ids_no_csv = _order_ids_existentes(raw_csv)
    print(f"🧾 Pedidos já no CSV (dedup): {len(ids_no_csv)}")

    pendentes = [s for s in sorteios if (s.get("_id") or s.get("id")) not in processados]
    revisitas = sum(1 for s in pendentes if (s.get("_id") or s.get("id")) in detalhes_por_id)
    print(f"🔄 A processar: {len(pendentes)} ({revisitas} revisitas de sorteio ainda aberto)")

    novos_total = 0
    for i, sorteio in enumerate(pendentes, 1):
        pid = sorteio.get("_id") or sorteio.get("id")
        title = sorteio.get("title", "Sem título")
        if not pid:
            continue

        print(f"📋 [{i}/{len(pendentes)}] {title[:50]}")
        valor_premio = api.extrair_valor_premio(sorteio)
        participantes = api.get_participantes_sorteio(pid)
        for p in participantes:
            p["productId"] = pid
            p["productTitle"] = title

        linhas = api.processar_lote(participantes)
        # Faturamento do sorteio é sempre o TOTAL atual (não só o delta novo) —
        # é um retrato do sorteio, e a entrada em detalhes_por_id é sobrescrita.
        faturamento_sorteio = sum(linha["Valor"] for linha in linhas)

        novas = [ln for ln in linhas if str(ln.get("OrderId")) not in ids_no_csv]
        if novas:
            df_lote = pd.DataFrame(novas)
            if raw_existe:
                _alinhar_schema(raw_csv, df_lote.columns)
            df_lote.to_csv(raw_csv, mode="a", header=not raw_existe, index=False, sep=";", encoding="utf-8-sig")
            raw_existe = True
            ids_no_csv.update(str(ln.get("OrderId")) for ln in novas)
            novos_total += len(novas)

        detalhes_por_id[pid] = {
            "product_id": pid,
            "title": title,
            "valor_premio": valor_premio,
            "faturamento": faturamento_sorteio,
            "lucro": faturamento_sorteio - valor_premio,
            "total_participantes": len(participantes),
            "status": sorteio.get("status", ""),
        }
        if _deve_travar(sorteio):
            processados.add(pid)

        cp["processados"] = list(processados)
        cp["sorteios_detalhados"] = list(detalhes_por_id.values())
        salvar_checkpoint(checkpoint_file, cp)

        marca = "🔒" if _deve_travar(sorteio) else "🔓"
        print(f"   ✅ {len(participantes)} part. (+{len(novas)} novos) | Fat: R$ {faturamento_sorteio:,.2f} | {marca} {sorteio.get('status','')}")
        if i % 10 == 0:
            time.sleep(2)

    sorteios_detalhados = list(detalhes_por_id.values())
    pd.DataFrame(sorteios_detalhados).to_csv(sorteios_csv, index=False, sep=";", encoding="utf-8-sig")
    print(f"➕ Pedidos novos gravados neste ciclo: {novos_total}")
    print(f"\n🎉 COLETA COMPLETA! {len(sorteios_detalhados)} sorteios processados.")
    print(f"✅ {raw_csv}")
    print(f"✅ {sorteios_csv}")
    return raw_csv, sorteios_csv


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dias", nargs="?", type=int, default=90)
    parser.add_argument("--outdir", default=None)
    args = parser.parse_args()
    coletar(dias=args.dias, outdir=args.outdir)
