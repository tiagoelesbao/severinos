"""
Envio de InitiateCheckout pro Meta CAPI — pedido 2026-10-07 do founder:
"os outros eventos também precisam urgente de deduplicação e correção de
parâmetros". Events Manager mostrava Desduplicação "Não atende às boas
práticas" (19,92% de cobertura por Identificação do evento) e Cobertura de
eventos baixa (21%) pro InitiateCheckout — porque NUNCA mandávamos esse
evento via CAPI, só a Compra.

ACHADO que viabiliza isso (2026-10-07, validado com teste real): a API do
cliente expõe pedidos com filterStatus="all" (não só "paid") — inclui
status "waiting-payment" e "expired", ou seja, TODO checkout iniciado, com
ou sem pagamento confirmado. Cada registro já vem com um campo `eventId`
próprio (formato "<n>.<timestamp_ms>.<n>"), DIFERENTE do `_id` do pedido —
o timestamp embutido bate com ~1 segundo de antecedência do createdAt do
pedido, consistente com ser a MESMA id que o navegador usa no seu próprio
InitiateCheckout (testado ao vivo: founder iniciou 1 checkout real,
capturamos o eventId, mandamos via CAPI com essa id — ver
gates-status.yaml pro resultado da validação).

Checkpoint PRÓPRIO (capi_initiatecheckout_sent_ids_Ndias.json), por OrderId
— rodar várias vezes nunca reenvia o mesmo checkout. Pensado pro mesmo
padrão de agendamento do send_backlog.py (Task Scheduler).
"""
import os
import sys
import json
import time
import argparse
import requests
import pandas as pd
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from client_api import SorteiosAPIClient  # noqa: E402
from capi_client import MetaCAPIClient, _hash, _hash_phone, _hash_nome_partes, buscar_fbc_confiavel  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env"))

LOTE_SIZE = 50


def pull_checkouts(dias):
    """Mesmo padrão de services/Meta/imperio-premios/collector.py, mas com
    status="all" (não só "paid") — pega TODO checkout iniciado."""
    client = SorteiosAPIClient()
    if not client.login():
        print("❌ Falha no login da API do cliente.")
        sys.exit(1)

    sorteios = client.get_sorteios(days=dias)
    print(f"📊 {len(sorteios)} sorteios no período de {dias} dias")

    linhas = []
    for i, sorteio in enumerate(sorteios, 1):
        pid = sorteio.get("_id") or sorteio.get("id")
        if not pid:
            continue
        participantes = client.get_participantes_sorteio(pid, status="all")
        for p in participantes:
            p["productId"] = pid
        linhas.extend(client.processar_lote(participantes))
        if i % 10 == 0:
            print(f"   ... {i}/{len(sorteios)} sorteios processados")

    df = pd.DataFrame(linhas)
    print(f"✅ {len(df)} checkouts coletados (todos os status)")
    return df


def build_initiatecheckout_event(pedido: dict, client: MetaCAPIClient = None) -> dict:
    """Espelha capi_client.py::build_purchase_event, mas: event_name
    InitiateCheckout, event_time = Data (createdAt do pedido — quando o
    checkout começou, não PaymentAt), event_id = EventId do pedido (achado
    2026-10-07) com fallback pro OrderId se faltar.

    `client` deve vir com `fbc_confiavel_por_fbp` já populado (ver
    buscar_fbc_confiavel em capi_client.py) pra usar o fbc capturado via
    GTM em vez do campo contaminado da API do cliente — mesma lógica do
    Purchase. Instanciar aqui dentro (como antes) perdia esse lookup a
    cada chamada."""
    client = client or MetaCAPIClient()
    event_time_str = pedido.get("Data")
    try:
        from dateutil import parser as date_parser
        event_time_unix = int(date_parser.parse(event_time_str).timestamp()) if event_time_str else int(time.time())
    except Exception:
        event_time_unix = int(time.time())

    user_data = {}
    em = _hash(pedido.get("Email"))
    if em:
        user_data["em"] = [em]
    ph = _hash_phone(pedido.get("Telefone_E164"))
    if ph:
        user_data["ph"] = [ph]
    ext_id = _hash(pedido.get("UserId"))
    if ext_id:
        user_data["external_id"] = [ext_id]
    if pedido.get("Fbp"):
        user_data["fbp"] = pedido["Fbp"]
    fbc_confiavel = client.fbc_confiavel_por_fbp.get(pedido.get("Fbp"))
    fbc_para_usar = fbc_confiavel or pedido.get("Fbc")
    if client._fbc_fresco(fbc_para_usar, event_time_unix):
        user_data["fbc"] = fbc_para_usar
    if pedido.get("Ip"):
        user_data["client_ip_address"] = pedido["Ip"]
    if pedido.get("UserAgent"):
        user_data["client_user_agent"] = pedido["UserAgent"]
    fn, ln = _hash_nome_partes(pedido.get("Nome"))
    if fn:
        user_data["fn"] = [fn]
    if ln:
        user_data["ln"] = [ln]
    pais = _hash(pedido.get("Pais"))
    if pais:
        user_data["country"] = [pais]

    event_id = pedido.get("EventId") or pedido.get("OrderId")

    return {
        "event_name": "InitiateCheckout",
        "event_time": event_time_unix,
        "event_id": event_id,
        "action_source": "website",
        "event_source_url": "https://rapidinhas24hr.com/",  # domínio trocado 2026-10-22 (era imperiopremioss.com, morto)
        "user_data": user_data,
        "custom_data": {
            "currency": "BRL",
            "value": float(pedido.get("Valor", 0) or 0),
            "order_id": pedido.get("OrderId"),
        },
    }


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


def enviar(dias=3, dry_run=False, test_event_code=None):
    outdir = os.path.dirname(os.path.abspath(__file__))
    sent_path = os.path.join(outdir, f"capi_initiatecheckout_sent_ids_{dias}dias.json")

    df = pull_checkouts(dias)
    if df.empty:
        print("✅ Nada coletado.")
        return

    str_cols = ["OrderId", "EventId", "UserId", "Telefone_E164", "Email", "Fbp", "Fbc", "Ip", "UserAgent", "Nome", "Pais"]
    for c in str_cols:
        if c in df.columns:
            df[c] = df[c].fillna("")

    enviados = carregar_enviados(sent_path)
    pendentes = df[~df["OrderId"].isin(enviados)]
    print(f"📊 {len(df)} checkouts coletados | {len(enviados)} já enviados | {len(pendentes)} pendentes")

    if pendentes.empty:
        print("✅ Nada pendente.")
        return

    client = MetaCAPIClient()
    client.fbc_confiavel_por_fbp = buscar_fbc_confiavel(pendentes["Fbp"].tolist())
    efetivo_dry_run = dry_run or not client.configurado()
    if not client.configurado() and not dry_run:
        print("⚠️ Dataset/Token do Meta não configurados — rodando em modo --dry-run.")

    total_enviados = 0
    lote_eventos, lote_ids = [], []
    for _, row in pendentes.iterrows():
        pedido = row.to_dict()
        lote_eventos.append(build_initiatecheckout_event(pedido, client))
        lote_ids.append(pedido["OrderId"])

        if len(lote_eventos) >= LOTE_SIZE:
            if efetivo_dry_run:
                print(f"   [dry-run] enviaria lote de {len(lote_eventos)} eventos")
            else:
                client.send_events(lote_eventos, test_event_code=test_event_code)
                time.sleep(1)
                enviados.update(lote_ids)
                salvar_enviados(sent_path, enviados)
                total_enviados += len(lote_eventos)
            lote_eventos, lote_ids = [], []

    if lote_eventos:
        if efetivo_dry_run:
            print(f"   [dry-run] enviaria lote final de {len(lote_eventos)} eventos")
        else:
            client.send_events(lote_eventos, test_event_code=test_event_code)
            enviados.update(lote_ids)
            salvar_enviados(sent_path, enviados)
            total_enviados += len(lote_eventos)

    modo = "simulados (dry-run)" if efetivo_dry_run else "enviados"
    print(f"\n🎉 {total_enviados} InitiateCheckout {modo}. Checkpoint: {sent_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dias", nargs="?", type=int, default=3)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--test-event-code", default=None)
    args = parser.parse_args()
    enviar(dias=args.dias, dry_run=args.dry_run, test_event_code=args.test_event_code)
