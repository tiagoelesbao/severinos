"""
Agregador de dados do BI — Garantido Prêmios.

Clone estrutural do BI do Império (apps/BI/imperio-premios +
services/Meta/imperio-premios/bi_aggregator.py::dividir_por_pagina): mesma
divisão em 4 páginas (Executiva/Operacional/Produto/Qualidade), mesmo shell
de nav/tema/filtro de período. A diferença é o que cada fonte de dado
realmente tem hoje (2026-10-30):

REAL, sem mock:
  - pull_campanhas / pull_meta_insights — Meta Ads Insights via Graph API
    (META_GARANTIDO_PREMIOS_ACCESS_TOKEN / META_GARANTIDO_PREMIOS_DATASET_ID).
    Filtra pra account_status==1 (ativa) — o token enxerga 2 contas
    (act_28685818161087189 "Gaarant 2", ATIVA; act_944493768207073
    "CA garantido.1 - 01", DESABILITADA) e sem o filtro o pipeline ia somar
    campanhas de uma conta morta. Confirmado via API em 2026-10-30, não
    hardcoda o ID — se a conta ativa mudar de novo, o filtro acompanha
    sozinho (mesmo princípio "nunca travar em 1 conta" do Império).
  - pull_pixel_funnel — Meta Pixel/CAPI stats (tracking nativo da Garantido,
    EMQ 9.0-9.3/10 medido manualmente em 2026-10-09 no Events Manager — não
    é um número que a API devolve por request, por isso não é recalculado
    aqui a cada refresh; ver nota em montar_qualidade()). Decisão já
    registrada: NÃO construir webhook/CAPI novo pra este cliente, só ler o
    que já existe — ao contrário do Império, onde o tracking nativo tinha
    gaps reais que motivaram webhook-imperio-capi/utm-capture-imperio.
  - pull_group_clicks — cliques no link curto do grupo de WhatsApp
    (apps/link-garantido, tabela `short_link_clicks` do Supabase da
    Garantido). A tabela existia só como SQL pendente de rodar manualmente
    quando este módulo nasceu (2026-10-09) — confirmado via API em
    2026-10-30 que já foi criada e já tem linha real.

PEDIDO REAL VIA WEBHOOK (2026-10-30) — substitui o mock quando a tabela
`pedidos` tem linha:
  - pull_pedidos_reais — lê a tabela `pedidos` (Supabase da Garantido),
    alimentada pelo webhook order.paid cadastrado no painel da plataforma
    (ver apps/webhook-garantido-pedidos/). Ainda NÃO é a API REST completa
    do Império (client_api.py, login + listagem de sorteios) — é só o fluxo
    de eventos order.paid. Dá pra calcular faturamento real, canal de
    atribuição, novo×recorrente, e lucro por sorteio (prêmio parseado do
    `product_title`, mesmo regex de client_api.py::_parse_valor_brl_from_title
    do Império — confirmado 2026-10-30 que os títulos da Garantido seguem
    convenção parecida "...R$X").
  - FALLBACK AUTOMÁTICO: se `pedidos` não existir ainda ou estiver vazia,
    tudo cai em pull_pedidos() (mock explícito, `_mock: true`) — nenhuma
    tela quebra, só mostra "aguardando dado real" até o webhook começar a
    popular a tabela.
  - O QUE NÃO DÁ PRA CALCULAR, mesmo com o webhook: "baixa manual" (número
    marcado pago por um admin sem venda real) — isso vem de dado por
    PARTICIPANTE da API de sorteios que o Império tem e a Garantido não;
    omitido de propósito, não inventado.
  - O QUE FICA PENDENTE DE UM NÚMERO DE NEGÓCIO (não de dado): a % de margem
    de contribuição própria da Garantido (campo `margem_contribuicao_pct`)
    — o founder confirmou 2026-10-30 que isso só dá pra calcular depois de
    acumular histórico de pedidos (preço×prêmio×volume ao longo do tempo);
    não é a mesma % do Império, não deve ser copiada. Até lá,
    `margem_contribuicao_campanha`/CAC máximo ficam `None` com nota
    explicando — mas a margem de contribuição POR SORTEIO (lucro bruto -
    taxa de 5%, mesma TAXA_PLATAFORMA do Império) já é real, é só
    aritmética sobre o pedido.

Uso:
    python bi_aggregator.py [--dias 30]
    (grava os 4 data-*.json em ../../../apps/BI/garantido-premios/)
"""
import os
import re
import sys
import json
import argparse
import requests
import pandas as pd
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT, "..", "..", "..", ".env"))

GRAPH = "https://graph.facebook.com/v21.0"
TZ_BRASIL = "America/Sao_Paulo"
PIXEL_ID = os.environ.get("META_GARANTIDO_PREMIOS_DATASET_ID")
TOKEN = os.environ.get("META_GARANTIDO_PREMIOS_ACCESS_TOKEN")

GARANTIDO_SUPABASE_URL = os.environ.get("GARANTIDO_SUPABASE_URL")
GARANTIDO_SUPABASE_SERVICE_ROLE_KEY = os.environ.get("GARANTIDO_SUPABASE_SERVICE_ROLE_KEY")

OUT_DIR = os.path.join(ROOT, "..", "..", "..", "apps", "BI", "garantido-premios")

# Bucket PRIVADO dedicado — publica os 4 data-*.json lá pra api/dados.js
# servir sem precisar de "vercel --prod" a cada refresh (achado 2026-11-03:
# o limite de 100 deploys/dia é compartilhado entre TODOS os projetos da
# conta Vercel). NÃO usa o nome "catalogo" (padrão do Império pro catálogo
# de sorteios) porque lá aquele bucket é PÚBLICO — "bi-dados" aqui nasceu
# privado (`public: false`) de propósito: só a service role key lê.
BI_STORAGE_BUCKET = "bi-dados"


def publicar_bi_storage(nome_arquivo, dados):
    if not GARANTIDO_SUPABASE_URL or not GARANTIDO_SUPABASE_SERVICE_ROLE_KEY:
        print(f"⚠️  Storage não publicado ({nome_arquivo}) — GARANTIDO_SUPABASE_URL/KEY ausentes")
        return
    url = f"{GARANTIDO_SUPABASE_URL}/storage/v1/object/{BI_STORAGE_BUCKET}/{nome_arquivo}"
    r = requests.post(
        url,
        headers={
            "apikey": GARANTIDO_SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {GARANTIDO_SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "x-upsert": "true",
            "Cache-Control": "no-cache",
        },
        data=json.dumps(dados, ensure_ascii=False).encode("utf-8"),
        timeout=30,
    )
    if not r.ok:
        raise RuntimeError(f"Supabase Storage {r.status_code} ({nome_arquivo}): {r.text[:300]}")

MOTIVO_MOCK_PEDIDOS = (
    "Aguardando acesso à API do backend da plataforma garantidopremios.com "
    "(equivalente a IMPERIO_PREMIOS_API_EMAIL/PASSWORD, ainda não existe pra "
    "Garantido). Sem isso não há pedido real pra cruzar com Meta Ads — "
    "nenhum número desta seção foi inventado."
)

EMQ_NOTA = (
    "EMQ 9.0–9.3/10 em todos os eventos, medido manualmente no Events "
    "Manager em 2026-10-09 — a Graph API não devolve EMQ por request, então "
    "este número não é recalculado a cada refresh. Reconferir manualmente "
    "no Events Manager se o funil abaixo mudar de perfil."
)


def graph_get(path, params=None):
    """Segue paginação (paging.next) sempre que a resposta tiver uma lista
    `data` — mesmo bug achado e corrigido no bi_aggregator.py do Império
    em 2026-11-03: sem isso, qualquer endpoint com mais de 25 registros
    (página padrão da Graph API) tinha o resto descartado silenciosamente,
    incluindo o dia de HOJE nos insights diários de campanhas com mais de
    25 dias de vida. Corrigido aqui ANTES de a Garantido completar 25 dias
    de campanha (hoje tem ~14), pra não repetir o mesmo problema."""
    if not TOKEN:
        raise RuntimeError("META_GARANTIDO_PREMIOS_ACCESS_TOKEN não configurado no .env")
    params = dict(params or {})
    params["access_token"] = TOKEN
    r = requests.get(f"{GRAPH}{path}", params=params, timeout=30)
    r.raise_for_status()
    j = r.json()
    if isinstance(j.get("data"), list):
        proxima = (j.get("paging") or {}).get("next")
        paginas = 1
        while proxima and paginas < 50:
            rp = requests.get(proxima, timeout=30)
            rp.raise_for_status()
            jp = rp.json()
            j["data"].extend(jp.get("data") or [])
            proxima = (jp.get("paging") or {}).get("next")
            paginas += 1
    return j


#  1=ACTIVE, 2=DISABLED, 3=UNSETTLED, 7=PENDING_RISK_REVIEW,
#  8=PENDING_SETTLEMENT, 9=IN_GRACE_PERIOD, 100=PENDING_CLOSURE, 101=CLOSED.
# Só exclui o que está genuinamente morto — uma conta em "grace period"
# (achado 2026-11-08: Gaarant 2 caiu pra status 9, provável cobrança
# pendente) continua entregando anúncio de verdade, não pode ficar fora
# do BI só porque não é exatamente "1". Isso já zerou Ads de TODOS os
# períodos (não só hoje) até ser corrigido.
STATUS_CONTA_MORTA = {2, 100, 101}


def pull_campanhas():
    """Campanhas ativas/pausadas das contas de anúncio vivas do token.
    Mesmo princípio do Império (nunca travar num único campaign_id fixo),
    mas com um filtro a mais que o Império não precisa: o token da Garantido
    enxerga 2 ad accounts e uma delas está desabilitada (account_status=2)
    — sem filtrar isso, pull_meta_insights ia tentar puxar insights de uma
    conta morta à toa. Não hardcoda o ID da conta ativa; descobre pela
    própria API a cada chamada."""
    contas = graph_get("/me/adaccounts", {"fields": "id,name,account_status"}).get("data", [])
    contas_ativas = [c for c in contas if c.get("account_status") not in STATUS_CONTA_MORTA]
    out = []
    for conta in contas_ativas:
        camps = graph_get(
            f"/{conta['id']}/campaigns",
            {
                "fields": "id,name,status,effective_status",
                "filtering": json.dumps([{"field": "effective_status", "operator": "IN", "value": ["ACTIVE", "PAUSED"]}]),
            },
        ).get("data", [])
        for c in camps:
            c["account_id"], c["account_name"] = conta["id"], conta.get("name", conta["id"])
        out.extend(camps)
    return out


def pull_meta_insights():
    """Spend/ações por dia E por anúncio, pra todas as campanhas
    ativas/pausadas encontradas nas contas ativas. Mesmo padrão do
    Império — ver docstring do módulo pra por que isto é REAL (não mock).
    Por anúncio: insight diário (spend/clicks/actions/action_values) +
    preview real do criativo via /{ad_id}/previews (API feita pra isso —
    embed público de vídeo de anúncio dá "indisponível", preview não)."""
    campanhas = pull_campanhas()
    daily_all, by_ad_all = [], []

    for camp in campanhas:
        cid, cnome = camp["id"], camp.get("name", camp["id"])

        daily = graph_get(
            f"/{cid}/insights",
            {"fields": "spend,impressions,clicks,reach,actions,action_values", "time_increment": 1, "date_preset": "maximum"},
        ).get("data", [])
        for d in daily:
            d["campanha_id"], d["campanha_nome"] = cid, cnome
        daily_all.extend(daily)

        by_ad = graph_get(
            f"/{cid}/ads",
            {"fields": "id,name,status,effective_status,creative{thumbnail_url,image_url,video_id,object_type}"},
        ).get("data", [])
        for ad in by_ad:
            ad["campanha_id"], ad["campanha_nome"] = cid, cnome
            ins = graph_get(
                f"/{ad['id']}/insights",
                {"fields": "spend,impressions,clicks,actions,action_values", "time_increment": 1, "date_preset": "maximum"},
            ).get("data", [])
            ad["insights_diario"] = ins
            creative = ad.get("creative") or {}
            preview = graph_get(f"/{ad['id']}/previews", {"ad_format": "MOBILE_FEED_STANDARD"}).get("data", [])
            creative["preview_html"] = preview[0]["body"] if preview else None
        by_ad_all.extend(by_ad)

    return daily_all, by_ad_all, campanhas


# O dataset do Pixel agrega pressel E plataforma (mesmo PIXEL_ID nos dois —
# confirmado 2026-10-30: garantido-premios-lp usa o mesmo ID de
# META_GARANTIDO_PREMIOS_DATASET_ID). Mesmo problema que o Império já
# resolveu: `aggregation=event` soma os dois domínios junto, o que infla o
# "CTR da pressel" e esconde a forma real de cada funil. Allowlist POSITIVA
# do domínio da plataforma (não negativa da pressel) — se a pressel trocar
# de domínio de novo (já é o padrão deste nicho, viu-se no Império), ela
# simplesmente cai no bucket default sem precisar editar isto de novo.
SITE_SUFIXOS = ("garantidopremios.com",)

EVENTOS_FUNIL_HOST = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Lead", "ClickSorteios"]


def _classificar_origem_host(host):
    h = (host or "").lower().strip()
    return "site" if any(h == suf or h.endswith("." + suf) for suf in SITE_SUFIXOS) else "pressel"


def pull_pixel_funnel_por_host(dias):
    """Mesmo funil de pull_pixel_funnel, quebrado por ORIGEM (pressel ×
    plataforma) — uma chamada por evento, com aggregation=host. Sem isso,
    PageView da pressel (algumas centenas/dia) fica indistinguível do
    PageView da plataforma (milhares/dia), e qualquer taxa de conversão da
    pressel calculada em cima do total combinado é falsa."""
    end = int(datetime.now().timestamp())
    start = int((datetime.now() - timedelta(days=dias)).timestamp())
    linhas = []
    for evento in EVENTOS_FUNIL_HOST:
        periodos = graph_get(
            f"/{PIXEL_ID}/stats",
            {"aggregation": "host", "event": evento, "start_time": start, "end_time": end},
        ).get("data", [])
        for periodo in periodos:
            try:
                dia = datetime.strptime(periodo["start_time"], "%Y-%m-%dT%H:%M:%S%z").astimezone(ZoneInfo(TZ_BRASIL)).date().isoformat()
            except (KeyError, ValueError, TypeError):
                continue
            for item in periodo.get("data", []):
                linhas.append({
                    "dia": dia,
                    "evento": evento,
                    "origem": _classificar_origem_host(item.get("value")),
                    "count": int(item.get("count", 0) or 0),
                })
    return linhas


def montar_pixel_funil_host_diario(linhas_host):
    agg = {}
    for ln in linhas_host:
        chave = (ln["dia"], ln["evento"], ln["origem"])
        agg[chave] = agg.get(chave, 0) + ln["count"]
    return [{"dia": dia, "evento": evento, "origem": origem, "count": count} for (dia, evento, origem), count in agg.items()]


def montar_performance_anuncio(by_ad):
    """ads_diario (1 linha = 1 anúncio × 1 dia, com purchases/purchase_value
    REPORTADOS PELO PRÓPRIO META via actions/action_values) + ads (info +
    criativo pra preview). Isso é auto-atribuição do Meta, não cruzamento
    com pedido real — por isso o ROAS daqui é rotulado 'ROAS Meta' no
    frontend, igual o Império faz, nunca 'ROAS confirmado'."""
    def linha(ad, ins):
        actions = {a["action_type"]: a["value"] for a in ins.get("actions", [])} if ins else {}
        action_values = {a["action_type"]: a["value"] for a in ins.get("action_values", [])} if ins else {}
        return {
            "spend": float(ins.get("spend", 0) or 0),
            "clicks": int(ins.get("clicks", 0) or 0),
            "purchases": int(actions.get("purchase", 0) or 0),
            "purchase_value": float(action_values.get("purchase", 0) or 0),
        }

    ads_diario, ads = [], []
    for ad in by_ad:
        creative = ad.get("creative") or {}
        ads.append({
            "ad_id": ad["id"],
            "nome": ad["name"],
            "campanha_id": ad.get("campanha_id"),
            "criativo": {
                "thumbnail_url": creative.get("thumbnail_url"),
                "image_url": creative.get("image_url"),
                "video_id": creative.get("video_id"),
                "tipo": "video" if creative.get("video_id") else "imagem",
                "preview_html": creative.get("preview_html"),
            },
        })
        for ins in (ad.get("insights_diario") or []):
            ads_diario.append({
                "dia": ins.get("date_start"),
                "ad_id": ad["id"],
                "nome": ad["name"],
                "campanha_id": ad.get("campanha_id"),
                "campanha_nome": ad.get("campanha_nome"),
                **linha(ad, ins),
            })
    return ads_diario, ads


def pull_pixel_funnel(dias):
    """PageView/ViewContent/AddToCart/InitiateCheckout/Purchase por período,
    direto do dataset da Garantido — mesmo tracking nativo que já medimos em
    EMQ 9.0-9.3/10 (2026-10-09). Só leitura, não manda nada."""
    end = int(datetime.now().timestamp())
    start = int((datetime.now() - timedelta(days=dias)).timestamp())
    return graph_get(
        f"/{PIXEL_ID}/stats",
        {"aggregation": "event", "start_time": start, "end_time": end},
    ).get("data", [])


def pull_group_clicks(dias):
    """Cliques no link curto do grupo (apps/link-garantido), tabela
    `short_link_clicks` do Supabase da Garantido. Tabela confirmada existente
    e com dado real em 2026-10-30 — se a consulta falhar mesmo assim (ex.
    credencial revogada), o pipeline não quebra, só marca indisponível."""
    if not GARANTIDO_SUPABASE_URL or not GARANTIDO_SUPABASE_SERVICE_ROLE_KEY:
        return {"disponivel": False, "motivo": "Credenciais do Supabase da Garantido não configuradas.", "total_periodo": 0, "por_dia": []}

    desde = (datetime.now() - timedelta(days=dias)).isoformat()
    headers = {
        "apikey": GARANTIDO_SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {GARANTIDO_SUPABASE_SERVICE_ROLE_KEY}",
    }
    # Paginação obrigatória (achado 2026-10-30, mesmo bug documentado em
    # bi_aggregator.py::montar_lp_eventos_diario do Império): o PostgREST do
    # Supabase trunca em 1000 linhas por request mesmo sem `limit=` explícito
    # — sem isso aqui, uma conta com mais de 1000 cliques no período
    # reportava só os 1000 mais antigos, silenciosamente.
    PAGINA = 1000
    offset = 0
    linhas = []
    try:
        while True:
            url = (
                f"{GARANTIDO_SUPABASE_URL}/rest/v1/short_link_clicks"
                f"?clicked_at=gte.{desde}&select=code,clicked_at&order=clicked_at.asc"
                f"&offset={offset}&limit={PAGINA}"
            )
            resp = requests.get(url, headers=headers, timeout=20)
            if not resp.ok:
                return {
                    "disponivel": False,
                    "motivo": f"Consulta à tabela short_link_clicks falhou (HTTP {resp.status_code}).",
                    "total_periodo": 0,
                    "por_dia": [],
                }
            pagina = resp.json()
            linhas.extend(pagina)
            if len(pagina) < PAGINA:
                break
            offset += PAGINA
    except Exception as e:
        return {"disponivel": False, "motivo": f"Erro de rede consultando Supabase: {e}", "total_periodo": 0, "por_dia": []}

    por_dia = {}
    for row in linhas:
        try:
            dia = datetime.fromisoformat(row["clicked_at"].replace("Z", "+00:00")).astimezone(ZoneInfo(TZ_BRASIL)).date().isoformat()
        except (KeyError, ValueError, TypeError):
            continue
        por_dia[dia] = por_dia.get(dia, 0) + 1

    return {
        "disponivel": True,
        "motivo": None,
        "total_periodo": len(linhas),
        "por_dia": [{"dia": d, "cliques": c} for d, c in sorted(por_dia.items())],
    }


def pull_lp_eventos(dias):
    """Beacon próprio da LP (apps/garantido-premios-lp/api/beacon.js →
    tabela lp_eventos do Supabase da Garantido) — mesmo princípio do
    Império: a API de stats do Pixel não quebra por parâmetro customizado
    (variant), só por evento/host, então sem isto não dá pra comparar
    v1×v2 da LP. Tabela nasceu em 2026-10-30 — se ainda não foi criada
    manualmente no painel (ver apps/garantido-premios-lp/supabase-schema.sql),
    volta marcado indisponível em vez de quebrar o pipeline."""
    if not GARANTIDO_SUPABASE_URL or not GARANTIDO_SUPABASE_SERVICE_ROLE_KEY:
        return {"disponivel": False, "motivo": "Credenciais do Supabase da Garantido não configuradas.", "linhas": []}

    desde = (datetime.now() - timedelta(days=dias)).isoformat()
    headers = {
        "apikey": GARANTIDO_SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {GARANTIDO_SUPABASE_SERVICE_ROLE_KEY}",
    }
    PAGINA = 1000
    offset = 0
    linhas = []
    try:
        while True:
            url = (
                f"{GARANTIDO_SUPABASE_URL}/rest/v1/lp_eventos"
                f"?criado_em=gte.{desde}&select=criado_em,variant,evento&order=criado_em.asc"
                f"&offset={offset}&limit={PAGINA}"
            )
            resp = requests.get(url, headers=headers, timeout=20)
            if not resp.ok:
                return {
                    "disponivel": False,
                    "motivo": f"Tabela lp_eventos ainda não existe ou consulta falhou (HTTP {resp.status_code}) — rodar apps/garantido-premios-lp/supabase-schema.sql no painel Supabase.",
                    "linhas": [],
                }
            pagina = resp.json()
            linhas.extend(pagina)
            if len(pagina) < PAGINA:
                break
            offset += PAGINA
    except Exception as e:
        return {"disponivel": False, "motivo": f"Erro de rede consultando Supabase: {e}", "linhas": []}

    return {"disponivel": True, "motivo": None, "linhas": linhas}


def montar_lp_eventos_diario(lp_eventos):
    """dia × variant × evento, flat — mesmo padrão de montar_pixel_funil_diario."""
    if not lp_eventos["disponivel"]:
        return []
    por_dia = {}
    for row in lp_eventos["linhas"]:
        try:
            dia = datetime.fromisoformat(row["criado_em"].replace("Z", "+00:00")).astimezone(ZoneInfo(TZ_BRASIL)).date().isoformat()
        except (KeyError, ValueError, TypeError):
            continue
        chave = (dia, row.get("variant"), row.get("evento"))
        por_dia[chave] = por_dia.get(chave, 0) + 1
    return [{"dia": dia, "variant": variant, "evento": evento, "count": count} for (dia, variant, evento), count in por_dia.items()]


def pull_pedidos(dias):
    """MOCK EXPLÍCITO — usado só quando pull_pedidos_reais() não acha linha
    nenhuma (tabela ainda não existe, ou existe e está vazia). Não inventa
    número nenhum."""
    return {
        "_mock": True,
        "_motivo": MOTIVO_MOCK_PEDIDOS,
        "faturamento_total": None,
        "pedidos_total": None,
        "roas": None,
        "novo_vs_recorrente": None,
        "canal_atribuicao": None,
        "lucro_estimado": None,
    }


# ===================================================================
# PEDIDO REAL (webhook order.paid, tabela `pedidos`) — 2026-10-30
# ===================================================================

TAXA_PLATAFORMA = 0.05  # confirmado pelo founder igual ao Império (2026-10-30)
FBC_MAX_AGE_DIAS = 7

CAMPOS_PEDIDOS = (
    "order_id,paid_at,order_created_at,total,price,quantity,product_id,product_title,"
    "user_phone,user_cpf,utm_source,utm_campaign,utm_content,gclid,ttclid,"
    "fbc,fbp,affiliate"
)


def pull_pedidos_reais(dias):
    """Lê a tabela `pedidos` (Supabase da Garantido), alimentada pelo
    webhook order.paid (apps/webhook-garantido-pedidos/api/order-paid.js).
    Retorna None se a tabela não existir/consulta falhar — sinal pro
    chamador cair no mock explícito, não um erro fatal. DataFrame vazio se
    a tabela existir mas ainda não tiver pedido nenhum."""
    if not GARANTIDO_SUPABASE_URL or not GARANTIDO_SUPABASE_SERVICE_ROLE_KEY:
        return None
    desde = (datetime.now() - timedelta(days=dias)).isoformat()
    headers = {
        "apikey": GARANTIDO_SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {GARANTIDO_SUPABASE_SERVICE_ROLE_KEY}",
    }
    PAGINA = 1000
    offset = 0
    linhas = []
    try:
        while True:
            url = (
                f"{GARANTIDO_SUPABASE_URL}/rest/v1/pedidos"
                f"?paid_at=gte.{desde}&select={CAMPOS_PEDIDOS}&order=paid_at.asc"
                f"&offset={offset}&limit={PAGINA}"
            )
            resp = requests.get(url, headers=headers, timeout=30)
            if not resp.ok:
                return None
            pagina = resp.json()
            linhas.extend(pagina)
            if len(pagina) < PAGINA:
                break
            offset += PAGINA
    except Exception:
        return None
    return pd.DataFrame(linhas)


def _parse_valor_brl(texto):
    """Mesmo parser de client_api.py::_parse_valor_brl do Império."""
    if not texto:
        return 0.0
    match = re.search(r"([\d\.,]+)", str(texto))
    if not match:
        return 0.0
    num = match.group(1).strip(".").strip(",")
    if not num:
        return 0.0
    num = num.replace(".", "").replace(",", ".") if "," in num else num.replace(".", "")
    try:
        return float(num)
    except ValueError:
        return 0.0


def extrair_valor_premio_do_titulo(titulo):
    """Mesmo parser de client_api.py::_parse_valor_brl_from_title do
    Império, aplicado só ao título — a Garantido não manda um campo
    'awards' do SORTEIO no webhook (só prêmios instantâneos do PEDIDO,
    que é outra coisa, ver docstring do módulo). Sorteio sem 'R$X' no
    título fica com prêmio=0 — tratado como 'sem desconto', nunca R$0."""
    if not titulo:
        return 0.0
    for padrao in [r"(?:VALENDO|VALEND0)\s*R?\$?\s*([\d\.,]+)", r"R\$\s*([\d\.,]+)"]:
        match = re.search(padrao, titulo, re.IGNORECASE)
        if match:
            valor = _parse_valor_brl(match.group(1))
            if valor > 0:
                return valor
    return 0.0


def _fbc_age_days(fbc, reference_dt):
    if not fbc or reference_dt is None or pd.isna(reference_dt):
        return None
    try:
        ts_ms = int(str(fbc).split(".")[2])
        click_dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
        ref = reference_dt.to_pydatetime() if hasattr(reference_dt, "to_pydatetime") else reference_dt
        if ref.tzinfo is None:
            ref = ref.replace(tzinfo=timezone.utc)
        return (ref - click_dt).total_seconds() / 86400
    except (IndexError, ValueError, OSError):
        return None


def classificar_canal(fbc, fbp, gclid, ttclid, utm_source, affiliate, fbc_age_dias=None):
    """Mesma prioridade de client_api.py::_classificar_canal do Império:
    UTM > fbc fresco > gclid/ttclid > afiliado > fbp > direto."""
    fbc_fresco = bool(fbc) and (fbc_age_dias is None or fbc_age_dias <= FBC_MAX_AGE_DIAS)
    if utm_source:
        canal = f"UTM: {utm_source}"
        if fbc_fresco:
            canal += " + fbc confirmado"
        return canal
    if fbc_fresco:
        return "Meta Ads (clique confirmado, sem UTM)"
    if fbc:
        if fbc_age_dias is None:
            faixa = "idade desconhecida"
        elif fbc_age_dias <= 30:
            faixa = "8-30d"
        elif fbc_age_dias <= 90:
            faixa = "31-90d"
        else:
            faixa = ">90d"
        return f"Meta Ads (fbc expirado, {faixa} — não atribuível)"
    if gclid:
        return "Google Ads (clique confirmado)"
    if ttclid:
        return "TikTok Ads (clique confirmado)"
    if affiliate:
        return "Afiliado"
    if fbp:
        return "Meta (pixel, sem clique confirmado)"
    return "Direto/Orgânico/Desconhecido"


def agrupar_canal(canal_atribuicao):
    """Mesma visão grossa de bi_aggregator.py::_agrupar_canal do Império."""
    if canal_atribuicao.startswith("UTM: meta") or canal_atribuicao.startswith("Meta Ads (clique confirmado"):
        return "Meta Ads — confirmado"
    if canal_atribuicao.startswith("Meta Ads (fbc expirado"):
        return "Meta Ads — sinal expirado (não confirmável)"
    if canal_atribuicao.startswith("Meta (pixel"):
        return "Meta — sinal fraco (sem clique)"
    if canal_atribuicao.startswith("UTM:"):
        return "Outra UTM"
    if canal_atribuicao.startswith("Google Ads"):
        return "Google Ads"
    if canal_atribuicao.startswith("TikTok Ads"):
        return "TikTok Ads"
    if canal_atribuicao == "Afiliado":
        return "Afiliado"
    return "Direto/Orgânico/Desconhecido"


def enriquecer_com_utm_touches(df_pedidos):
    """Mesmo princípio de bi_aggregator.py::enriquecer_com_utm_touches do
    Império, adaptado pros nomes de coluna lowercase da tabela `pedidos`
    da Garantido. Achado 2026-11-13 (founder, auditoria ao vivo): a
    plataforma (mesmo white-label do Império) também não grava UTM de
    anúncio no payload real do webhook — confirmado em 132/132 pedidos do
    dia, nenhum com utm_source de Meta, mesmo com a campanha ativa e
    gastando. `apps/utm-capture-garantido` já captura {fbp, utm_*} direto
    no navegador via GTM desde 2026-11-12 — esta função é o lado que
    faltava: ler `utm_touches` (Supabase) e cruzar por `fbp` com o touch
    mais recente, só preenchendo onde `utm_source` ainda está vazio
    (nunca sobrescreve UTM real vinda do webhook, se um dia a plataforma
    passar a mandar). Sem isso, a classificação de canal nunca via
    'UTM: meta' — só 'Meta (pixel, sem clique confirmado)' na melhor das
    hipóteses, mesmo pra clique pago de verdade."""
    df = df_pedidos.copy()
    if not GARANTIDO_SUPABASE_URL or not GARANTIDO_SUPABASE_SERVICE_ROLE_KEY:
        return df
    if "fbp" not in df.columns or df.empty:
        return df

    fbps = sorted({str(v) for v in df["fbp"].tolist() if v})
    if not fbps:
        return df

    touch_por_fbp = {}
    headers = {
        "apikey": GARANTIDO_SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {GARANTIDO_SUPABASE_SERVICE_ROLE_KEY}",
    }
    LOTE = 100  # fbp é string longa (~40 chars) — lote menor pra não estourar URL
    try:
        for i in range(0, len(fbps), LOTE):
            lote = fbps[i : i + LOTE]
            ids_filtro = ",".join(lote)
            url = (
                f"{GARANTIDO_SUPABASE_URL}/rest/v1/utm_touches"
                f"?fbp=in.({ids_filtro})"
                f"&select=fbp,utm_source,utm_medium,utm_campaign,utm_content,utm_term,captured_at"
                f"&order=captured_at.desc"
            )
            resp = requests.get(url, headers=headers, timeout=30)
            if not resp.ok:
                print(f"⚠️ enriquecer_com_utm_touches: falha ao consultar Supabase ({resp.status_code}) — seguindo sem enriquecer este lote.")
                continue
            for row in resp.json():
                # primeira ocorrência de cada fbp = mais recente, por causa do order=captured_at.desc
                touch_por_fbp.setdefault(row["fbp"], row)
    except Exception as e:
        print(f"⚠️ enriquecer_com_utm_touches: erro de rede ({e}) — seguindo sem enriquecer.")
        return df

    if not touch_por_fbp:
        return df

    campos = [("utm_source", "utm_source"), ("utm_campaign", "utm_campaign"), ("utm_content", "utm_content")]
    preenchidos = 0
    for idx, row in df.iterrows():
        ja_tinha = str(row.get("utm_source") or "").strip() != ""
        if ja_tinha:
            continue
        fbp = str(row.get("fbp") or "")
        achado = touch_por_fbp.get(fbp)
        if not achado:
            continue
        for col_df, col_supabase in campos:
            if col_df not in df.columns:
                df[col_df] = None
            valor = achado.get(col_supabase)
            if valor:
                df.at[idx, col_df] = valor
        preenchidos += 1

    print(f"✅ UTM via utm_touches (fbp): {preenchidos} pedido(s) preenchido(s) a partir de {len(touch_por_fbp)} fbp(s) com touch registrado.")
    return df


def preparar_df_pedidos(df_raw):
    """Prepara colunas derivadas (_data_ord, _chave_cliente,
    Primeira_Compra_Na_Janela, Canal_Atribuicao, _lucro_estimado) — mesmo
    princípio do Império, adaptado pros nomes de coluna da tabela `pedidos`.
    Retorna (df_preparado, premio_por_sorteio)."""
    df = df_raw.copy()
    df["_data_ord"] = pd.to_datetime(df["paid_at"], errors="coerce", utc=True)
    df = df.dropna(subset=["_data_ord"]).sort_values("_data_ord").reset_index(drop=True)
    df = enriquecer_com_utm_touches(df)

    def chave(row):
        if row.get("user_phone"):
            return f"tel:{row['user_phone']}"
        if row.get("user_cpf"):
            return f"cpf:{row['user_cpf']}"
        return None
    df["_chave_cliente"] = df.apply(chave, axis=1)

    primeira_compra = {}
    is_primeira = []
    for _, row in df.iterrows():
        k = row["_chave_cliente"]
        if not k:
            is_primeira.append(None)
            continue
        if k not in primeira_compra:
            primeira_compra[k] = row["_data_ord"]
            is_primeira.append(True)
        else:
            is_primeira.append(False)
    df["Primeira_Compra_Na_Janela"] = is_primeira

    def canal(row):
        fbc = row.get("fbc")
        idade = _fbc_age_days(fbc, row["_data_ord"])
        return classificar_canal(fbc, row.get("fbp"), row.get("gclid"), row.get("ttclid"), row.get("utm_source"), row.get("affiliate"), idade)
    df["Canal_Atribuicao"] = df.apply(canal, axis=1)

    titulos_por_produto = df.drop_duplicates("product_id").set_index("product_id")["product_title"].to_dict()
    premio_por_sorteio = {pid: extrair_valor_premio_do_titulo(titulo) for pid, titulo in titulos_por_produto.items()}

    fat_por_sorteio = df.groupby("product_id")["total"].sum().to_dict()
    margem_por_sorteio = {}
    for pid, fat in fat_por_sorteio.items():
        premio = premio_por_sorteio.get(pid, 0.0)
        margem_por_sorteio[pid] = max(0.0, 1 - (premio / fat)) if (fat > 0 and premio > 0) else 1.0
    df["_lucro_estimado"] = df.apply(lambda r: r["total"] * margem_por_sorteio.get(r["product_id"], 1.0), axis=1)

    return df, premio_por_sorteio


def montar_diario_pedidos(df, daily_insights):
    """dia × componentes brutos (faturamento/lucro/meta_ads/novo/
    recorrente/gasto) — mesmo contrato de bi_aggregator.py::montar_diario
    do Império, pro frontend recalcular ROAS/CAC/margem sem round-trip.
    Dia aqui é meia-noite a meia-noite (Brasília) — não existe "dia de
    negócio" (corte 21h30) documentado pra Garantido, não inventar."""
    d = df.copy()
    d["_dia"] = d["_data_ord"].dt.tz_convert(TZ_BRASIL).dt.date.astype(str)
    meta_mask = (
        d["Canal_Atribuicao"].str.startswith("UTM: meta", na=False)
        | d["Canal_Atribuicao"].str.startswith("Meta Ads (clique confirmado", na=False)
    )
    novo_mask = meta_mask & (d["Primeira_Compra_Na_Janela"] == True)  # noqa: E712
    rec_mask = meta_mask & (d["Primeira_Compra_Na_Janela"] == False)  # noqa: E712

    g = d.groupby("_dia").agg(pedidos=("total", "count"), faturamento=("total", "sum"), lucro_estimado=("_lucro_estimado", "sum"))
    g_meta = d[meta_mask].groupby("_dia").agg(meta_pedidos=("total", "count"), meta_valor=("total", "sum"))
    g_novo = d[novo_mask].groupby("_dia").agg(novo_pedidos=("total", "count"), novo_valor=("total", "sum"))
    g_rec = d[rec_mask].groupby("_dia").agg(rec_pedidos=("total", "count"), rec_valor=("total", "sum"))

    gasto_por_dia = {}
    for di in daily_insights:
        chave = di.get("date_start")
        gasto_por_dia[chave] = gasto_por_dia.get(chave, 0.0) + float(di.get("spend", 0) or 0)

    out = []
    for dia, row in g.iterrows():
        mrow = g_meta.loc[dia] if dia in g_meta.index else None
        nrow = g_novo.loc[dia] if dia in g_novo.index else None
        rrow = g_rec.loc[dia] if dia in g_rec.index else None
        out.append({
            "dia": dia,
            "pedidos": int(row["pedidos"]),
            "faturamento": round(float(row["faturamento"]), 2),
            "lucro_estimado": round(float(row["lucro_estimado"]), 2),
            "meta_ads_pedidos": int(mrow["meta_pedidos"]) if mrow is not None else 0,
            "meta_ads_valor": round(float(mrow["meta_valor"]), 2) if mrow is not None else 0.0,
            "meta_ads_novo_pedidos": int(nrow["novo_pedidos"]) if nrow is not None else 0,
            "meta_ads_novo_valor": round(float(nrow["novo_valor"]), 2) if nrow is not None else 0.0,
            "meta_ads_recorrente_pedidos": int(rrow["rec_pedidos"]) if rrow is not None else 0,
            "meta_ads_recorrente_valor": round(float(rrow["rec_valor"]), 2) if rrow is not None else 0.0,
            "gasto_campanha": round(gasto_por_dia.get(dia, 0.0), 2),
        })
    return sorted(out, key=lambda x: x["dia"])


def _totais_por_sorteio(df, premio_por_sorteio):
    """1 linha por sorteio com os TOTAIS (não a fatia de 1 dia) — inclui
    margem de contribuição DO SORTEIO (lucro bruto - taxa plataforma), que
    é aritmética direta e NÃO depende da % de margem de contribuição da
    campanha (essa sim pendente, ver nota_margem_pendente)."""
    g = df.groupby("product_id").agg(pedidos=("total", "count"), faturamento=("total", "sum"), primeiro_pedido=("_data_ord", "min"))
    out = {}
    for pid, row in g.iterrows():
        faturamento = float(row["faturamento"])
        premio = float(premio_por_sorteio.get(pid, 0.0))
        lucro_bruto = faturamento - premio
        taxa = faturamento * TAXA_PLATAFORMA
        out[pid] = {
            "faturamento_total_sorteio": round(faturamento, 2),
            "pedidos_total_sorteio": int(row["pedidos"]),
            "lucro_bruto_total": round(lucro_bruto, 2),
            "taxa_plataforma_total": round(taxa, 2),
            "margem_contribuicao_total": round(lucro_bruto - taxa, 2),
            "criado_em": row["primeiro_pedido"].isoformat(),
        }
    return out


def montar_sorteios_por_dia(df, premio_por_sorteio):
    """dia -> lista de sorteios com pedido naquele dia — alimenta o clique
    de expansão da barra diária na Executiva. SEM baixa manual (não
    detectável só com o webhook — ver docstring do módulo)."""
    titulos = df.drop_duplicates("product_id").set_index("product_id")["product_title"].to_dict()
    totais = _totais_por_sorteio(df, premio_por_sorteio)
    d = df.copy()
    d["_dia"] = d["_data_ord"].dt.tz_convert(TZ_BRASIL).dt.date.astype(str)
    g = d.groupby(["_dia", "product_id"]).agg(pedidos=("total", "count"), faturamento=("total", "sum"), lucro_estimado=("_lucro_estimado", "sum"))

    out = {}
    for (dia, pid), row in g.iterrows():
        premio = premio_por_sorteio.get(pid, 0.0)
        tot = totais.get(pid, {})
        out.setdefault(dia, []).append({
            "product_id": pid,
            "titulo": titulos.get(pid, pid),
            "pedidos": int(row["pedidos"]),
            "faturamento": round(float(row["faturamento"]), 2),
            "lucro_estimado": round(float(row["lucro_estimado"]), 2),
            "valor_premio": round(float(premio), 2) if premio > 0 else None,
            "faturamento_total_sorteio": tot.get("faturamento_total_sorteio"),
            "pedidos_total_sorteio": tot.get("pedidos_total_sorteio"),
            "lucro_bruto_total": tot.get("lucro_bruto_total"),
            "taxa_plataforma_total": tot.get("taxa_plataforma_total"),
            "margem_contribuicao_total": tot.get("margem_contribuicao_total"),
            "criado_em": tot.get("criado_em", ""),
        })
    for dia in out:
        out[dia] = sorted(out[dia], key=lambda x: x["criado_em"] or "")
    return out


# Faixas de PRÊMIO calibradas na distribuição REAL da Garantido (2026-11-06:
# prêmios observados de R$150 a R$2.000) — NÃO são as faixas do Império
# (R$1k/R$5k, do brief.yaml dele), que nunca popularia nada aqui: o maior
# prêmio visto até agora na Garantido é R$2.000, abaixo até do piso
# "Jackpot" do Império. Escala de negócio diferente, faixas diferentes.
PORTES_GARANTIDO = [
    (300, "Pequeno (até R$300)"),
    (800, "Médio (R$300 a R$800)"),
    (float("inf"), "Grande (acima de R$800)"),
]

# Faixas de PREÇO POR NÚMERO, calibradas na distribuição real (price: R$3 a
# R$25, mediana R$7,50) — mesma lógica de "faixa de negócio real", não as
# 6 faixas R$5-R$80+ do Império (fora de escala aqui).
FAIXAS_PRECO_GARANTIDO = [
    (5, "até R$5"), (8, "R$5-8"), (12, "R$8-12"), (float("inf"), "acima de R$12"),
]


def _porte_premio_garantido(premio):
    if not premio or premio <= 0:
        return "Sem prêmio identificável"
    for teto, label in PORTES_GARANTIDO:
        if premio <= teto:
            return label
    return PORTES_GARANTIDO[-1][1]


def _faixa_preco_garantido(preco):
    if preco is None or preco <= 0:
        return "—"
    for teto, label in FAIXAS_PRECO_GARANTIDO:
        if preco <= teto:
            return label
    return FAIXAS_PRECO_GARANTIDO[-1][1]


def extrair_qtd_premios_do_titulo(titulo):
    """'...EM 3 PRÊMIOS!!!' -> 3. Confirmado 100% de match nos 24 títulos
    reais vistos em 2026-11-06 — diferente do valor do prêmio (que falha
    quando o título não tem 'R$'), este padrão está em todo título
    observado até agora. Ainda assim retorna None sem match (não inventa
    1 como default)."""
    if not titulo:
        return None
    m = re.search(r"EM\s*(\d+)\s*PR[ÊE]MIOS", titulo, re.IGNORECASE)
    return int(m.group(1)) if m else None


def _mascarar_telefone(tel):
    """'(42) 99999-9161' -> '(42) 9****-9161' — preserva DDD e os 4 últimos
    dígitos (o suficiente pro founder reconhecer o cliente no próprio
    histórico), mascara o miolo."""
    if not tel:
        return None
    digitos = re.sub(r"\D", "", str(tel))
    if len(digitos) < 8:
        return str(tel)
    ddd, resto = digitos[:2], digitos[2:]
    return f"({ddd}) {resto[0]}****-{resto[-4:]}"


def montar_lista_sorteios(df, premio_por_sorteio):
    """1 linha por sorteio (produto_id) — base da aba Produto simplificada.
    'ultimo_pedido' é só o pedido mais recente OBSERVADO naquele sorteio,
    não confirmação de que esgotou (a Garantido não expõe esse sinal via
    webhook, só API admin que não temos — ver docstring do módulo). Por
    isso o rótulo no frontend é 'janela de vendas', nunca 'tempo até
    esgotar'."""
    titulos = df.drop_duplicates("product_id").set_index("product_id")["product_title"].to_dict()
    g = df.groupby("product_id").agg(
        pedidos=("total", "count"), faturamento=("total", "sum"),
        preco_numero=("price", "median"),
        primeiro_pedido=("_data_ord", "min"), ultimo_pedido=("_data_ord", "max"),
    )
    out = []
    for pid, row in g.iterrows():
        faturamento = float(row["faturamento"])
        premio = float(premio_por_sorteio.get(pid, 0.0))
        lucro_bruto = faturamento - premio
        taxa = faturamento * TAXA_PLATAFORMA
        titulo = titulos.get(pid, pid)
        out.append({
            "product_id": pid,
            "titulo": titulo.strip() if isinstance(titulo, str) else titulo,
            "porte": _porte_premio_garantido(premio),
            "premios_qtd": extrair_qtd_premios_do_titulo(titulo),
            "preco_numero": round(float(row["preco_numero"]), 2) if row["preco_numero"] == row["preco_numero"] else None,
            "premio": round(premio, 2) if premio > 0 else None,
            "faturamento": round(faturamento, 2),
            "pedidos": int(row["pedidos"]),
            "lucro_bruto": round(lucro_bruto, 2),
            "taxa_plataforma": round(taxa, 2),
            "margem_contribuicao": round(lucro_bruto - taxa, 2),
            "margem_pct": round(100 * (lucro_bruto - taxa) / faturamento, 1) if faturamento else None,
            "primeiro_pedido": row["primeiro_pedido"].isoformat(),
            "ultimo_pedido": row["ultimo_pedido"].isoformat(),
            "dia": row["primeiro_pedido"].tz_convert(TZ_BRASIL).date().isoformat(),
        })
    return sorted(out, key=lambda x: x["margem_contribuicao"], reverse=True)


def montar_pedidos_hora(df):
    """dia × hora (Brasília) × pedidos/faturamento — mesmo formato do
    Império (pedidos_hora), pro front filtrar por período com o mesmo
    componente de data já compartilhado."""
    d = df.copy()
    d["_dia"] = d["_data_ord"].dt.tz_convert(TZ_BRASIL).dt.date.astype(str)
    d["_hora"] = d["_data_ord"].dt.tz_convert(TZ_BRASIL).dt.hour
    g = d.groupby(["_dia", "_hora"]).agg(
        pedidos=("total", "count"), faturamento=("total", "sum"), lucro_estimado=("_lucro_estimado", "sum"),
    ).reset_index()
    return [
        {
            "dia": r["_dia"], "hora": int(r["_hora"]), "pedidos": int(r["pedidos"]),
            "faturamento": round(float(r["faturamento"]), 2), "lucro_estimado": round(float(r["lucro_estimado"]), 2),
        }
        for _, r in g.iterrows()
    ]


def montar_perfil_pedido(df):
    """Perfil do pedido: nº de números comprados (quantity) e faixa de
    valor do pedido (total) — dia-indexado como o resto, pro filtro de
    período reaproveitar o mesmo componente."""
    d = df.copy()
    d["_dia"] = d["_data_ord"].dt.tz_convert(TZ_BRASIL).dt.date.astype(str)

    por_qtd = d.groupby(["_dia", "quantity"]).size().reset_index(name="pedidos")
    por_quantidade = [
        {"dia": r["_dia"], "quantidade": int(r["quantity"]) if r["quantity"] == r["quantity"] else None, "pedidos": int(r["pedidos"])}
        for _, r in por_qtd.iterrows()
    ]

    faixas_valor = [(10, "até R$10"), (20, "R$10-20"), (40, "R$20-40"), (float("inf"), "acima de R$40")]

    def faixa(v):
        for teto, label in faixas_valor:
            if v <= teto:
                return label
        return faixas_valor[-1][1]
    d["_faixa_valor"] = d["total"].apply(faixa)
    por_fv = d.groupby(["_dia", "_faixa_valor"]).agg(pedidos=("total", "count"), valor=("total", "sum")).reset_index()
    por_faixa_valor = [
        {"dia": r["_dia"], "faixa": r["_faixa_valor"], "pedidos": int(r["pedidos"]), "valor": round(float(r["valor"]), 2)}
        for _, r in por_fv.iterrows()
    ]
    return {"por_quantidade": por_quantidade, "por_faixa_valor": por_faixa_valor}


def montar_concentracao_compradores(df, top_n=15):
    """Quanto da receita do período depende de poucos compradores — versão
    direta (sem curva de Lorenz/Gini) pro cliente menos sofisticado: um
    número só (% da receita nos top N compradores) + lista nomeada. Usa
    _chave_cliente (tel/cpf) já calculado em preparar_df_pedidos."""
    d = df[df["_chave_cliente"].notna()].copy()
    if d.empty:
        return {"disponivel": False, "pct_receita_top_n": None, "top_n": top_n, "compradores": [], "receita_total": 0.0}

    g = d.groupby("_chave_cliente").agg(
        pedidos=("total", "count"), valor=("total", "sum"), telefone=("user_phone", "first"),
    ).sort_values("valor", ascending=False)

    receita_total = float(d["total"].sum())
    top = g.head(top_n)
    receita_top = float(top["valor"].sum())

    compradores = [
        {"telefone_mascarado": _mascarar_telefone(row["telefone"]), "pedidos": int(row["pedidos"]), "valor": round(float(row["valor"]), 2)}
        for _, row in top.iterrows()
    ]
    return {
        "disponivel": True,
        "pct_receita_top_n": round(100 * receita_top / receita_total, 1) if receita_total else None,
        "top_n": top_n,
        "receita_total": round(receita_total, 2),
        "compradores_distintos": int(d["_chave_cliente"].nunique()),
        "compradores": compradores,
    }


def montar_canal_diario(df):
    d = df.copy()
    d["_dia"] = d["_data_ord"].dt.tz_convert(TZ_BRASIL).dt.date.astype(str)
    d["_canal_grupo"] = d["Canal_Atribuicao"].apply(agrupar_canal)
    g = d.groupby(["_dia", "_canal_grupo", "Canal_Atribuicao"]).agg(pedidos=("total", "count"), valor=("total", "sum")).reset_index()
    return [
        {"dia": r["_dia"], "canal_grupo": r["_canal_grupo"], "canal_detalhe": r["Canal_Atribuicao"], "pedidos": int(r["pedidos"]), "valor": round(float(r["valor"]), 2)}
        for _, r in g.iterrows()
    ]


def montar_utm_diario(df):
    """dia × utm_source × utm_campaign — só pedidos com UTM preenchida.
    É essa função que responde diretamente o pedido original: faturamento
    por link/grupo do WhatsApp (utm_source='whatsapp')."""
    d = df[df["utm_source"].fillna("") != ""].copy()
    if d.empty:
        return []
    d["_dia"] = d["_data_ord"].dt.tz_convert(TZ_BRASIL).dt.date.astype(str)
    d["_utm_campaign"] = d["utm_campaign"].fillna("(sem campanha)").replace("", "(sem campanha)")
    g = d.groupby(["_dia", "utm_source", "_utm_campaign"]).agg(pedidos=("total", "count"), valor=("total", "sum")).reset_index()
    return [
        {"dia": r["_dia"], "utm_source": r["utm_source"], "utm_campaign": r["_utm_campaign"], "pedidos": int(r["pedidos"]), "valor": round(float(r["valor"]), 2)}
        for _, r in g.iterrows()
    ]


def montar_utm_criativo_diario(df):
    """dia × utm_campaign × utm_content, só utm_source='meta' — granularidade
    de criativo (utm_content = {{ad.id}}, mesma convenção do Império)."""
    d = df[(df["utm_source"].fillna("").str.lower() == "meta") & (df["utm_content"].fillna("") != "")].copy()
    if d.empty:
        return []
    d["_dia"] = d["_data_ord"].dt.tz_convert(TZ_BRASIL).dt.date.astype(str)
    d["_utm_campaign"] = d["utm_campaign"].fillna("(sem campanha)").replace("", "(sem campanha)")
    g = d.groupby(["_dia", "_utm_campaign", "utm_content"]).agg(pedidos=("total", "count"), valor=("total", "sum")).reset_index()
    return [
        {"dia": r["_dia"], "utm_campaign": r["_utm_campaign"], "utm_content": r["utm_content"], "pedidos": int(r["pedidos"]), "valor": round(float(r["valor"]), 2)}
        for _, r in g.iterrows()
    ]


def calcular_kpis_financeiros(df, daily_insights, dias, campanha_inicio):
    """KPIs financeiros — subconjunto do que o Império tem, SEM os que
    dependem de margem_contribuicao_pct (ainda pendente pra Garantido, ver
    docstring do módulo): sem 'Margem de contribuição da campanha' nem CAC
    máximo por cenário de %ML. ROAS/CAC/ticket médio/LTV:CAC/payback não
    dependem dessa % — ficam completos."""
    campanha_inicio_ts = pd.Timestamp(campanha_inicio, tz="UTC") if campanha_inicio else df["_data_ord"].min()

    meta_mask = (
        df["Canal_Atribuicao"].str.startswith("UTM: meta", na=False)
        | df["Canal_Atribuicao"].str.startswith("Meta Ads (clique confirmado", na=False)
    )
    meta_ads_df_full = df[meta_mask]
    meta_ads_df = meta_ads_df_full[meta_ads_df_full["_data_ord"] >= campanha_inicio_ts]
    novo_df = meta_ads_df[meta_ads_df["Primeira_Compra_Na_Janela"] == True]  # noqa: E712

    gasto_campanha = sum(float(d.get("spend", 0) or 0) for d in daily_insights)
    periodo_df = df[df["_data_ord"] >= campanha_inicio_ts]
    faturamento_periodo = float(periodo_df["total"].sum())
    valor_meta_ads = float(meta_ads_df["total"].sum())

    n_novo = len(novo_df)
    valor_novo = float(novo_df["total"].sum())
    cac_novo = (gasto_campanha / n_novo) if n_novo > 0 else None
    ticket_medio_novo = (valor_novo / n_novo) if n_novo > 0 else None

    cohort_chaves = set(novo_df["_chave_cliente"].dropna())
    if cohort_chaves:
        cohort_pedidos = df[df["_chave_cliente"].isin(cohort_chaves)]
        valor_total_cohort = float(cohort_pedidos["total"].sum())
        ltv_proxy_valor = round(valor_total_cohort / len(cohort_chaves), 2)
    else:
        valor_total_cohort = 0.0
        ltv_proxy_valor = 0.0

    lucro_negocio_periodo = float(periodo_df["_lucro_estimado"].sum())
    taxa_plataforma_periodo = round(faturamento_periodo * TAXA_PLATAFORMA, 2)
    lucro_negocio_periodo_apos_taxa = round(lucro_negocio_periodo - taxa_plataforma_periodo, 2)

    return {
        "gasto_campanha_periodo": round(gasto_campanha, 2),
        "faturamento_total_periodo": round(faturamento_periodo, 2),
        "valor_atribuido_meta_ads_periodo": round(valor_meta_ads, 2),
        "lucro_negocio_periodo": round(lucro_negocio_periodo, 2),
        "taxa_plataforma_pct": TAXA_PLATAFORMA,
        "taxa_plataforma_periodo": taxa_plataforma_periodo,
        "lucro_negocio_periodo_apos_taxa": lucro_negocio_periodo_apos_taxa,
        "cac_novo_cliente": round(cac_novo, 2) if cac_novo is not None else None,
        "ticket_medio_novo_cliente": round(ticket_medio_novo, 2) if ticket_medio_novo is not None else None,
        "roas_atribuido": round(valor_meta_ads / gasto_campanha, 2) if gasto_campanha > 0 else None,
        "roas_blended": round(faturamento_periodo / gasto_campanha, 2) if gasto_campanha > 0 else None,
        "payback_em_sorteios": round(cac_novo / ticket_medio_novo, 2) if (cac_novo is not None and ticket_medio_novo not in (None, 0)) else None,
        "ltv_proxy": {
            "valor": ltv_proxy_valor,
            "cohort_tamanho": len(cohort_chaves),
            "janela_dias": dias,
            "nota": f"Proxy limitado à janela de {dias} dias — não é LTV real. Aumentar --dias aproxima do real.",
        },
        "ltv_cac_ratio": round(ltv_proxy_valor / cac_novo, 2) if (cac_novo not in (None, 0) and ltv_proxy_valor > 0) else None,
        "margem_contribuicao_pct": None,
        "margem_contribuicao_campanha": None,
        "nota_margem_pendente": (
            "Ainda sem % de margem de contribuição própria da Garantido — "
            "o founder confirmou 2026-10-30 que isso só dá pra calcular "
            "depois de acumular histórico de pedidos (combinação real de "
            "preço×prêmio×volume ao longo do tempo). NÃO é a mesma % do "
            "Império (negócio diferente) — até termos a nossa, este card e "
            "o CAC máximo por cenário de %ML ficam de fora. A margem de "
            "contribuição POR SORTEIO (ver drill-down por dia) já é real: "
            "é só faturamento - prêmio - taxa de 5%, sem depender dessa %."
        ),
    }


def montar_pixel_funil_diario(pixel_funnel):
    """Mesma lógica do Império — vira flat dia×evento."""
    por_dia = {}
    for periodo in pixel_funnel:
        try:
            dia = datetime.strptime(periodo["start_time"], "%Y-%m-%dT%H:%M:%S%z").astimezone(ZoneInfo(TZ_BRASIL)).date().isoformat()
        except (KeyError, ValueError, TypeError):
            continue
        for ev in periodo.get("data", []):
            chave = (dia, ev.get("value"))
            por_dia[chave] = por_dia.get(chave, 0) + int(ev.get("count", 0) or 0)
    return [{"dia": dia, "evento": evento, "count": count} for (dia, evento), count in por_dia.items()]


def montar_diario_insights(daily_insights):
    """dia -> gasto/impressões/cliques somados entre todas as campanhas
    ativas/pausadas (mesmo princípio do Império: nunca travar em 1
    campanha)."""
    por_dia = {}
    for d in daily_insights:
        dia = d.get("date_start")
        if not dia:
            continue
        acc = por_dia.setdefault(dia, {"dia": dia, "gasto": 0.0, "impressoes": 0, "cliques": 0})
        acc["gasto"] += float(d.get("spend", 0) or 0)
        acc["impressoes"] += int(d.get("impressions", 0) or 0)
        acc["cliques"] += int(d.get("clicks", 0) or 0)
    for v in por_dia.values():
        v["gasto"] = round(v["gasto"], 2)
    return sorted(por_dia.values(), key=lambda x: x["dia"])


def montar_campanha_totais(daily_insights):
    """Gasto/impressões/cliques total por campanha no período puxado — base
    da tabela de campanhas da página Operacional (equivalente simplificado
    da tabela Ads Manager do Império, sem a coluna de pedidos/ROAS porque
    pedido ainda é mock)."""
    por_campanha = {}
    for d in daily_insights:
        cid = d.get("campanha_id")
        if not cid:
            continue
        acc = por_campanha.setdefault(cid, {"id": cid, "nome": d.get("campanha_nome", cid), "gasto": 0.0, "impressoes": 0, "cliques": 0})
        acc["gasto"] += float(d.get("spend", 0) or 0)
        acc["impressoes"] += int(d.get("impressions", 0) or 0)
        acc["cliques"] += int(d.get("clicks", 0) or 0)
    for v in por_campanha.values():
        v["gasto"] = round(v["gasto"], 2)
        v["ctr"] = round((v["cliques"] / v["impressoes"]) * 100, 2) if v["impressoes"] else None
    return sorted(por_campanha.values(), key=lambda x: x["gasto"], reverse=True)


def montar_qualidade(pixel_funil_diario, grupo_whatsapp_cliques):
    """Diagnóstico de tracking — mais enxuto que o do Império porque não
    existe pedido real pra cruzar com UTM/fbc ainda (essas seções do
    Império dependem 100% de client_api.py, que a Garantido não tem). O que
    dá pra provar hoje: o funil do pixel nativo está saudável (conversão
    estágio a estágio) e o canal do link do grupo está instrumentado."""
    soma_por_evento = {}
    for r in pixel_funil_diario:
        soma_por_evento[r["evento"]] = soma_por_evento.get(r["evento"], 0) + r["count"]

    ordem_funil = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]
    etapas = [{"evento": ev, "count": soma_por_evento.get(ev, 0)} for ev in ordem_funil if ev in soma_por_evento]
    for i, etapa in enumerate(etapas):
        etapa["pct_da_primeira"] = round((etapa["count"] / etapas[0]["count"]) * 100, 1) if i > 0 and etapas[0]["count"] else None

    pendencias = [
        {
            "item": "Pedidos reais (faturamento, ROAS, lucro, novo×recorrente)",
            "status": "pendente",
            "data": None,
            "nota": MOTIVO_MOCK_PEDIDOS,
        },
        {
            "item": "EMQ (Event Match Quality)",
            "status": "em_validacao",
            "data": "2026-10-09",
            "nota": EMQ_NOTA,
        },
        {
            "item": "Cliques no link do grupo de WhatsApp",
            "status": "ok" if grupo_whatsapp_cliques.get("disponivel") else "pendente",
            "data": "2026-10-30" if grupo_whatsapp_cliques.get("disponivel") else None,
            "nota": "Tabela short_link_clicks confirmada e recebendo dado real." if grupo_whatsapp_cliques.get("disponivel") else grupo_whatsapp_cliques.get("motivo"),
        },
        {
            "item": "Webhook/CAPI próprio (tempo real)",
            "status": "nao_aplicavel",
            "data": None,
            "nota": "Decisão deliberada: o tracking nativo da Garantido já mede EMQ 9.0-9.3/10 — não há gap que justifique construir um 2º pixel/CAPI como foi feito pro Império.",
        },
    ]

    return {
        "funil_etapas": etapas,
        "pendencias": pendencias,
    }


def montar_snapshot(dias):
    daily_insights, by_ad, campanhas = pull_meta_insights()
    pixel_funnel = pull_pixel_funnel(dias)
    pixel_funil_diario = montar_pixel_funil_diario(pixel_funnel)
    pixel_funil_host_diario = montar_pixel_funil_host_diario(pull_pixel_funnel_por_host(dias))
    ads_diario, ads = montar_performance_anuncio(by_ad)
    lp_eventos_diario = montar_lp_eventos_diario(pull_lp_eventos(dias))
    group_clicks = pull_group_clicks(dias)
    diario = montar_diario_insights(daily_insights)
    campanha_totais = montar_campanha_totais(daily_insights)

    # Pedido real via webhook (tabela `pedidos`) — fallback automático pro
    # mock explícito se a tabela ainda não existir/estiver vazia. Ver
    # docstring do módulo pra escopo exato (o que dá e o que não dá pra
    # calcular só com o webhook).
    pedidos_raw = pull_pedidos_reais(dias)
    tem_pedido_real = pedidos_raw is not None and not pedidos_raw.empty
    if tem_pedido_real:
        df_pedidos, premio_por_sorteio = preparar_df_pedidos(pedidos_raw)
        diario_pedidos = montar_diario_pedidos(df_pedidos, daily_insights)
        sorteios_por_dia = montar_sorteios_por_dia(df_pedidos, premio_por_sorteio)
        canal_diario = montar_canal_diario(df_pedidos)
        utm_diario = montar_utm_diario(df_pedidos)
        utm_criativo_diario = montar_utm_criativo_diario(df_pedidos)
        dias_com_spend = [d["dia"] for d in diario]
        campanha_inicio = min(dias_com_spend) if dias_com_spend else (diario_pedidos[0]["dia"] if diario_pedidos else None)
        kpis_financeiros = calcular_kpis_financeiros(df_pedidos, daily_insights, dias, campanha_inicio)
        pedidos = {"_mock": False}
        produto_sorteios = montar_lista_sorteios(df_pedidos, premio_por_sorteio)
        produto_pedidos_hora = montar_pedidos_hora(df_pedidos)
        produto_perfil_pedido = montar_perfil_pedido(df_pedidos)
        produto_concentracao = montar_concentracao_compradores(df_pedidos)
    else:
        diario_pedidos, sorteios_por_dia, canal_diario, utm_diario, utm_criativo_diario = [], {}, [], [], []
        kpis_financeiros, campanha_inicio = None, None
        pedidos = pull_pedidos(dias)
        produto_sorteios, produto_pedidos_hora = [], []
        produto_perfil_pedido = {"por_quantidade": [], "por_faixa_valor": []}
        produto_concentracao = {"disponivel": False, "pct_receita_top_n": None, "top_n": 15, "compradores": [], "receita_total": 0.0}

    totais = {
        "gasto": round(sum(d["gasto"] for d in diario), 2),
        "impressoes": sum(d["impressoes"] for d in diario),
        "cliques": sum(d["cliques"] for d in diario),
    }
    totais["ctr"] = round((totais["cliques"] / totais["impressoes"]) * 100, 2) if totais["impressoes"] else None

    return {
        "atualizado_em": datetime.now(ZoneInfo(TZ_BRASIL)).isoformat(),
        "periodo_dias": dias,
        "cliente": "garantido-premios",
        "conta_anuncio_ativa": "act_28685818161087189",
        "meta_ads": {
            "_mock": False,
            "campanhas": [{"id": c["id"], "nome": c.get("name", c["id"]), "status": c.get("effective_status")} for c in campanhas],
            "campanha_totais": campanha_totais,
            "diario": diario,
            "totais": totais,
            "total_anuncios": len(by_ad),
            "ads": ads,
            "ads_diario": ads_diario,
        },
        "pixel_funil_diario": {"_mock": False, "dados": pixel_funil_diario},
        "pixel_funil_host_diario": {"_mock": False, "dados": pixel_funil_host_diario},
        "lp_eventos_diario": lp_eventos_diario,
        "grupo_whatsapp_cliques": group_clicks,
        "pedidos_reais": pedidos,
        "campanha_inicio": campanha_inicio,
        "diario_pedidos": diario_pedidos,
        "sorteios_por_dia": sorteios_por_dia,
        "canal_diario": canal_diario,
        "utm_diario": utm_diario,
        "utm_criativo_diario": utm_criativo_diario,
        "kpis_financeiros": kpis_financeiros,
        "qualidade": montar_qualidade(pixel_funil_diario, group_clicks),
        "produto_sorteios": produto_sorteios,
        "produto_pedidos_hora": produto_pedidos_hora,
        "produto_perfil_pedido": produto_perfil_pedido,
        "produto_concentracao": produto_concentracao,
        "produto_parametros": {
            "taxa_plataforma_pct": TAXA_PLATAFORMA,
            "portes": [label for _, label in PORTES_GARANTIDO],
            "faixas_preco": [label for _, label in FAIXAS_PRECO_GARANTIDO],
        },
    }


def dividir_por_pagina(snapshot):
    """Mesmo princípio do Império (bi_aggregator.py::dividir_por_pagina):
    cada página do BI lê só o JSON que usa, não um data.json monolítico."""
    base = {
        "atualizado_em": snapshot["atualizado_em"],
        "periodo_dias": snapshot["periodo_dias"],
        "conta_anuncio_ativa": snapshot["conta_anuncio_ativa"],
    }

    executiva = {
        **base,
        "meta_ads": snapshot["meta_ads"],
        "pedidos_reais": snapshot["pedidos_reais"],
        "campanha_inicio": snapshot["campanha_inicio"],
        "diario_pedidos": snapshot["diario_pedidos"],
        "sorteios_por_dia": snapshot["sorteios_por_dia"],
        "kpis_financeiros": snapshot["kpis_financeiros"],
    }

    operacional = {
        **base,
        "meta_ads": snapshot["meta_ads"],
        "pixel_funil_diario": snapshot["pixel_funil_diario"],
        "pixel_funil_host_diario": snapshot["pixel_funil_host_diario"],
        "lp_eventos_diario": snapshot["lp_eventos_diario"],
        "grupo_whatsapp_cliques": snapshot["grupo_whatsapp_cliques"],
        "pedidos_reais": snapshot["pedidos_reais"],
        "canal_diario": snapshot["canal_diario"],
        "utm_diario": snapshot["utm_diario"],
        "utm_criativo_diario": snapshot["utm_criativo_diario"],
    }

    produto = {
        **base,
        "pedidos_reais": snapshot["pedidos_reais"],
        "sorteios": snapshot["produto_sorteios"],
        "pedidos_hora": snapshot["produto_pedidos_hora"],
        "pedidos_perfil": snapshot["produto_perfil_pedido"],
        "concentracao_compradores": snapshot["produto_concentracao"],
        "produto_parametros": snapshot["produto_parametros"],
    }

    qualidade = {
        **base,
        "pixel_funil_diario": snapshot["pixel_funil_diario"],
        "grupo_whatsapp_cliques": snapshot["grupo_whatsapp_cliques"],
        **snapshot["qualidade"],
    }

    return {
        "executiva": executiva,
        "operacional": operacional,
        "produto": produto,
        "qualidade": qualidade,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dias", type=int, default=30)
    parser.add_argument("--out-dir", default=OUT_DIR)
    args = parser.parse_args()

    if not TOKEN or not PIXEL_ID:
        print("❌ META_GARANTIDO_PREMIOS_ACCESS_TOKEN/DATASET_ID não configurados no .env")
        sys.exit(1)

    snapshot = montar_snapshot(args.dias)
    paginas = dividir_por_pagina(snapshot)

    out_dir = os.path.abspath(args.out_dir)
    os.makedirs(out_dir, exist_ok=True)
    for nome, dados in paginas.items():
        caminho = os.path.join(out_dir, f"data-{nome}.json")
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)
        publicar_bi_storage(f"data-{nome}.json", dados)

    print(f"✅ 4 arquivos data-*.json gravados em {out_dir} e publicados no Supabase Storage")
    print(f"   Conta ativa: {snapshot['conta_anuncio_ativa']} | Campanhas: {len(snapshot['meta_ads']['campanhas'])} | Dias de insight: {len(snapshot['meta_ads']['diario'])}")
    print(f"   Cliques no link do grupo: {'disponível (' + str(snapshot['grupo_whatsapp_cliques']['total_periodo']) + ' no período)' if snapshot['grupo_whatsapp_cliques']['disponivel'] else 'INDISPONÍVEL — ' + str(snapshot['grupo_whatsapp_cliques']['motivo'])}")
    if snapshot["pedidos_reais"]["_mock"]:
        print("   Pedidos reais: MOCKADO — " + MOTIVO_MOCK_PEDIDOS)
    else:
        total_pedidos = sum(d["pedidos"] for d in snapshot["diario_pedidos"])
        total_faturamento = sum(d["faturamento"] for d in snapshot["diario_pedidos"])
        print(f"   Pedidos reais: REAL — {total_pedidos} pedido(s), R$ {total_faturamento:,.2f} no período (via webhook order.paid)")
