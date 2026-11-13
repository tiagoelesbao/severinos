"""
Orquestrador de envio de eventos Purchase ao Meta CAPI, a partir do backlog
já coletado pelo collector.py.

Mantém um checkpoint próprio (`capi_sent_ids.json`, por OrderId) separado do
checkpoint do collector — rodar este script várias vezes nunca reenvia o
mesmo pedido. Pensado para dois modos:

  1) Backlog: `python send_backlog.py 90` — varre todo
     dados_brutos_completos_90dias.csv e envia o que ainda não foi enviado.
  2) Incremental: mesmo comando, repetido via Task Scheduler (mesmo padrão
     já usado pelo agendador de publicação do Instagram no projeto) — a
     cada rodada só envia o que é novo desde a última vez.

Pré-requisito: META_IMPERIO_PREMIOS_DATASET_ID/ACCESS_TOKEN configurados no
.env (ver capi_client.py e a seção "Fora de escopo" do plano). Sem isso,
roda em --dry-run e mostra quantos eventos SERIAM enviados.
"""
import os
import sys
import json
import time
import argparse
import requests
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from capi_client import MetaCAPIClient, buscar_fbc_confiavel  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

LOTE_SIZE = 50  # a Marketing API aceita lotes de eventos; 50 é conservador


def carregar_enviados(path):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return set(json.load(f))
    return set()


def salvar_enviados(path, enviados):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(sorted(enviados), f)
    os.replace(tmp, path)


def buscar_ids_enviados_via_webhook():
    """OrderIds que apps/webhook-imperio-capi/api/order-paid.js já mandou pro
    Meta em tempo real — mesclado aqui pra não reenviar em duplicado (achado
    2026-10-07: sem isso, todo pedido ia pro Meta 2x — uma vez pelo webhook,
    outra pelo polling, já que o webhook não tem acesso ao checkpoint local).
    Best-effort: se a leitura falhar, o pior caso é reenviar alguns pedidos
    que o webhook já cobriu — Meta deduplica certo, só gasta chamada à toa.

    MIGRADO 2026-11-07 de Edge Config pra Supabase Storage — mesmo motivo
    do lado da escrita em order-paid.js (Edge Config passou a cobrar por
    escrita no plano Pro; a leitura em si já era barata, mas troca junto
    pra ler do mesmo lugar onde passou a gravar)."""
    supabase_url = os.environ.get("IMPERIO_SUPABASE_URL")
    if not supabase_url:
        return set()
    try:
        r = requests.get(f"{supabase_url}/storage/v1/object/public/catalogo/webhook_sent_ids.json", timeout=10)
        if r.status_code == 404:
            return set()
        r.raise_for_status()
        ids = r.json()
        return set(ids) if isinstance(ids, list) else set()
    except Exception:
        return set()


def enviar_backlog(dias=90, outdir=None, dry_run=False, test_event_code=None):
    outdir = outdir or os.path.dirname(os.path.abspath(__file__))
    raw_csv = os.path.join(outdir, f"dados_brutos_completos_{dias}dias.csv")
    sent_path = os.path.join(outdir, f"capi_sent_ids_{dias}dias.json")

    if not os.path.exists(raw_csv):
        print(f"❌ {raw_csv} não existe — rode collector.py {dias} primeiro.")
        sys.exit(1)

    # Ver nota em capi_client.py: dtype=str não impede NaN em célula vazia,
    # precisa de fillna("") explícito depois.
    str_cols = ["OrderId", "EventId", "UserId", "PaymentId", "Telefone_E164", "Email", "Fbp", "Fbc", "Ip", "UserAgent", "Nome", "Pais"]
    df = pd.read_csv(raw_csv, sep=";", encoding="utf-8-sig", dtype={c: str for c in str_cols})
    df[str_cols] = df[str_cols].fillna("")
    enviados = carregar_enviados(sent_path)
    via_webhook = buscar_ids_enviados_via_webhook()
    enviados |= via_webhook

    pendentes = df[~df["OrderId"].isin(enviados)]
    print(f"📊 {len(df)} pedidos no CSV | {len(enviados)} já enviados ({len(via_webhook)} via webhook) | {len(pendentes)} pendentes")

    if pendentes.empty:
        print("✅ Nada pendente.")
        return

    client = MetaCAPIClient()
    client.fbc_confiavel_por_fbp = buscar_fbc_confiavel(pendentes["Fbp"].tolist())
    efetivo_dry_run = dry_run or not client.configurado()
    if not client.configurado() and not dry_run:
        print("⚠️ Dataset/Token do Meta não configurados — rodando em modo --dry-run.")

    total_enviados_agora = 0
    lote_eventos, lote_ids = [], []

    for _, row in pendentes.iterrows():
        pedido = row.to_dict()
        lote_eventos.extend(client.build_purchase_events(pedido))
        lote_ids.append(pedido["OrderId"])

        if len(lote_eventos) >= LOTE_SIZE:
            if efetivo_dry_run:
                print(f"   [dry-run] enviaria lote de {len(lote_eventos)} eventos")
            else:
                client.send_events(lote_eventos, test_event_code=test_event_code)
                time.sleep(1)
                # CRÍTICO: só marca como enviado (checkpoint) quando realmente
                # enviou. Bug encontrado 2026-10-07 — dry-run estava marcando
                # os pedidos como enviados mesmo sem chamar a API, fazendo o
                # envio real seguinte achar "0 pendentes" (todo o backlog já
                # tinha sido falsamente consumido por uma rodada de teste).
                enviados.update(lote_ids)
                salvar_enviados(sent_path, enviados)
                total_enviados_agora += len(lote_eventos)
            lote_eventos, lote_ids = [], []

    if lote_eventos:
        if efetivo_dry_run:
            print(f"   [dry-run] enviaria lote final de {len(lote_eventos)} eventos")
        else:
            client.send_events(lote_eventos, test_event_code=test_event_code)
            enviados.update(lote_ids)
            salvar_enviados(sent_path, enviados)
            total_enviados_agora += len(lote_eventos)

    modo = "simulados (dry-run)" if efetivo_dry_run else "enviados"
    print(f"\n🎉 {total_enviados_agora} eventos {modo}. Checkpoint: {sent_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dias", nargs="?", type=int, default=90)
    parser.add_argument("--outdir", default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--test-event-code", default=None)
    args = parser.parse_args()
    enviar_backlog(dias=args.dias, outdir=args.outdir, dry_run=args.dry_run, test_event_code=args.test_event_code)
