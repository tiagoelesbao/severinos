"""
Agregador de dados do BI — Império Prêmios.

Junta 3 fontes numa única snapshot JSON que o dashboard
(apps/BI/imperio-premios/) consome:

1. Meta Ads Insights (gasto, ações, valor) — API do Graph, por dia e por
   anúncio, pro conjunto de anúncios ativo.
2. Meta Pixel stats (PageView/Lead/ClickSorteios) — pro funil da LP.
3. Pedidos reais da API do cliente — Canal_Atribuicao corrigido (UTM > fbc
   fresco, ver client_api.py) + classificação própria de cliente
   novo-vs-recorrente (por telefone/CPF, não pelo rótulo de audiência do
   Meta, que não está disponível via API — ver
   squads/virals-marketing-squad/data/clients/imperio-premios/meta-ads/funil-conversao.md).

Uso:
    python bi_aggregator.py [--dias 30] [--out ../../../apps/BI/imperio-premios/data.json]
"""
import os
import re
import sys
import json
import argparse
import requests
import pandas as pd
import yaml
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from client_api import SorteiosAPIClient  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT, "..", "..", "..", ".env"))

GRAPH = "https://graph.facebook.com/v21.0"
# Achado 2026-10-21 (founder subiu campanha nova em 2ª conta da mesma BM):
# "CA IP Realiza - 02" (a original) e "CA IP Realiza - 01" (nova) são contas
# IRMÃS na mesma BM ("IP Realiza", id 3640550059575630) e compartilham o
# MESMO pixel (2276849516022676, "IMP 2") — confirmado ao vivo via
# /me/adaccounts e /act_.../adspixels. O token já tem acesso às duas, não
# precisou pedir permissão nova. AD_ACCOUNT (singular) continua existindo só
# por compatibilidade com quem importar essa constante; todo o resto do
# arquivo usa AD_ACCOUNTS (plural) a partir daqui.
AD_ACCOUNT = "act_2076716696539325"
AD_ACCOUNTS = ["act_2076716696539325", "act_1809822716714730", "act_1072883085538453"]
# "CA IP Realiza - 03" (act_1072883085538453) — achado 2026-10-22: acesso
# liberado pelo founder ao nosso usuário do sistema na mesma BM. Usa o MESMO
# pixel das outras duas (2276849516022676, confirmado ao vivo) — ao
# contrário do que o founder suspeitava ("pixel diferente"), então
# PIXEL_ID/pull_pixel_funnel* não precisam de nenhuma mudança pra cobrir
# essa conta. "CA IP Realiza - 04" e "05" existem na mesma BM mas estão
# vazias (sem pixel, sem campanha) — não entram em AD_ACCOUNTS até terem uso
# real, pra não gastar chamada de API à toa a cada refresh.
# Achado 2026-10-07 (founder: dia 8 aparecendo com o Brasil ainda no dia 7):
# todo "dia" exibido no BI precisa ser o calendário de Brasília, não UTC —
# .dt.date num timestamp UTC-aware extrai a data em UTC, que já virou o dia
# seguinte entre 21h e 23h59 (horário de Brasília). Usado em TODO ponto que
# bucketiza pedido/evento por dia neste arquivo.
TZ_BRASIL = "America/Sao_Paulo"

# Achado 2026-10-16 (founder confirmou com o cliente): o "dia" do NEGÓCIO não
# é meia-noite a meia-noite — a janela de atribuição dele vai até o fim do
# último sorteio do dia; faturamento que entra depois já é do dia seguinte.
# Só vale pra pedido/faturamento — o funil do pixel (PresselPageView etc.)
# continua em calendário normal, não está preso ao ciclo de sorteio.
#
# CORRIGIDO 2026-11-13 (cliente, via founder, auditoria de sorteio por
# sorteio): o último horário de sorteio do dia é "COR" às 21h45, não 21h30
# — a plataforma roda 6 rodadas fixas por dia (PPT 09h35, PTM 11h35, PT
# 14h35, PTV 16h35, PTN 18h35, COR 21h45, confirmado no campo `description`
# dos sorteios reais da API). O corte antigo de 21h30 cortava 15 minutos
# ANTES do último sorteio realmente fechar, jogando sorteios da rodada COR
# (e ações abertas nesses 15 minutos) pro dia errado. Ver `_dia_negocio()`.
DIA_NEGOCIO_CORTE_HORAS = 21.75  # 21h45 (rodada COR, a última do dia)


def _dia_negocio(timestamps_brt):
    """Converte uma Series de timestamps JÁ EM HORÁRIO DE BRASÍLIA (tz-aware)
    pro "dia de negócio" do cliente: deslocamos pra frente por
    (24h - DIA_NEGOCIO_CORTE_HORAS) antes de extrair a data, o truque padrão
    pra mover o corte de meia-noite pra qualquer outro horário. Com o corte
    em 21h45: pedido/sorteio às 21:44 ainda é "hoje" (antes do corte);
    às 21:46 já vira "amanhã" (depois do corte, vai pro próximo sorteio)."""
    offset = pd.Timedelta(hours=(24 - DIA_NEGOCIO_CORTE_HORAS))
    return (timestamps_brt + offset).dt.date.astype(str)


def _dia_24h(timestamps_brt):
    """Janela convencional (meia-noite a meia-noite, horário de Brasília) —
    a lógica que o BI usava antes de 2026-10-16. Pedido do cliente
    (2026-10-17, via founder): ver as duas agregações lado a lado na aba
    Executiva, não só a de 21h45 — "primeiro ver o faturamento das duas
    agregações diferentes". Não substitui `_dia_negocio`, é paralela."""
    return timestamps_brt.dt.date.astype(str)


CAMPANHA_INICIO = "2026-10-06"  # created_time real da campanha (confirmado via API) —
# nunca somar pedidos de antes disso como "resultado" da campanha, mesmo
# que o fbc/UTM aponte pra Meta (seria de outra campanha/período).
PIXEL_ID = os.environ.get("META_IMPERIO_PREMIOS_DATASET_ID", "2276849516022676")
TOKEN = os.environ.get("META_IMPERIO_PREMIOS_ACCESS_TOKEN")
BRIEF_PATH = os.path.join(
    ROOT, "..", "..", "..", "squads", "virals-marketing-squad", "data",
    "clients", "imperio-premios", "meta-ads", "brief.yaml",
)


def carregar_margem_pct():
    with open(BRIEF_PATH, encoding="utf-8") as f:
        brief = yaml.safe_load(f)
    return brief["oferta"]["margem_contribuicao_pct"]


def graph_get(path, params=None):
    """Segue paginação (paging.next) sempre que a resposta tiver uma lista
    `data` — achado 2026-11-03: sem isso, qualquer endpoint com mais de 25
    registros (página padrão da Graph API) tinha o resto silenciosamente
    descartado. Isso incluía o dia de HOJE nos endpoints de insights diário
    por campanha (date_preset=maximum, time_increment=1): campanha com mais
    de 25 dias de vida tem o(s) dia(s) mais recente(s) — incluindo o atual —
    numa 2ª página que nunca era buscada. Resultado real medido: gasto de
    hoje aparecia R$569,51 no BI contra R$1.269,29 no Ads Manager — a
    diferença inteira era a 2ª página perdida. Afeta qualquer chamada
    paginada deste arquivo (campanhas, anúncios, insights), não só esta."""
    params = dict(params or {})
    params["access_token"] = TOKEN
    r = requests.get(f"{GRAPH}{path}", params=params, timeout=30)
    r.raise_for_status()
    j = r.json()
    if isinstance(j.get("data"), list):
        proxima = (j.get("paging") or {}).get("next")
        paginas = 1
        while proxima and paginas < 50:  # teto de segurança — nunca travar num loop infinito por paging estranho
            rp = requests.get(proxima, timeout=30)
            rp.raise_for_status()
            jp = rp.json()
            j["data"].extend(jp.get("data") or [])
            proxima = (jp.get("paging") or {}).get("next")
            paginas += 1
    return j


def pull_campanhas():
    """Todas as campanhas ativas/pausadas de TODAS as contas em AD_ACCOUNTS —
    achado 2026-10-07 (founder: "vamos subir mais campanhas, não podemos
    ficar com BI atrelado a uma campanha apenas"); estendido 2026-10-21
    (founder subiu campanha nova numa 2ª conta da mesma BM, "CA IP Realiza
    - 01" — mesmo pixel da conta original, só não tinha quem puxasse os
    dados dela). Cada campanha carrega conta_id/conta_nome, além de
    campanha_id/campanha_nome que pull_meta_insights já anexa. Ignora
    DELETED/ARCHIVED (sem relevância operacional)."""
    todas = []
    for conta in AD_ACCOUNTS:
        nome_conta = graph_get(f"/{conta}", {"fields": "name"}).get("name", conta)
        camps = graph_get(
            f"/{conta}/campaigns",
            {
                "fields": "id,name,status,effective_status",
                "filtering": json.dumps([{"field": "effective_status", "operator": "IN", "value": ["ACTIVE", "PAUSED"]}]),
            },
        ).get("data", [])
        for c in camps:
            c["conta_id"], c["conta_nome"] = conta, nome_conta
        todas.extend(camps)
    return todas


def pull_meta_insights(dias):
    """Spend/ações por dia E por anúncio, pra TODAS as campanhas ativas/
    pausadas (não mais 1 campanha fixa) — também por dia, não acumulado
    (pedido 2026-10-07: filtro de período no Operacional precisa recalcular
    'Performance por anúncio' pra qualquer intervalo). Traz o criativo
    (thumbnail + preview_html pra visualização real) de cada anúncio."""
    campanhas = pull_campanhas()
    daily_all, by_ad_all = [], []

    for camp in campanhas:
        cid, cnome = camp["id"], camp.get("name", camp["id"])
        conta_id, conta_nome = camp.get("conta_id"), camp.get("conta_nome")

        daily = graph_get(
            f"/{cid}/insights",
            {"fields": "spend,impressions,clicks,reach,actions,action_values", "time_increment": 1, "date_preset": "maximum"},
        ).get("data", [])
        for d in daily:
            d["campanha_id"], d["campanha_nome"] = cid, cnome
            d["conta_id"], d["conta_nome"] = conta_id, conta_nome
        daily_all.extend(daily)

        by_ad = graph_get(
            f"/{cid}/ads",
            {"fields": "id,name,status,effective_status,creative{thumbnail_url,image_url,video_id,object_type}"},
        ).get("data", [])
        for ad in by_ad:
            ad["campanha_id"], ad["campanha_nome"] = cid, cnome
            ad["conta_id"], ad["conta_nome"] = conta_id, conta_nome
            ins = graph_get(
                f"/{ad['id']}/insights",
                {"fields": "spend,impressions,clicks,actions,action_values", "time_increment": 1, "date_preset": "maximum"},
            ).get("data", [])
            ad["insights_diario"] = ins
            # achado 2026-10-07: embed público (/video/embed, embed_html do
            # vídeo) dá "Vídeo indisponível" — vídeo de anúncio não é post
            # público, exige sessão de quem tem acesso à Business Manager.
            # A API de PREVIEW DE ANÚNCIO (/{ad_id}/previews) é feita
            # exatamente pra isso — devolve um iframe autenticado via
            # business.facebook.com que mostra o anúncio real (funciona
            # pra vídeo E imagem, com legenda/CTA do jeito que roda).
            creative = ad.get("creative") or {}
            preview = graph_get(f"/{ad['id']}/previews", {"ad_format": "MOBILE_FEED_STANDARD"}).get("data", [])
            creative["preview_html"] = preview[0]["body"] if preview else None
        by_ad_all.extend(by_ad)

    return daily_all, by_ad_all, campanhas


def pull_pixel_funnel(dias):
    """PageView/Lead/ClickSorteios/InitiateCheckout/Purchase por dia (pixel inteiro —
    não é só desta campanha, é o site todo; usado só pra visualizar a forma do funil,
    não pra atribuir R$ a uma campanha específica)."""
    end = int(datetime.now().timestamp())
    start = int((datetime.now() - timedelta(days=dias)).timestamp())
    data = graph_get(
        f"/{PIXEL_ID}/stats",
        {"aggregation": "event", "start_time": start, "end_time": end},
    ).get("data", [])
    return data


# O dataset do Pixel agrega MAIS DE UM domínio. Somar tudo num funil só é
# enganoso: a pressel e o site de sorteios são etapas diferentes da jornada,
# não o mesmo funil.
#
# Hosts medidos ao vivo em 2026-10-10 (janela de 14 dias, `aggregation=host`):
#   imperiopremioss.com            -> site de sorteios
#   imperiorapidinhas.com.br       -> pressel (domínio próprio)
#   www.imperiorapidinhas.com.br   -> pressel (variante www)
#   imperio.vercel.app             -> pressel (deploy anterior)
#   imperio-premios-lp.vercel.app  -> pressel (deploy anterior)
#
# A classificação é por SUFIXO do domínio do site, não por lista de pressel:
# a pressel já trocou de endereço 3 vezes (2 deploys Vercel + domínio próprio)
# e vai trocar de novo — mas, ao contrário do que essa nota original dizia
# ("o site de sorteios é estável"), o PRÓPRIO SITE também trocou de domínio
# (achado 2026-10-22, founder avisou): imperiopremioss.com morreu (DNS
# confirmado NXDOMAIN), site novo é rapidinhas24hr.com. Mantemos os DOIS
# sufixos na tupla — dado histórico (antes da troca) ainda tem host antigo
# nos stats do pixel, dado novo já vem com o domínio novo; sem os dois,
# tráfego do site cairia silenciosamente no bucket "pressel" depois da
# virada, o mesmo tipo de bug que essa nota já alertava pra pressel. Com
# allowlist (positiva) de site em vez de negativa de pressel, todo domínio
# novo de pressel some sozinho sem precisar editar este arquivo de novo.
SITE_SUFIXOS = ("imperiopremioss.com", "rapidinhas24hr.com")

# AddToCart saiu de propósito (decisão do founder, 2026-10-10): é o único
# evento do funil SEM cobertura de CAPI — só navegador — então o número dele
# não é comparável com InitiateCheckout/Purchase, que são navegador+servidor.
# Mantê-lo lado a lado convidava a uma leitura de taxa de conversão falsa.
EVENTOS_FUNIL_HOST = [
    "PageView",
    "ViewContent",
    "InitiateCheckout",
    "Purchase",
    "Lead",
    "ClickSorteios",
    "ClickGroup",
    # Jornada pressel→catálogo→compra (2026-10-15): disparam em domínio
    # próprio (PresselPageView/CatalogoPageView/ClickSorteiosCatalogo, caem
    # em origem="pressel") ou via tag GTM no site do cliente, caindo em
    # origem="site" porque disparam em imperiopremioss.com.
    # PurchaseCatalogo (renomeado de PurchaseClickSorteios em 2026-10-16,
    # GTM v13): várias LPs/pressels direcionam pro catálogo, e é lá que a
    # compra acontece de verdade — não numa LP específica. Mede a jornada
    # pressel/LP → catálogo → campanha, independente de qual LP originou o
    # clique. Jornada real e rastreável (tudo em domínio nosso).
    # PurchaseGroup (2026-10-16, revertido de PurchaseClickGroup): o clique
    # em "Entrar no grupo" na pressel sai pro sndflw.com/WhatsApp, fora de
    # qualquer domínio rastreável — não dá pra provar que a compra veio
    # daquele clique específico. O nome com "Click" sugeria uma precisão
    # que não entregamos; voltou a ser o nome genérico do canal grupo
    # (via UTM whatsapp), exibido separado do funil da pressel no frontend.
    "PresselPageView",
    "CatalogoPageView",
    "ClickSorteiosCatalogo",
    "PurchaseCatalogo",
    "PurchaseGroup",
    # "Plataforma" (2026-10-16, GTM v12 + CAPI): espelha PageView/ViewContent/
    # InitiateCheckout/AddToCart/Purchase com nome EXCLUSIVO nosso, mesma
    # fonte de dado real (dataLayer do cliente via nosso GTM + nosso CAPI),
    # disparado em PARALELO aos eventos padrão — que são compartilhados com
    # o pixel nativo da plataforma do cliente e por isso vêm inflados/
    # duplicados (medido: 3,43x em 28 dias só pro Purchase). Eventos
    # "Plataforma" disparam no site do cliente (ver SITE_SUFIXOS) →
    # origem="site" na classificação por host, igual aos padrão.
    "PageViewPlataforma",
    "ViewContentPlataforma",
    "InitiateCheckoutPlataforma",
    "AddToCartPlataforma",
    "PurchasePlataforma",
]


def _classificar_origem_host(host):
    """site = o domínio de sorteios (onde a compra acontece, hoje OU antes da
    troca de domínio — ver nota em SITE_SUFIXOS); pressel = qualquer outro
    host do dataset."""
    h = (host or "").lower().strip()
    return "site" if any(h == suf or h.endswith("." + suf) for suf in SITE_SUFIXOS) else "pressel"


def pull_pixel_funnel_por_host(dias):
    """Mesmo funil do pull_pixel_funnel, mas quebrado por ORIGEM (pressel x
    site de sorteios) — uma chamada por evento, com `aggregation=host`.

    Por que existe: `aggregation=event` devolve o total somado de todos os
    domínios do dataset. Sem o recorte por host não dá pra ler a pressel —
    e em 2026-10-10 isso produziu um CTR de pressel falso (10 cliques sobre
    2.288 PageView, quando o denominador correto da pressel era ~200).
    """
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
                dia = (
                    datetime.strptime(periodo["start_time"], "%Y-%m-%dT%H:%M:%S%z")
                    .astimezone(ZoneInfo(TZ_BRASIL))
                    .date()
                    .isoformat()
                )
            except (KeyError, ValueError, TypeError):
                continue
            for item in periodo.get("data", []):
                linhas.append({
                    "dia": dia,
                    "evento": evento,
                    "origem": _classificar_origem_host(item.get("value")),
                    "host": item.get("value"),
                    "count": int(item.get("count", 0) or 0),
                })
    return linhas


def montar_pixel_funil_host_diario(linhas_host):
    """Consolida dia×evento×origem (as duas variantes de host da pressel somam
    numa origem só)."""
    agg = {}
    for ln in linhas_host:
        chave = (ln["dia"], ln["evento"], ln["origem"])
        agg[chave] = agg.get(chave, 0) + ln["count"]
    return [
        {"dia": dia, "evento": evento, "origem": origem, "count": count}
        for (dia, evento, origem), count in agg.items()
    ]


def extrair_telefone_chave(row):
    """Chave de identidade pro cálculo de novo-vs-recorrente: telefone E164,
    com fallback pro CPF quando telefone não existir."""
    if row.get("Telefone_E164"):
        return f"tel:{row['Telefone_E164']}"
    if row.get("Cpf"):
        return f"cpf:{row['Cpf']}"
    return None


def pull_pedidos(dias):
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
        participantes = client.get_participantes_sorteio(pid)
        for p in participantes:
            p["productId"] = pid
        linhas.extend(client.processar_lote(participantes))
        if i % 10 == 0:
            print(f"   ... {i}/{len(sorteios)} sorteios processados")

    df = pd.DataFrame(linhas)
    print(f"✅ {len(df)} pedidos coletados")
    return df, sorteios, client


IMPERIO_SUPABASE_URL = os.environ.get("IMPERIO_SUPABASE_URL")
IMPERIO_SUPABASE_SERVICE_ROLE_KEY = os.environ.get("IMPERIO_SUPABASE_SERVICE_ROLE_KEY")

# Bucket PRIVADO dedicado — publica os 4 data-*.json lá pra api/dados.js
# servir sem precisar de "vercel --prod" a cada refresh (achado 2026-11-03:
# o limite de 100 deploys/dia é compartilhado entre TODOS os projetos da
# conta Vercel, e o refresh de 15min do Império sozinho já consumia quase
# toda a cota). NÃO reusa o bucket "catalogo" (snapshot_sorteios.py/
# bi_sync/bi_paused) porque aquele é PÚBLICO (`public: true`) — qualquer um
# com a URL leria faturamento/margem sem senha, furando o gate do
# middleware.js. "bi-dados" é privado: só a service role key lê.
BI_STORAGE_BUCKET = "bi-dados"


def publicar_bi_storage(nome_arquivo, dados):
    if not IMPERIO_SUPABASE_URL or not IMPERIO_SUPABASE_SERVICE_ROLE_KEY:
        print(f"⚠️  Storage não publicado ({nome_arquivo}) — IMPERIO_SUPABASE_URL/KEY ausentes")
        return
    url = f"{IMPERIO_SUPABASE_URL}/storage/v1/object/{BI_STORAGE_BUCKET}/{nome_arquivo}"
    r = requests.post(
        url,
        headers={
            "apikey": IMPERIO_SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {IMPERIO_SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "x-upsert": "true",
            "Cache-Control": "no-cache",
        },
        data=json.dumps(dados, ensure_ascii=False).encode("utf-8"),
        timeout=30,
    )
    if not r.ok:
        raise RuntimeError(f"Supabase Storage {r.status_code} ({nome_arquivo}): {r.text[:300]}")


def enriquecer_com_utm_webhook(df_pedidos):
    """Achado 2026-10-08: UTM_Source vem vazio em 99,6% dos pedidos pela API
    REST (a SPA do cliente perde a query string na navegação interna antes
    do checkout) — mas o webhook order.paid (apps/webhook-imperio-capi)
    recebe utmSource/utmCampaign/etc prontos no momento exato da compra,
    direto do backend da plataforma, e já grava isso na tabela
    `pedido_utm` do Supabase por OrderId. Aqui só faz o backfill: nunca
    sobrescreve um UTM que a API REST já trouxe preenchido, só completa
    onde está vazio. Pedido fora da tabela (comprado antes do webhook
    existir, ou webhook não configurado) mantém o comportamento de hoje —
    função é no-op sem credencial, nunca derruba o resto do pipeline."""
    df = df_pedidos.copy()
    if not IMPERIO_SUPABASE_URL or not IMPERIO_SUPABASE_SERVICE_ROLE_KEY:
        return df
    if "OrderId" not in df.columns or df.empty:
        return df

    order_ids = [oid for oid in df["OrderId"].astype(str).tolist() if oid]
    if not order_ids:
        return df

    utm_por_pedido = {}
    headers = {
        "apikey": IMPERIO_SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {IMPERIO_SUPABASE_SERVICE_ROLE_KEY}",
    }
    # PostgREST tem limite prático de tamanho de URL — pagina em lotes.
    LOTE = 200
    try:
        for i in range(0, len(order_ids), LOTE):
            lote = order_ids[i : i + LOTE]
            ids_filtro = ",".join(lote)
            url = (
                f"{IMPERIO_SUPABASE_URL}/rest/v1/pedido_utm"
                f"?order_id=in.({ids_filtro})"
                f"&select=order_id,utm_source,utm_medium,utm_campaign,utm_content,utm_term"
            )
            resp = requests.get(url, headers=headers, timeout=30)
            if not resp.ok:
                print(f"⚠️ enriquecer_com_utm_webhook: falha ao consultar Supabase ({resp.status_code}) — seguindo sem enriquecer este lote.")
                continue
            for row in resp.json():
                utm_por_pedido[row["order_id"]] = row
    except Exception as e:
        print(f"⚠️ enriquecer_com_utm_webhook: erro de rede ({e}) — seguindo sem enriquecer.")
        return df

    if not utm_por_pedido:
        return df

    campos = [
        ("UTM_Source", "utm_source"),
        ("UTM_Medium", "utm_medium"),
        ("UTM_Campaign", "utm_campaign"),
        ("UTM_Content", "utm_content"),
        ("UTM_Term", "utm_term"),
    ]
    preenchidos = 0
    for idx, row in df.iterrows():
        oid = str(row.get("OrderId") or "")
        achado = utm_por_pedido.get(oid)
        if not achado:
            continue
        ja_tinha = str(row.get("UTM_Source") or "").strip() != ""
        if ja_tinha:
            continue  # nunca sobrescreve UTM real que a API REST já trouxe
        for col_df, col_supabase in campos:
            valor = achado.get(col_supabase)
            if valor:
                df.at[idx, col_df] = valor
        preenchidos += 1

    print(f"✅ UTM via webhook: {preenchidos} pedido(s) preenchido(s) a partir de {len(utm_por_pedido)} registro(s) em pedido_utm.")
    return df


def enriquecer_com_utm_touches(df_pedidos):
    """Segunda camada de enriquecimento de UTM — fallback por `fbp`, não por
    order_id. Achado 2026-10-08 (ver gates-status.yaml): nem a API REST nem
    o payload do webhook order.paid trazem UTM preenchida em NENHUM pedido
    real, confirmado em 25/25 pedidos com fbc genuinamente fresco — a
    plataforma não persiste UTM em lugar nenhum do fluxo dela. Como
    alternativa, um script via GTM (apps/utm-capture-imperio) captura
    {fbp, utm_*} assim que a pessoa chega numa página com UTM na URL,
    direto no navegador, sem depender da plataforma. Aqui cruzamos por
    `Fbp` (presente em ~93% dos pedidos reais, auditado antes nesta
    sessão) contra a tabela `utm_touches`, pegando o touch mais recente
    pra cada fbp. Roda DEPOIS de enriquecer_com_utm_webhook — só preenche
    o que ainda estiver vazio, nunca sobrescreve UTM real nem UTM já
    trazida pela camada anterior."""
    df = df_pedidos.copy()
    if not IMPERIO_SUPABASE_URL or not IMPERIO_SUPABASE_SERVICE_ROLE_KEY:
        return df
    if "Fbp" not in df.columns or df.empty:
        return df

    fbps = sorted({str(v) for v in df["Fbp"].tolist() if v})
    if not fbps:
        return df

    touch_por_fbp = {}
    headers = {
        "apikey": IMPERIO_SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {IMPERIO_SUPABASE_SERVICE_ROLE_KEY}",
    }
    LOTE = 100  # fbp é string longa (~40 chars) — lote menor que pedido_utm pra não estourar URL
    try:
        for i in range(0, len(fbps), LOTE):
            lote = fbps[i : i + LOTE]
            ids_filtro = ",".join(lote)
            url = (
                f"{IMPERIO_SUPABASE_URL}/rest/v1/utm_touches"
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

    campos = [
        ("UTM_Source", "utm_source"),
        ("UTM_Medium", "utm_medium"),
        ("UTM_Campaign", "utm_campaign"),
        ("UTM_Content", "utm_content"),
        ("UTM_Term", "utm_term"),
    ]
    preenchidos = 0
    for idx, row in df.iterrows():
        ja_tinha = str(row.get("UTM_Source") or "").strip() != ""
        if ja_tinha:
            continue
        fbp = str(row.get("Fbp") or "")
        achado = touch_por_fbp.get(fbp)
        if not achado:
            continue
        for col_df, col_supabase in campos:
            valor = achado.get(col_supabase)
            if valor:
                df.at[idx, col_df] = valor
        preenchidos += 1

    print(f"✅ UTM via utm_touches (fbp): {preenchidos} pedido(s) preenchido(s) a partir de {len(touch_por_fbp)} fbp(s) com touch registrado.")
    return df


def montar_lp_eventos_diario(dias):
    """dia × variant × evento — mesmo padrão flat de canal_diario/utm_diario:
    backend devolve lista achatada, frontend filtra por período e soma.

    Por quê (pedido do founder, 2026-10-16): a API de stats do pixel da
    Meta só quebra por nome de evento ou host — não por parâmetro
    customizado, então o `variant: 'v1'/'v2'/'v3'` que as LPs já mandam pro
    fbq fica preso lá dentro, sem jeito de comparar LP a LP pelo pixel. A
    partir de agora (ver `apps/imperio-premios-lp/api/beacon.js`) cada
    evento que já vai pro pixel TAMBÉM grava aqui, com `variant` explícito
    — fonte 100% nossa, sem limite de agregação."""
    vazio = []
    if not IMPERIO_SUPABASE_URL or not IMPERIO_SUPABASE_SERVICE_ROLE_KEY:
        return vazio

    cutoff = (datetime.now(ZoneInfo(TZ_BRASIL)) - timedelta(days=dias)).astimezone(timezone.utc).isoformat()
    headers = {
        "apikey": IMPERIO_SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {IMPERIO_SUPABASE_SERVICE_ROLE_KEY}",
    }
    linhas = []
    try:
        offset = 0
        PAGINA = 1000
        url = f"{IMPERIO_SUPABASE_URL}/rest/v1/lp_eventos"
        while True:
            # Achado 2026-10-16: o "+" do fuso (ex. "+00:00") precisa ir por
            # `params=` (requests faz o percent-encode certo, vira %2B) — URL
            # montada à mão deixa o "+" cru, PostgREST/Postgres interpreta
            # como espaço (query string clássico) e quebra o parse do
            # timestamp ("22007 invalid input syntax"), erro só visível em
            # runtime, nunca no linter/sintaxe.
            params = {
                "criado_em": f"gte.{cutoff}",
                "select": "variant,evento,criado_em",
                "order": "id.asc",
                "limit": PAGINA,
                "offset": offset,
            }
            resp = requests.get(url, headers=headers, params=params, timeout=30)
            if not resp.ok:
                print(f"⚠️ montar_lp_eventos_diario: falha ao consultar Supabase ({resp.status_code}) — seguindo sem este dado.")
                return vazio
            pagina = resp.json()
            linhas.extend(pagina)
            if len(pagina) < PAGINA:
                break
            offset += PAGINA
    except Exception as e:
        print(f"⚠️ montar_lp_eventos_diario: erro de rede ({e}) — seguindo sem este dado.")
        return vazio

    if not linhas:
        return vazio

    df = pd.DataFrame(linhas)
    df["_data_ord"] = pd.to_datetime(df["criado_em"], errors="coerce", utc=True)
    df = df.dropna(subset=["_data_ord"])
    df["_dia"] = _dia_negocio(df["_data_ord"].dt.tz_convert(TZ_BRASIL))
    g = df.groupby(["_dia", "variant", "evento"]).size().reset_index(name="count")
    return [
        {"dia": row["_dia"], "variant": row["variant"], "evento": row["evento"], "count": int(row["count"])}
        for _, row in g.iterrows()
    ]


def calcular_premio_por_sorteio(sorteios_meta, client):
    """Valor do prêmio por sorteio (mesma extração de client_api.py usada no
    collector.py pra base de 90 dias) — fundamenta o lucro REAL do negócio
    (faturamento - prêmio pago), pedido 2026-10-07 do founder: a 'margem de
    contribuição' que já existia só descontava gasto de Ads da receita
    atribuída à campanha — nunca foi uma visão de lucro do negócio inteiro."""
    premios = {}
    for s in sorteios_meta:
        pid = s.get("_id") or s.get("id")
        if pid:
            premios[pid] = client.extrair_valor_premio(s)
    return premios


def anexar_lucro_estimado(df_pedidos, premio_por_sorteio):
    """Lucro estimado POR PEDIDO = Valor * (1 - prêmio_do_sorteio/faturamento_do_sorteio).
    O prêmio é custo de TODO o sorteio (pago uma vez, quando sorteia) — aqui ele é
    rateado proporcionalmente ao valor de cada pedido dentro do sorteio, só pra poder
    somar por dia/por sorteio sem dupla contagem (a soma por sorteio bate exatamente
    com faturamento_sorteio - valor_premio_sorteio). Sorteio sem prêmio identificável
    (extrair_valor_premio=0 — título sem 'VALENDO R$X' e sem campo awards) fica SEM
    desconto: não inventamos um custo que a API não informa, então esse número tende a
    ser um teto otimista nesses casos, nunca subestimado às escondidas."""
    df = df_pedidos.copy()
    fat_por_sorteio = df.groupby("ProductId")["Valor"].sum().to_dict()
    margem_por_sorteio = {}
    for pid, fat in fat_por_sorteio.items():
        premio = premio_por_sorteio.get(pid, 0.0)
        margem_por_sorteio[pid] = max(0.0, 1 - (premio / fat)) if (fat > 0 and premio > 0) else 1.0
    df["_lucro_estimado"] = df.apply(lambda r: r["Valor"] * margem_por_sorteio.get(r["ProductId"], 1.0), axis=1)
    return df


def classificar_novo_vs_recorrente(df):
    """Marca cada pedido como primeira compra (dentro da janela puxada) ou
    recompra, por telefone/CPF. Limitação honesta: se o cliente comprou pela
    1a vez ANTES da janela de `dias` puxada aqui, esse pedido aparece como
    'primeira compra' mesmo não sendo — aumentar `--dias` reduz esse viés,
    mas nunca elimina sem puxar o histórico completo (mais lento)."""
    df = df.copy()
    df["_chave_cliente"] = df.apply(extrair_telefone_chave, axis=1)
    df["_data_ord"] = pd.to_datetime(df["PaymentAt"].replace("", pd.NaT), errors="coerce", utc=True)
    df["_data_ord"] = df["_data_ord"].fillna(pd.to_datetime(df["Data"], errors="coerce", utc=True))
    df = df.sort_values("_data_ord")

    primeira_compra = {}
    is_primeira = []
    for _, row in df.iterrows():
        chave = row["_chave_cliente"]
        if not chave:
            is_primeira.append(None)  # sem identidade -> não dá pra classificar
            continue
        if chave not in primeira_compra:
            primeira_compra[chave] = row["_data_ord"]
            is_primeira.append(True)
        else:
            is_primeira.append(False)
    df["Primeira_Compra_Na_Janela"] = is_primeira
    return df


def _agrupar_canal(canal_atribuicao):
    """Visão grossa a partir do Canal_Atribuicao detalhado de
    client_api.py::_classificar_canal. Achado 2026-10-07 (founder): 7
    variações de "Meta Ads" só por causa da idade do fbc virou "sopa de
    confusão" na tabela de Canal de Atribuição — a pergunta prática primeiro
    é "dá pra confiar que foi Meta Ads?", não "qual a idade exata do fbc?".
    Grupo responde a pergunta prática; o detalhe (Canal_Atribuicao original)
    continua disponível pra quem quiser o diagnóstico fino, nunca
    descartado — só reorganizado em 2 níveis. NUNCA mudar os prefixos
    comparados aqui sem também revisar os mesmos prefixos usados nos
    meta_mask espalhados por este arquivo (eles precisam continuar batendo
    com o que client_api.py realmente gera)."""
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


def _fbp_idade_horas(fbp, referencia):
    """Idade (em horas) do fbp na hora do pedido. Formato Meta:
    fb.1.<timestamp_ms>.<random> — mesmo parser de `_fbc_age_days` em
    client_api.py, só que em horas (o corte de interesse aqui é 24h, não
    dias) e aplicado ao fbp (visita), não ao fbc (clique)."""
    if not fbp or pd.isna(fbp) or pd.isna(referencia):
        return None
    try:
        ts_ms = int(str(fbp).split(".")[2])
        criado = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
        return (referencia - criado).total_seconds() / 3600
    except (IndexError, ValueError, OSError):
        return None


def _refinar_canal_sinal_fraco(row):
    """Acrescenta confiança ao detalhe de 'Meta (pixel, sem clique
    confirmado)' SEM mudar o grupo nem inventar um canal novo — acrescenta
    um sufixo ao canal_detalhe existente, reaproveitando o drill-down
    grupo→detalhe que a tabela de Canal de Atribuição já tem.

    Achado 2026-10-15 (pedido do founder: auditar se este balde esconde
    Meta Ads de verdade, agora que WhatsApp está bem trackeado): por
    CONTAGEM, ~80% destes pedidos têm fbp com mediana de 61 dias — perfil
    de cliente recorrente com o pixel já antigo no navegador, não sessão
    nova. Mas por VALOR, pedidos com fbp fresco (<24h) concentram ~77% do
    faturamento do balde (amostra do dia: R$14.489 de R$18.856, 29 de 146
    pedidos) — desproporção grande o suficiente pra não ser ruído. fbp
    fresco NÃO prova origem Meta Ads (visita orgânica/grupo também cria
    fbp novo) — é só o sinal mais forte disponível sem fbc; por isso o
    rótulo diz 'maior confiança', nunca 'confirmado'."""
    if not str(row["Canal_Atribuicao"]).startswith("Meta (pixel"):
        return row["Canal_Atribuicao"]
    idade_h = _fbp_idade_horas(row.get("Fbp"), row["_data_ord"])
    if idade_h is None:
        return row["Canal_Atribuicao"] + " · fbp ilegível"
    if idade_h < 24:
        return row["Canal_Atribuicao"] + " · fbp <24h (maior confiança de ser sessão nova)"
    return row["Canal_Atribuicao"] + " · fbp antigo (provável cliente recorrente)"


def montar_canal_diario(df_pedidos):
    """dia × canal (grupo + detalhe) — flat, mesmo padrão de diario[]/
    sorteios_por_dia: o frontend filtra por data e soma, recalculando a
    tabela de Canal de Atribuição (agrupada, com detalhe expansível) pra
    qualquer período selecionado sem round-trip."""
    df = df_pedidos.copy()
    df["_dia"] = _dia_negocio(df["_data_ord"].dt.tz_convert(TZ_BRASIL))
    df["_canal_grupo"] = df["Canal_Atribuicao"].apply(_agrupar_canal)
    df["Canal_Atribuicao"] = df.apply(_refinar_canal_sinal_fraco, axis=1)
    g = df.groupby(["_dia", "_canal_grupo", "Canal_Atribuicao"]).agg(
        pedidos=("Valor", "count"), valor=("Valor", "sum"),
    ).reset_index()
    return [
        {
            "dia": row["_dia"],
            "canal_grupo": row["_canal_grupo"],
            "canal_detalhe": row["Canal_Atribuicao"],
            "pedidos": int(row["pedidos"]),
            "valor": round(float(row["valor"]), 2),
        }
        for _, row in g.iterrows()
    ]


SEM_UTM_CAMPANHA = "(sem UTM — fbc confirmado)"
SEM_UTM_CRIATIVO = "(criativo não identificado — sem UTM capturada)"


def _com_meta_sem_utm(df_pedidos):
    """Acrescenta, só pra esta visão (não mexe no df original nem no resto
    do pipeline), os pedidos que são Meta Ads CONFIRMADO via fbc fresco mas
    que não têm UTM nenhuma (nem webhook nem touch capturaram) — hoje esses
    pedidos ficavam de fora da seção 'Meta Ads' inteira (card, tabela por
    campanha, tabela por criativo), mesmo já estando corretamente
    classificados em Canal_Atribuicao como 'Meta Ads (clique confirmado,
    sem UTM)'. Achado 2026-11-13 (founder, auditoria de criativo por
    anúncio): 2 anúncios recém-lançados tinham Purchase real reportado pela
    Meta mas ZERO venda aparecendo em qualquer lugar da seção Meta Ads — a
    causa é baixa cobertura do touch (fbp+UTM) pra anúncio muito novo, não
    um erro de configuração (confirmado comparando config do anúncio
    com outro do MESMO ad set que captura bem). Enquanto a cobertura do
    touch não melhora, pelo menos o VOLUME (pedidos/valor) fica visível
    aqui, com UTM_Source/Campaign/Content sintéticos e nomes que deixam
    claro que não é um criativo/campanha identificados de verdade — nunca
    inventa qual campanha/criativo foi, só agrega o que sabemos: veio de
    clique real confirmado em algum anúncio Meta."""
    df = df_pedidos.copy()
    sem_utm_mas_fbc = (
        (df["UTM_Source"].fillna("") == "") &
        df["Canal_Atribuicao"].str.startswith("Meta Ads (clique confirmado", na=False)
    )
    df.loc[sem_utm_mas_fbc, "UTM_Source"] = "meta"
    df.loc[sem_utm_mas_fbc, "UTM_Campaign"] = SEM_UTM_CAMPANHA
    df.loc[sem_utm_mas_fbc, "UTM_Content"] = SEM_UTM_CRIATIVO
    return df


def montar_utm_diario(df_pedidos):
    """dia × utm_source × utm_campaign — flat, mesmo padrão de canal_diario
    acima: só pedidos com UTM_Source preenchido entram aqui (pedido sem UTM
    já aparece no resto do BI via Canal de Atribuição — esta seção é só a
    granularidade fina de quem TEM utm). Inclui também, via
    `_com_meta_sem_utm`, o Meta Ads confirmado por fbc mesmo sem UTM real.

    Existe porque o cliente só passou a usar de verdade a convenção de UTM
    no link do grupo de WhatsApp em 2026-10-13/14 — antes disso o campo
    praticamente não vinha preenchido (achado 2026-10-07: 0% nos pedidos
    mesmo com url_tags configurado certo no Ads Manager). Agora que tem
    volume real (ex: 'UTM: whatsapp' sozinho é a maior fatia de faturamento
    em dias recentes), a tabela de Canal de Atribuição grossa
    ('Outra UTM' → 'UTM: whatsapp') não decompõe por campanha/conteúdo —
    é essa decomposição que esta função dá.

    utm_content fica de fora de propósito: no grupo de WhatsApp o
    utm_content tende a ser o link individual do post (alta cardinalidade,
    não informativo numa tabela agregada) — se precisar dele, está no CSV
    bruto, não faz sentido pré-agregar aqui."""
    df = _com_meta_sem_utm(df_pedidos)
    df = df[df["UTM_Source"].fillna("") != ""].copy()
    if df.empty:
        return []
    df["_dia"] = _dia_negocio(df["_data_ord"].dt.tz_convert(TZ_BRASIL))
    df["_utm_campaign"] = df["UTM_Campaign"].fillna("(sem campanha)").replace("", "(sem campanha)")
    g = df.groupby(["_dia", "UTM_Source", "_utm_campaign"]).agg(
        pedidos=("Valor", "count"), valor=("Valor", "sum"),
    ).reset_index()
    return [
        {
            "dia": row["_dia"],
            "utm_source": row["UTM_Source"],
            "utm_campaign": row["_utm_campaign"],
            "pedidos": int(row["pedidos"]),
            "valor": round(float(row["valor"]), 2),
        }
        for _, row in g.iterrows()
    ]


def montar_utm_criativo_diario(df_pedidos):
    """dia × utm_campaign × utm_content, SÓ pra utm_source='meta' — granularidade
    de CRIATIVO (anúncio) dentro da UTM de Meta Ads, pedido do founder 2026-10-17:
    "de qual campanha" já existe (montar_utm_diario), faltava "de qual criativo
    especificamente". utm_content é {{ad.id}} na convenção (utm-convention.md),
    então aqui é literalmente o ad_id — o frontend resolve o nome cruzando com
    `campanha.ads` (mesmo padrão de `nomesCampanha` em operacional.html).

    Por que só Meta (ao contrário de montar_utm_diario, que cobre todo
    utm_source): pro WhatsApp o utm_content tende a ser o link individual do
    post (alta cardinalidade, não um ID estável de anúncio) — mesma razão já
    documentada por que ele fica de fora da agregação geral acima.

    Inclui também, via `_com_meta_sem_utm`, o Meta Ads confirmado por fbc
    mesmo sem UTM/touch real — aparece como campanha/criativo
    "(sem UTM — fbc confirmado)"/"(criativo não identificado...)" em vez
    de sumir inteiramente da análise (achado 2026-11-13)."""
    df = _com_meta_sem_utm(df_pedidos)
    df = df[
        (df["UTM_Source"].fillna("").str.lower() == "meta") &
        (df["UTM_Content"].fillna("") != "")
    ].copy()
    if df.empty:
        return []
    df["_dia"] = _dia_negocio(df["_data_ord"].dt.tz_convert(TZ_BRASIL))
    df["_utm_campaign"] = df["UTM_Campaign"].fillna("(sem campanha)").replace("", "(sem campanha)")
    g = df.groupby(["_dia", "_utm_campaign", "UTM_Content"]).agg(
        pedidos=("Valor", "count"), valor=("Valor", "sum"),
    ).reset_index()
    return [
        {
            "dia": row["_dia"],
            "utm_campaign": row["_utm_campaign"],
            "utm_content": row["UTM_Content"],
            "pedidos": int(row["pedidos"]),
            "valor": round(float(row["valor"]), 2),
        }
        for _, row in g.iterrows()
    ]


def montar_pixel_funil_diario(pixel_funnel):
    """pixel_funil_site_todo vem por HORA (start_time) — aqui vira flat
    dia×evento, pro filtro de período da Operacional recalcular o funil sem
    round-trip (mesmo padrão dos outros *_diario deste arquivo)."""
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


def montar_sorteios(df_pedidos, sorteios_meta, premio_por_sorteio):
    """1 linha por sorteio: faturamento total, fatia vinda de Meta Ads
    (contagem+valor), prêmio e lucro real (faturamento - prêmio), pra cruzar
    resultado de sorteio com investimento em anúncio E com custo de
    premiação. sorteios_meta vem de client.get_sorteios() (título, prêmio,
    status, datas)."""
    por_produto = df_pedidos.groupby("ProductId").agg(
        faturamento=("Valor", "sum"),
        pedidos=("Valor", "count"),
    )
    meta_mask = (
        df_pedidos["Canal_Atribuicao"].str.startswith("UTM: meta", na=False)
        | df_pedidos["Canal_Atribuicao"].str.startswith("Meta Ads (clique confirmado", na=False)
    )
    por_produto_meta = df_pedidos[meta_mask].groupby("ProductId").agg(
        meta_pedidos=("Valor", "count"),
        meta_valor=("Valor", "sum"),
    )

    linhas = []
    for s in sorteios_meta:
        pid = s.get("_id") or s.get("id")
        if not pid or pid not in por_produto.index:
            continue
        row = por_produto.loc[pid]
        meta_row = por_produto_meta.loc[pid] if pid in por_produto_meta.index else None
        faturamento = round(float(row["faturamento"]), 2)
        valor_premio = round(float(premio_por_sorteio.get(pid, 0.0)), 2)
        linhas.append({
            "product_id": pid,
            "titulo": s.get("title", ""),
            "status": s.get("status", ""),
            "faturamento": faturamento,
            "pedidos": int(row["pedidos"]),
            "meta_ads_pedidos": int(meta_row["meta_pedidos"]) if meta_row is not None else 0,
            "meta_ads_valor": round(float(meta_row["meta_valor"]), 2) if meta_row is not None else 0.0,
            "valor_premio": valor_premio if valor_premio > 0 else None,
            "lucro": round(faturamento - valor_premio, 2) if valor_premio > 0 else None,
        })
    return sorted(linhas, key=lambda x: x["faturamento"], reverse=True)


# ---------------------------------------------------------------- produto
# Taxa da plataforma (5% — atualizado 2026-10-15, era 4%). Usada em 2 lugares:
# (a) Produto, no lucro de cada rodada ("esta rodada se paga?" é depois de
# prêmio E depois de taxa); (b) Executiva, como uma LINHA SEPARADA e
# explícita no card de lucro (ver `calcular_kpis_financeiros` — pedido do
# founder 2026-10-15: os cards de faturamento não deixavam claro se/quanto
# de taxa já estava descontado). `_lucro_estimado` (usado no card principal
# e no drill-down "Auditar por sorteio") continua só-prêmio, de propósito —
# é a métrica original pedida em 07/10 e o drill-down depende da identidade
# lucro_estimado = faturamento - prêmio pra conferir a conta; a taxa entra
# como dedução adicional, explícita, em cima dela — não escondida dentro.
TAXA_PLATAFORMA = 0.05

# Janelas de extração do PT-Rio (banca "Para Todos", Rio de Janeiro) nas quais
# o cliente roda os sorteios. NÃO é número inventado: a própria descrição de
# todos os 363 sorteios da janela lista estes horários de corte ("PPT 09:35h /
# PTM 11:35h / PT 14:35h / PTV 16:35h / PTN 18:35h (quartas e sábados 20:25
# pela FED) / COR 21:45h"), e eles batem com o calendário público da banca.
# Usado só como linha de referência no gráfico de hora do dia — nenhuma
# métrica depende disso.
JANELAS_EXTRACAO = [
    {"sigla": "PPT", "nome": "Primeira Para Todos", "hora": 9, "minuto": 35},
    {"sigla": "PTM", "nome": "Para Todos Matinal", "hora": 11, "minuto": 35},
    {"sigla": "PT", "nome": "Para Todos", "hora": 14, "minuto": 35},
    {"sigla": "PTV", "nome": "Para Todos Vespertino", "hora": 16, "minuto": 35},
    {"sigla": "PTN", "nome": "Para Todos Noite", "hora": 18, "minuto": 35},
    {"sigla": "COR", "nome": "Corujinha", "hora": 21, "minuto": 45},
]

FAIXAS_VALOR_PEDIDO = [
    (0, 5, "até R$5"), (5, 10, "R$5-10"), (10, 25, "R$10-25"), (25, 50, "R$25-50"),
    (50, 100, "R$50-100"), (100, 250, "R$100-250"), (250, 500, "R$250-500"),
    (500, float("inf"), "R$500+"),
]


def _porte_premio(premio):
    """Portes do brief.yaml::oferta.descricao (Pequeno ≤R$1k / Médio R$1-5k /
    Jackpot >R$5k) — as mesmas 3 faixas em que o cliente já pensa o portfólio,
    não uma segmentação nova inventada aqui."""
    if not premio or premio <= 0:
        return "Sem prêmio identificável"
    if premio <= 1000:
        return "Pequeno (até R$1k)"
    if premio <= 5000:
        return "Médio (R$1k-5k)"
    return "Jackpot (acima de R$5k)"


def _parse_premio_brl(texto):
    """Mesma normalização de `client_api.py::extrair_valor_premio` (inclusive o
    "O"→"0" — os títulos/awards do cliente trocam a letra O pelo zero, ex.
    "VALEND0"). Reimplementado aqui em vez de chamar o método privado do
    client pra `montar_rodadas` não depender de uma instância autenticada."""
    bruto = re.sub(r"[Oo]", "0", str(texto or ""))
    match = re.search(r"([\d\.,]+)", bruto)
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


def _premio_maior(awards):
    """Maior prêmio individual da rodada. A literatura de demanda por loteria
    (Lockwood, Allcott, Taubinsky & Sial 2024, Review of Economic Studies) mede
    semi-elasticidade ≈1,7 pro valor esperado do PRÊMIO PRINCIPAL e ≈0 pro
    segundo prêmio — ou seja, o jogador responde ao maior prêmio, não à soma.
    Por isso o maior prêmio vai pro JSON separado do total: "R$8.000 pra 1
    ganhador" e "R$8.000 divididos em 5" são ofertas muito diferentes, e o
    dado desta janela confirma (rodada com 1 ganhador fecha em ~3h; a mesma
    faixa de prêmio dividida em 3-4 ganhadores leva ~12h)."""
    if not awards or not isinstance(awards, list):
        return 0.0
    valores = [_parse_premio_brl(a) for a in awards]
    return max(valores) if valores else 0.0


def montar_rodadas(df_pedidos, sorteios_meta, premio_por_sorteio):
    """1 linha por rodada de sorteio, com tudo que a página Produto precisa
    pra decidir PREÇO / TAMANHO DE PRÊMIO / HORÁRIO da próxima rodada.

    Achado que define a página (2026-10-08, medido nos 363 sorteios da janela
    de 14 dias): 359 de 359 rodadas com status "done" venderam 100% dos 100
    números. Ou seja, **sell-through não é a métrica** deste negócio — toda
    rodada esgota, porque a própria regra do produto é "sorteio após a venda
    de todos os números" (texto da descrição de todos os sorteios). O recurso
    escasso é TEMPO: o que varia é quantas horas uma rodada leva pra fechar
    (mediana 2,3h, de 15min a 166h). Daí `horas_ate_esgotar` e
    `lucro_por_hora` serem os campos centrais — é a medida de giro, não de
    conversão.

    `sequencia_numeros` guarda os números na ORDEM em que foram vendidos. Em
    rodada esgotada a frequência de cada número é sempre 1 (todo número
    vende), então contagem não informa nada — a preferência do jogador
    ("conscious selection", literatura de loteria) só aparece na ORDEM: número
    popular sai no começo, número frio sai no fim e é ele que atrasa o
    fechamento da rodada. O frontend calcula a posição média por número a
    partir desta sequência, pro período filtrado."""
    df = df_pedidos.copy()
    df = df.sort_values("_data_ord")
    df["_dia"] = _dia_negocio(df["_data_ord"].dt.tz_convert(TZ_BRASIL))

    por_produto = df.groupby("ProductId").agg(
        faturamento=("Valor", "sum"),
        pedidos=("Valor", "count"),
        numeros_vendidos=("Quantidade", "sum"),
        primeiro=("_data_ord", "min"),
        ultimo=("_data_ord", "max"),
        maior_pedido=("Valor", "max"),
    )
    compradores = df.groupby("ProductId")["_chave_cliente"].nunique()
    # ordem de venda dos números dentro de cada rodada (df já ordenado por data)
    seq_por_produto = {}
    if "Numeros" in df.columns:
        for pid, grupo in df.groupby("ProductId", sort=False):
            seq = []
            for celula in grupo["Numeros"]:
                if celula:
                    seq.extend([n for n in str(celula).split("|") if n])
            seq_por_produto[pid] = seq

    linhas = []
    for s in sorteios_meta:
        pid = s.get("_id") or s.get("id")
        if not pid or pid not in por_produto.index:
            continue
        row = por_produto.loc[pid]
        nc = s.get("numbersConfig") or {}
        try:
            preco = float(nc.get("price") or 0)
        except (TypeError, ValueError):
            preco = 0.0
        numeros_total = int(nc.get("qty") or 0)
        numeros_pagos = int(nc.get("qtyPaid") or 0)

        criado = pd.to_datetime(s.get("createdAt"), errors="coerce", utc=True)
        if pd.isna(criado):
            criado = row["primeiro"]
        criado_brt = criado.tz_convert(TZ_BRASIL)

        faturamento = round(float(row["faturamento"]), 2)
        premio_total = round(float(premio_por_sorteio.get(pid, 0.0)), 2)
        awards = s.get("awards") if isinstance(s.get("awards"), list) else []
        receita_potencial = round(numeros_total * preco, 2)
        taxa = round(faturamento * TAXA_PLATAFORMA, 2)
        lucro = round(faturamento - taxa - premio_total, 2)

        esgotou = bool(numeros_total and numeros_pagos >= numeros_total)
        horas_vida = (row["ultimo"] - criado).total_seconds() / 3600
        horas_ate_esgotar = round(horas_vida, 3) if (esgotou and horas_vida > 0) else None
        minutos_1o_pedido = (row["primeiro"] - criado).total_seconds() / 60

        linhas.append({
            "product_id": pid,
            "titulo": s.get("title", ""),
            "status": s.get("status", ""),
            "dia": criado_brt.date().isoformat(),
            "criado_em": criado_brt.isoformat(),
            "hora_criacao": int(criado_brt.hour),
            "dia_semana": int(criado_brt.weekday()),  # 0=segunda
            "preco_numero": round(preco, 2),
            "numeros_total": numeros_total,
            "numeros_pagos": numeros_pagos,
            "numeros_reservados": int(nc.get("qtyReserved") or 0),
            "numeros_livres": int(nc.get("qtyFree") or 0),
            "expiracao_reserva_seg": int(nc.get("expirationSeconds") or 0),
            "max_numeros_por_pedido": int(nc.get("max") or 0),
            "esgotou": esgotou,
            "sell_through_pct": round(100 * numeros_pagos / numeros_total, 2) if numeros_total else None,
            "receita_potencial": receita_potencial,
            "faturamento": faturamento,
            "pedidos": int(row["pedidos"]),
            "numeros_vendidos": int(row["numeros_vendidos"]),
            "compradores_unicos": int(compradores.get(pid, 0) or 0),
            "maior_pedido_valor": round(float(row["maior_pedido"]), 2),
            "premio_total": premio_total if premio_total > 0 else None,
            "premio_maior": round(_premio_maior(awards), 2) or None,
            "premios_qtd": len(awards),
            "ganhadores_declarados": len(s.get("winners") or []),
            "porte": _porte_premio(premio_total),
            # payout = fatia da receita POTENCIAL da rodada que volta pro jogador
            # como prêmio. É o "preço efetivo" da literatura de loteria: o custo
            # real pro jogador é preço × (1 − payout). Nesta janela varia de 50%
            # a 89,6% — é o parâmetro de maior dispersão que o operador controla.
            "payout_pct": round(100 * premio_total / receita_potencial, 2) if (receita_potencial > 0 and premio_total > 0) else None,
            "taxa_plataforma": taxa,
            "lucro": lucro,
            "margem_pct": round(100 * lucro / faturamento, 2) if faturamento > 0 else None,
            "horas_ate_esgotar": horas_ate_esgotar,
            "horas_desde_criacao": round(horas_vida, 3) if horas_vida > 0 else None,
            "minutos_1o_pedido": round(minutos_1o_pedido, 1) if minutos_1o_pedido >= 0 else None,
            # giro: lucro gerado por hora que a rodada ficou aberta. Única
            # métrica que compara uma rapidinha de R$3 que fecha em 15min com
            # um jackpot de R$155 que fecha em 3h.
            "lucro_por_hora": round(lucro / horas_ate_esgotar, 2) if (horas_ate_esgotar and horas_ate_esgotar > 0) else None,
            "sequencia_numeros": ",".join(seq_por_produto.get(pid, [])),
        })
    return sorted(linhas, key=lambda x: x["criado_em"], reverse=True)


def montar_pedidos_hora(df_pedidos):
    """flat dia × hora (Brasília) — pedidos e faturamento. Alimenta a curva
    intradiária da página Produto (que horário vende, e com que ticket),
    recalculável no frontend pra qualquer período filtrado."""
    df = df_pedidos.copy()
    local = df["_data_ord"].dt.tz_convert(TZ_BRASIL)
    df["_dia"] = local.dt.date.astype(str)
    df["_hora"] = local.dt.hour
    g = df.groupby(["_dia", "_hora"]).agg(pedidos=("Valor", "count"), faturamento=("Valor", "sum")).reset_index()
    return [
        {"dia": r["_dia"], "hora": int(r["_hora"]), "pedidos": int(r["pedidos"]), "faturamento": round(float(r["faturamento"]), 2)}
        for _, r in g.iterrows()
    ]


def montar_pedidos_perfil(df_pedidos):
    """flat dia × (quantidade de números no pedido) e dia × faixa de valor —
    os dois histogramas da página Produto. Quantidade importa porque a rodada
    permite de 1 a 25 números por pedido (`numbersConfig.min/max`): saber se o
    comprador leva 1 ou 25 é o que diz se o limite de 25 está apertando a
    venda ou não."""
    df = df_pedidos.copy()
    df["_dia"] = _dia_negocio(df["_data_ord"].dt.tz_convert(TZ_BRASIL))

    g1 = df.groupby(["_dia", "Quantidade"]).agg(pedidos=("Valor", "count"), faturamento=("Valor", "sum")).reset_index()
    por_quantidade = [
        {"dia": r["_dia"], "quantidade": int(r["Quantidade"]), "pedidos": int(r["pedidos"]), "faturamento": round(float(r["faturamento"]), 2)}
        for _, r in g1.iterrows()
    ]

    def faixa(v):
        for lo, hi, label in FAIXAS_VALOR_PEDIDO:
            if lo <= v < hi:
                return label
        return FAIXAS_VALOR_PEDIDO[-1][2]

    df["_faixa"] = df["Valor"].apply(faixa)
    g2 = df.groupby(["_dia", "_faixa"]).agg(pedidos=("Valor", "count"), faturamento=("Valor", "sum")).reset_index()
    por_faixa_valor = [
        {"dia": r["_dia"], "faixa": r["_faixa"], "pedidos": int(r["pedidos"]), "faturamento": round(float(r["faturamento"]), 2)}
        for _, r in g2.iterrows()
    ]
    return {
        "por_quantidade_numeros": por_quantidade,
        "por_faixa_valor": por_faixa_valor,
        "faixas_valor_ordem": [label for _, _, label in FAIXAS_VALOR_PEDIDO],
    }


def montar_concentracao(df_pedidos):
    """Curva de Lorenz + Gini da receita por comprador na janela puxada.

    O plano de 90 dias já apontava concentração extrema (85,3% da receita nos
    top 10% de compradores — brief.yaml::dados_90_dias). Aqui medimos de novo
    na janela curta pra acompanhar, e o resultado NÃO é igual (top 10% = ~71%,
    top 20% = ~85% em 14 dias) — é esperado: janela mais curta vê menos
    recompra por cliente, então a cauda parece menos desigual. Os dois números
    são verdadeiros pra janelas diferentes; não substituir um pelo outro.

    Limitação honesta: isto é calculado pra TODA a janela puxada e NÃO responde
    ao filtro de período da página (Gini não é somável por dia; refazer por
    período exigiria mandar o detalhe por comprador × dia, que multiplicaria o
    tamanho do JSON). Mesmo tratamento já dado ao LTV proxy na Executiva."""
    por_cliente = df_pedidos.dropna(subset=["_chave_cliente"]).groupby("_chave_cliente")["Valor"].agg(["sum", "count"])
    if por_cliente.empty:
        return None
    valores = sorted(por_cliente["sum"].tolist())
    total = sum(valores)
    n = len(valores)
    if total <= 0:
        return None

    desc = sorted(valores, reverse=True)
    top_pct = {}
    for p in (1, 5, 10, 20, 50):
        k = max(1, n * p // 100)
        top_pct[f"top{p}"] = {
            "compradores": k,
            "pct_receita": round(100 * sum(desc[:k]) / total, 2),
        }

    lorenz = [{"pct_compradores": 0, "pct_receita": 0.0}]
    passo = max(1, n // 20)
    acumulado = 0.0
    for i, v in enumerate(valores, 1):
        acumulado += v
        if i % passo == 0 or i == n:
            lorenz.append({
                "pct_compradores": round(100 * i / n, 2),
                "pct_receita": round(100 * acumulado / total, 2),
            })

    soma_cumulativa = 0.0
    acumulado = 0.0
    for v in valores:
        acumulado += v
        soma_cumulativa += acumulado
    gini = 1 - 2 * (soma_cumulativa / (n * total)) + 1 / n

    pedidos_por_cliente = sorted(por_cliente["count"].tolist())
    return {
        "compradores": n,
        "receita_total": round(total, 2),
        "receita_media_por_comprador": round(total / n, 2),
        "receita_mediana_por_comprador": round(valores[n // 2], 2),
        "pedidos_medianos_por_comprador": int(pedidos_por_cliente[n // 2]),
        "top_pct": top_pct,
        "lorenz": lorenz,
        "gini": round(gini, 4),
        "nota": (
            "Janela completa puxada — NÃO responde ao filtro de período da página "
            "(Gini não é somável por dia). Compradores identificados por telefone "
            "E164 com fallback pra CPF; pedido sem identidade fica fora da conta."
        ),
    }


def _valor_brl_simples(texto):
    """Parse 'R$ 1.000,00' -> 1000.0. Mesmo padrão de
    client_api.py::_parse_valor_brl, reimplementado aqui pra não precisar
    carregar um SorteiosAPIClient só pra isso."""
    if not texto:
        return 0.0
    match = re.search(r"([\d.,]+)", str(texto))
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


def _numeros_premiados_por_sorteio(sorteios_meta):
    """pid -> {numero: valor_do_premio} a partir de winners[] do produto
    (campo cru da API do cliente, já usado por montar_rodadas pra contar
    ganhadores declarados)."""
    out = {}
    for s in sorteios_meta:
        pid = s.get("_id") or s.get("id")
        winners = s.get("winners") or []
        if not pid or not winners:
            continue
        mapa = {}
        for w in winners:
            num = w.get("number")
            if num:
                mapa[str(num)] = _valor_brl_simples(w.get("award"))
        if mapa:
            out[pid] = mapa
    return out


def _anexar_baixa_manual(df_pedidos, sorteios_meta):
    """Achado 2026-10-17 (pedido do cliente, via founder): "baixa manual" é
    quando um número não vende organicamente até o sorteio fechar, e um
    admin marca o pedido como pago na mão (ApprovedBy="admin", ver
    client_api.py::extrair_linha_pedido) em vez de vir de um gateway real.
    Confirmado ao vivo: 647 números em 10 dias/295 sorteios, 11 casos onde
    o número de baixa manual GANHOU o prêmio do dia.

    Anexa 3 colunas por PEDIDO (não é receita nova — esse valor já está
    dentro de "Valor" hoje, só permite separar na visualização):
      _eh_baixa_manual        bool
      _baixa_manual_numeros   quantidade de números do pedido (se baixa manual, senão 0)
      _baixa_manual_premio    valor do prêmio, SE algum número deste pedido ganhou (senão 0)
    """
    premiados = _numeros_premiados_por_sorteio(sorteios_meta)
    df = df_pedidos.copy()
    eh_baixa = (df.get("ApprovedBy", "") == "admin")
    df["_eh_baixa_manual"] = eh_baixa

    def _qtd_numeros(row):
        if not row["_eh_baixa_manual"]:
            return 0
        nums = str(row.get("Numeros", "") or "")
        return len([n for n in nums.split("|") if n])

    def _premio_ganho(row):
        if not row["_eh_baixa_manual"]:
            return 0.0
        mapa_premio = premiados.get(row.get("ProductId"))
        if not mapa_premio:
            return 0.0
        nums = [n for n in str(row.get("Numeros", "") or "").split("|") if n]
        total = sum(mapa_premio.get(n, 0.0) for n in nums if n in mapa_premio)
        return total

    df["_baixa_manual_numeros"] = df.apply(_qtd_numeros, axis=1)
    df["_baixa_manual_premio"] = df.apply(_premio_ganho, axis=1)
    return df


def _dia_efetivo_por_sorteio(datas_pedido_utc, product_ids, sorteios_meta, dia_fn):
    """Decide o dia de negócio/24h de cada PEDIDO usando a data do SORTEIO
    (drawDate) quando o sorteio já tem essa data definida, caindo pra data
    real da venda enquanto o sorteio ainda está em aberto (sem drawDate).

    Pedido do cliente (Lucas B, via founder, 2026-11-12): o fechamento
    financeiro do dia deve bater com as ações que FECHARAM (foram
    sorteadas) naquele dia — não com a soma bruta de vendas avulsas de
    sorteios abertos no dia anterior que ainda estavam vendendo (achado do
    mesmo dia: rifinhas são tipicamente criadas de 4 a 6 horas antes de
    fechar, então um sorteio sorteado hoje quase sempre foi aberto ontem —
    isso é o ciclo normal, não um erro).

    Escopo DELIBERADAMENTE limitado aos KPIs financeiros que usam esta
    função (`montar_diario`, `montar_sorteios_por_dia`) — as análises de
    canal/UTM/hora/concentração continuam ancoradas na data real da venda,
    porque essas respondem "quando o cliente comprou" (atribuição de
    marketing), não "quando o sorteio fechou" (fechamento financeiro):
    misturar os dois conceitos ali confundiria mais do que ajudaria.
    """
    draw_por_pid = {}
    for s in sorteios_meta or []:
        pid = s.get("_id") or s.get("id")
        dd = s.get("drawDate")
        if dd:
            parsed = pd.to_datetime(dd, errors="coerce", utc=True)
            if pd.notna(parsed):
                draw_por_pid[pid] = parsed
    draw_series = pd.to_datetime(product_ids.map(draw_por_pid), utc=True, errors="coerce")
    data_efetiva_utc = draw_series.where(draw_series.notna(), datas_pedido_utc)
    return dia_fn(data_efetiva_utc.dt.tz_convert(TZ_BRASIL))


def montar_diario(df_pedidos, daily_insights, dia_fn=_dia_negocio, sorteios_meta=None):
    """Pedidos por dia — granular o bastante pra filtro de período no
    dashboard recalcular ROAS/CAC/margem/lucro no FRONTEND sem round-trip
    (pedido 2026-10-07: filtro de data na Visão Executiva). Cada linha traz
    os componentes brutos (não as fórmulas já prontas) pra isso.

    `dia_fn` escolhe a regra de corte do dia: `_dia_negocio` (21h45, padrão)
    ou `_dia_24h` (meia-noite, janela convencional) — pedido 2026-10-17 de
    ver as duas lado a lado na Executiva.

    REVERTIDO 2026-11-13: cheguei a agrupar isto pela data do SORTEIO
    (como `montar_sorteios_por_dia` abaixo), mas o founder/cliente notou
    que isso faz o card "Hoje" misturar venda de ontem (de sorteios que só
    fecham hoje) e esconder venda de hoje (de sorteios que só fecham
    amanhã) — não bate com "quanto entrou de caixa hoje", que é o que os
    cards do topo e este gráfico respondem. Fica na data REAL da venda
    (`_data_ord`), sempre — só `montar_sorteios_por_dia` (o drill-down por
    sorteio) usa a data do sorteio. Os dois podem não bater em soma — isso
    é esperado (um mede caixa do dia, o outro mede sorteios fechados no
    dia) e está anotado no rótulo do drill-down."""
    df = df_pedidos.copy()
    if sorteios_meta is not None:
        df = _anexar_baixa_manual(df, sorteios_meta)
    else:
        df["_eh_baixa_manual"] = False
        df["_baixa_manual_numeros"] = 0
        df["_baixa_manual_premio"] = 0.0
    df["_dia"] = dia_fn(df["_data_ord"].dt.tz_convert(TZ_BRASIL))
    meta_mask = (
        df["Canal_Atribuicao"].str.startswith("UTM: meta", na=False)
        | df["Canal_Atribuicao"].str.startswith("Meta Ads (clique confirmado", na=False)
    )
    novo_mask = meta_mask & (df["Primeira_Compra_Na_Janela"] == True)  # noqa: E712
    rec_mask = meta_mask & (df["Primeira_Compra_Na_Janela"] == False)  # noqa: E712

    g = df.groupby("_dia").agg(
        pedidos=("Valor", "count"),
        faturamento=("Valor", "sum"),
        lucro_estimado=("_lucro_estimado", "sum"),
    )
    g_meta = df[meta_mask].groupby("_dia").agg(meta_pedidos=("Valor", "count"), meta_valor=("Valor", "sum"))
    g_novo = df[novo_mask].groupby("_dia").agg(novo_pedidos=("Valor", "count"), novo_valor=("Valor", "sum"))
    g_rec = df[rec_mask].groupby("_dia").agg(rec_pedidos=("Valor", "count"), rec_valor=("Valor", "sum"))
    # Baixa manual (2026-10-17): números que um admin marcou "pago" na mão
    # em vez de venda real — esse valor JÁ está dentro de "faturamento"
    # acima, aqui só isola pra decompor a barra no frontend.
    g_baixa = df[df["_eh_baixa_manual"]].groupby("_dia").agg(
        baixa_manual_pedidos=("Valor", "count"),
        baixa_manual_valor=("Valor", "sum"),
        baixa_manual_numeros=("_baixa_manual_numeros", "sum"),
        baixa_manual_premio_recuperado=("_baixa_manual_premio", "sum"),
    )
    # soma (não sobrescreve) — múltiplas campanhas podem ter spend no mesmo
    # dia desde 2026-10-07 (achado: BI não pode ficar preso a 1 campanha)
    gasto_por_dia = {}
    for d in daily_insights:
        chave = d.get("date_start")
        gasto_por_dia[chave] = gasto_por_dia.get(chave, 0.0) + float(d.get("spend", 0) or 0)

    out = []
    for dia, row in g.iterrows():
        mrow = g_meta.loc[dia] if dia in g_meta.index else None
        nrow = g_novo.loc[dia] if dia in g_novo.index else None
        rrow = g_rec.loc[dia] if dia in g_rec.index else None
        brow = g_baixa.loc[dia] if dia in g_baixa.index else None
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
            "baixa_manual_pedidos": int(brow["baixa_manual_pedidos"]) if brow is not None else 0,
            "baixa_manual_valor": round(float(brow["baixa_manual_valor"]), 2) if brow is not None else 0.0,
            "baixa_manual_numeros": int(brow["baixa_manual_numeros"]) if brow is not None else 0,
            "baixa_manual_premio_recuperado": round(float(brow["baixa_manual_premio_recuperado"]), 2) if brow is not None else 0.0,
        })
    return sorted(out, key=lambda x: x["dia"])


def _totais_por_sorteio(df_pedidos, sorteios_meta, premio_por_sorteio):
    """1 linha por sorteio com os TOTAIS (não a fatia de 1 dia) — faturamento,
    vendas, baixa manual (qtd/valor/prêmio recuperado) e as datas de
    lançamento/resultado. Pedido 2026-10-17 (founder, tabela detalhada de
    auditoria em 'Lucro'): a expansão por dia precisa mostrar a economia
    INTEIRA do sorteio, não só a fatia que caiu naquele dia — mesmo
    raciocínio que `valor_premio` já usava (custo único, não rateado)."""
    df = _anexar_baixa_manual(df_pedidos, sorteios_meta)
    df["_valor_baixa_manual"] = df["Valor"].where(df["_eh_baixa_manual"], 0.0)
    g = df.groupby("ProductId").agg(
        pedidos=("Valor", "count"),
        faturamento=("Valor", "sum"),
        baixa_manual_numeros=("_baixa_manual_numeros", "sum"),
        baixa_manual_valor=("_valor_baixa_manual", "sum"),
        baixa_manual_premio_recuperado=("_baixa_manual_premio", "sum"),
    )
    datas = {(s.get("_id") or s.get("id")): (s.get("createdAt") or "", s.get("drawDate") or "") for s in sorteios_meta}
    out = {}
    for pid, row in g.iterrows():
        faturamento = float(row["faturamento"])
        premio = float(premio_por_sorteio.get(pid, 0.0))
        premio_recuperado = float(row["baixa_manual_premio_recuperado"])
        lucro_bruto = faturamento - premio + premio_recuperado
        taxa_plataforma = faturamento * TAXA_PLATAFORMA
        criado_em, sorteado_em = datas.get(pid, ("", ""))
        out[pid] = {
            "faturamento_total_sorteio": round(faturamento, 2),
            "pedidos_total_sorteio": int(row["pedidos"]),
            "baixa_manual_numeros_total": int(row["baixa_manual_numeros"]),
            "baixa_manual_valor_total": round(float(row["baixa_manual_valor"]), 2),
            "baixa_manual_premio_recuperado_total": round(premio_recuperado, 2),
            "lucro_bruto_total": round(lucro_bruto, 2),
            "taxa_plataforma_total": round(taxa_plataforma, 2),
            "margem_contribuicao_total": round(lucro_bruto - taxa_plataforma, 2),
            "criado_em": criado_em,
            "sorteado_em": sorteado_em,
        }
    return out


def montar_sorteios_por_dia(df_pedidos, sorteios_meta, premio_por_sorteio):
    """dia -> lista de sorteios AGRUPADOS pelo dia em que fecharam (foram
    sorteados) — alimenta o clique de expansão do dia no gráfico
    'Faturamento do site por dia' E a auditoria do card 'Lucro do site'
    (pedido 2026-10-07: founder quer ver faturamento + custo de prêmio
    identificado, por sorteio, pra conferir a conta do lucro).

    ATUALIZADO 2026-11-12 (pedido do cliente via founder): cada sorteio
    agora cai INTEIRO no dia do seu `drawDate` (via `_dia_efetivo_por_sorteio`),
    não mais fatiado pelos dias em que teve venda — antes, um sorteio aberto
    num dia e vendendo por vários dias aparecia em cada um deles com só a
    fatia daquele dia; isso inflava a contagem de "sorteios do dia" com
    sorteios antigos ainda vendendo, o que gerou a discrepância que o
    cliente reportou (contagem manual de rifinhas abertas no dia batendo
    diferente do "Total de sorteios" daqui). Enquanto o sorteio não tem
    `drawDate` ainda (está em aberto), cai no dia real da venda — por isso
    ainda pode haver mais de 1 linha por `product_id` num mesmo dia nesse
    caso transitório; uma vez sorteado, tudo migra pro dia do resultado.
    `valor_premio` aqui é o prêmio TOTAL do sorteio (custo único, pago
    quando o sorteio é sorteado) e `faturamento`/`lucro_estimado` agora
    tendem a bater com os totais do sorteio inteiro (`faturamento_total_sorteio`
    etc.), já que não há mais fatiamento real por dia na maioria dos casos.

    Enquanto o sorteio ainda não tem `drawDate`, fica no dia real da venda
    em calendário puro também (sem parâmetro pra escolher — ver abaixo por
    quê). O FECHAMENTO em si (quando o sorteio já tem `drawDate`) usa
    SEMPRE calendário puro (meia-noite, `_dia_24h`), nunca o corte de
    negócio — CORRIGIDO 2026-11-13 (cliente, via founder): o corte
    de negócio existe pra decidir a que dia de CAIXA uma VENDA pertence
    (pedido pago às 21:50 é "dia seguinte" pro caixa), mas não faz sentido
    pro FECHAMENTO do sorteio em si — um sorteio sorteado às 22h ainda é,
    no calendário, o mesmo dia em que fechou; aplicar o corte de negócio
    nessa data fazia sorteios fechados à noite "pularem" pro dia seguinte
    na tabela, o que não bate com a realidade (confirmado comparando com a
    janela 24h, que não tem esse problema). Carrega também baixa_manual por
    sorteio/dia (2026-10-17) — mesma definição de `montar_diario`
    (ApprovedBy="admin"), além dos TOTAIS do sorteio inteiro
    (`_totais_por_sorteio`) pra tabela de auditoria."""
    titulos = {(s.get("_id") or s.get("id")): s.get("title", "") for s in sorteios_meta}
    totais = _totais_por_sorteio(df_pedidos, sorteios_meta, premio_por_sorteio)
    df = df_pedidos.copy()
    df = _anexar_baixa_manual(df, sorteios_meta)
    df["_dia"] = _dia_efetivo_por_sorteio(df["_data_ord"], df["ProductId"], sorteios_meta, _dia_24h)
    df["_valor_baixa_manual"] = df["Valor"].where(df["_eh_baixa_manual"], 0.0)
    g = df.groupby(["_dia", "ProductId"]).agg(
        pedidos=("Valor", "count"),
        faturamento=("Valor", "sum"),
        lucro_estimado=("_lucro_estimado", "sum"),
        baixa_manual_numeros=("_baixa_manual_numeros", "sum"),
        baixa_manual_valor=("_valor_baixa_manual", "sum"),
        baixa_manual_premio_recuperado=("_baixa_manual_premio", "sum"),
    ).reset_index()

    out = {}
    for _, row in g.iterrows():
        pid = row["ProductId"]
        premio = premio_por_sorteio.get(pid, 0.0)
        tot = totais.get(pid, {})
        out.setdefault(row["_dia"], []).append({
            "product_id": pid,
            "titulo": titulos.get(pid, pid),
            "pedidos": int(row["pedidos"]),
            "faturamento": round(float(row["faturamento"]), 2),
            "lucro_estimado": round(float(row["lucro_estimado"]), 2),
            "valor_premio": round(float(premio), 2) if premio > 0 else None,
            "baixa_manual_numeros": int(row["baixa_manual_numeros"]),
            "baixa_manual_valor": round(float(row["baixa_manual_valor"]), 2),
            "baixa_manual_premio_recuperado": round(float(row["baixa_manual_premio_recuperado"]), 2),
            # Totais do sorteio INTEIRO (não a fatia do dia) — tabela de
            # auditoria pedida 2026-10-17: faturamento total, vendas totais,
            # baixa manual total, lucro bruto, taxa plataforma e margem de
            # contribuição já prontos pro frontend, mais as datas pra
            # ordenar por lançamento/resultado em vez de por valor.
            "faturamento_total_sorteio": tot.get("faturamento_total_sorteio", round(float(row["faturamento"]), 2)),
            "pedidos_total_sorteio": tot.get("pedidos_total_sorteio", int(row["pedidos"])),
            "baixa_manual_numeros_total": tot.get("baixa_manual_numeros_total", int(row["baixa_manual_numeros"])),
            "baixa_manual_valor_total": tot.get("baixa_manual_valor_total", round(float(row["baixa_manual_valor"]), 2)),
            "baixa_manual_premio_recuperado_total": tot.get("baixa_manual_premio_recuperado_total", round(float(row["baixa_manual_premio_recuperado"]), 2)),
            "lucro_bruto_total": tot.get("lucro_bruto_total"),
            "taxa_plataforma_total": tot.get("taxa_plataforma_total"),
            "margem_contribuicao_total": tot.get("margem_contribuicao_total"),
            "criado_em": tot.get("criado_em", ""),
            "sorteado_em": tot.get("sorteado_em", ""),
        })
    for dia in out:
        out[dia] = sorted(out[dia], key=lambda x: (x["criado_em"] or "", x["sorteado_em"] or ""))
    return out


def montar_ltv_cohort(df_pedidos, meta_ads_df, dias):
    """LTV proxy (pesquisa bi-arquitetura-profissional.md seção 3): coorte =
    clientes cuja 1a compra na janela veio de Meta Ads; LTV proxy = valor
    total que essa coorte gastou (em QUALQUER canal) dentro da mesma
    janela, dividido pelo tamanho da coorte. Limitação honesta: isso NÃO é
    LTV real — é limitado à janela de `dias` puxada. Quanto maior --dias,
    mais próximo do real, nunca exato sem histórico completo por cliente."""
    cohort_mask = meta_ads_df["Primeira_Compra_Na_Janela"] == True  # noqa: E712
    cohort_chaves = set(meta_ads_df.loc[cohort_mask, "_chave_cliente"].dropna())
    if not cohort_chaves:
        return {
            "cohort_tamanho": 0, "valor_total_cohort": 0.0, "ltv_proxy": 0.0,
            "janela_dias": dias,
            "nota": "Sem clientes novos via Meta Ads nesta janela/período de campanha.",
        }
    cohort_pedidos = df_pedidos[df_pedidos["_chave_cliente"].isin(cohort_chaves)]
    valor_total = float(cohort_pedidos["Valor"].sum())
    return {
        "cohort_tamanho": len(cohort_chaves),
        "valor_total_cohort": round(valor_total, 2),
        "ltv_proxy": round(valor_total / len(cohort_chaves), 2),
        "janela_dias": dias,
        "nota": (
            f"Proxy limitado à janela de {dias} dias — não é LTV real "
            "(precisaria de histórico maior pra capturar recompra de longo "
            "prazo). Aumentar --dias aproxima do real."
        ),
    }


def calcular_kpis_financeiros(df_pedidos, meta_ads_df, novo_df, recorrente_df, daily_insights, dias, campanha_inicio_ts):
    """KPIs financeiros nível CEO — fórmulas de
    bi-arquitetura-profissional.md seção 3. Tudo escopado ao período da
    campanha (campanha_inicio_ts em diante) pra nunca repetir o erro de
    comparar gasto de N dias contra receita de uma janela maior (achado
    2026-10-07)."""
    gasto_campanha = sum(float(d.get("spend", 0) or 0) for d in daily_insights)
    periodo_df = df_pedidos[df_pedidos["_data_ord"] >= campanha_inicio_ts]
    faturamento_periodo = float(periodo_df["Valor"].sum())
    valor_meta_ads = float(meta_ads_df["Valor"].sum())
    margem_pct = carregar_margem_pct()

    n_novo = len(novo_df)
    valor_novo = float(novo_df["Valor"].sum())
    cac_novo_cliente = (gasto_campanha / n_novo) if n_novo > 0 else None
    ticket_medio_novo = (valor_novo / n_novo) if n_novo > 0 else None

    ltv = montar_ltv_cohort(df_pedidos, meta_ads_df, dias)

    # Lucro REAL do negócio (não confundir com "margem_contribuicao_campanha"
    # abaixo, que é só da fatia atribuída a Ads) — faturamento do site inteiro
    # no período, menos o custo de prêmio dos sorteios que tiveram pedido
    # nesse período. Pedido explícito do founder 2026-10-07: "se levarmos em
    # consideração faturamento hoje descontando prêmios já encerrados e
    # pagos, era pra estarmos positivos" — eram duas métricas diferentes
    # sendo confundidas; esta é a que ele queria ver.
    lucro_negocio_periodo = float(periodo_df["_lucro_estimado"].sum()) if "_lucro_estimado" in periodo_df else None
    # Taxa da plataforma como DEDUÇÃO EXPLÍCITA em cima do lucro só-prêmio
    # acima (ver comentário de TAXA_PLATAFORMA) — não embutida/escondida.
    taxa_plataforma_periodo = round(faturamento_periodo * TAXA_PLATAFORMA, 2)
    lucro_negocio_periodo_apos_taxa = (
        round(lucro_negocio_periodo - taxa_plataforma_periodo, 2)
        if lucro_negocio_periodo is not None else None
    )

    return {
        "gasto_campanha_periodo": round(gasto_campanha, 2),
        "faturamento_total_periodo": round(faturamento_periodo, 2),
        "valor_atribuido_meta_ads_periodo": round(valor_meta_ads, 2),
        "lucro_negocio_periodo": round(lucro_negocio_periodo, 2) if lucro_negocio_periodo is not None else None,
        "taxa_plataforma_pct": TAXA_PLATAFORMA,
        "taxa_plataforma_periodo": taxa_plataforma_periodo,
        "lucro_negocio_periodo_apos_taxa": lucro_negocio_periodo_apos_taxa,
        "nota_lucro_negocio": (
            "Faturamento do site inteiro (todos os canais) dentro do período da "
            "campanha, menos o custo de prêmio dos sorteios que tiveram pedido "
            "nesse período (rateado proporcionalmente por pedido dentro do "
            "sorteio). Sorteio sem valor de prêmio identificável no título/campo "
            "awards entra SEM desconto — não inventamos custo que a API não "
            "informa — então este número tende a ser um teto otimista, nunca "
            "subestimado às escondidas. Diferente de 'Margem de contribuição da "
            "campanha' abaixo, que só olha a fatia de receita atribuída a Ads. "
            f"'lucro_negocio_periodo' acima é SÓ após prêmio (bate com o "
            f"drill-down 'Auditar por sorteio'). 'lucro_negocio_periodo_apos_taxa' "
            f"desconta TAMBÉM a taxa da plataforma ({TAXA_PLATAFORMA*100:.0f}% do "
            f"faturamento = R$ {taxa_plataforma_periodo:,.2f} neste período) — "
            f"use este último pra lucro real do negócio."
        ),
        "margem_contribuicao_pct": margem_pct,
        "cac_novo_cliente": round(cac_novo_cliente, 2) if cac_novo_cliente is not None else None,
        "ticket_medio_novo_cliente": round(ticket_medio_novo, 2) if ticket_medio_novo is not None else None,
        # CAC_max — fórmula da ADAPTAÇÃO PRO NICHO DE SORTEIOS
        # (docs/meta_mba/PLANEJAMENTO_ESTRATEGICO_90DIAS.md seção 2, NÃO o
        # diagrama genérico do Módulo 01 raiz — são fórmulas diferentes e a
        # do plano de 90 dias é a que vale pra este cliente). Lá:
        # CAC_max = MC - (Faturamento x %ML_desejada), e é um TETO DE
        # ORÇAMENTO TOTAL DE MÍDIA pro período (não um CAC por cliente —
        # só vira por-cliente se dividir pela meta de clientes novos, que
        # não temos definida). %ML (meta de margem líquida) é decisão do
        # cliente ainda pendente (10% vs 15%, ver brief.yaml gate_0) —
        # por isso calculamos os 2 cenários, igual a tabela do próprio doc.
        "cac_max_orcamento_total": {
            "ml_15pct": round((faturamento_periodo * margem_pct) - (faturamento_periodo * 0.15), 2),
            "ml_10pct": round((faturamento_periodo * margem_pct) - (faturamento_periodo * 0.10), 2),
        },
        "nota_cac_max": (
            "CAC_max aqui é orçamento TOTAL de mídia aceitável no período "
            "(site inteiro), não por cliente — fórmula de "
            "PLANEJAMENTO_ESTRATEGICO_90DIAS.md seção 2, não do diagrama "
            "genérico do Módulo 01. Depende da meta de margem líquida "
            "(%ML), ainda pendente de decisão com o cliente — por isso "
            "mostramos os 2 cenários (10% e 15%) em vez de 1 número."
        ),
        "mer_blended": round(faturamento_periodo / gasto_campanha, 2) if gasto_campanha > 0 else None,
        "nota_mer": (
            "MER blended aqui compara TODO o faturamento do site (majoritariamente "
            "orgânico/grupo, sem relação com este anúncio específico) contra o gasto "
            "de só esta campanha — número tende a ficar artificialmente alto enquanto "
            "a mídia paga for pequena perto do volume orgânico do negócio. Só fica "
            "um sinal de eficiência real quando o gasto em mídia paga for uma fatia "
            "significativa do motor de receita. Usar roas_atribuido como referência "
            "principal por enquanto, não este campo."
        ),
        "roas_atribuido": round(valor_meta_ads / gasto_campanha, 2) if gasto_campanha > 0 else None,
        "roas_blended": round(faturamento_periodo / gasto_campanha, 2) if gasto_campanha > 0 else None,
        "margem_contribuicao_campanha": round((valor_meta_ads * margem_pct) - gasto_campanha, 2) if gasto_campanha > 0 else None,
        "payback_em_sorteios": (
            round(cac_novo_cliente / ticket_medio_novo, 2)
            if cac_novo_cliente is not None and ticket_medio_novo not in (None, 0) else None
        ),
        "ltv_proxy": ltv,
        "ltv_cac_ratio": (
            round(ltv["ltv_proxy"] / cac_novo_cliente, 2)
            if cac_novo_cliente not in (None, 0) and ltv["ltv_proxy"] > 0 else None
        ),
        "nota_ltv_cac_benchmark": (
            "Benchmark de mercado 'LTV:CAC >= 3:1' é prática comum de SaaS/"
            "e-commerce recorrente — não necessariamente aplicável a um "
            "negócio de sorteio de ticket baixo. Usar como referência, não "
            "meta rígida, até termos histórico suficiente pra calibrar."
        ),
    }


# ----------------------------------------------- cruzamentos de UTM (2026-10-16)
# 3 cruzamentos pedidos pelo founder depois que UTM de grupo (WhatsApp) e de
# anúncio (Meta, via catálogo) passaram a ter volume real — ver
# PONTO 1 (reconciliação por campanha, implementado só no frontend de
# operacional.html, reaproveitando ads_diario/utm_diario já existentes),
# PONTO 2 (esta função) e PONTO 3 (montar_direto_desconhecido_diario abaixo).

def validar_sinal_fraco_com_utm(df_pedidos):
    """PONTO 2 — dentro do balde 'Meta (pixel, sem clique confirmado)' com
    fbp fresco (<24h, a fatia de maior confiança identificada em
    `_refinar_canal_sinal_fraco`), quantos pedidos TAMBÉM têm UTM_Source
    apontando pra Meta (fb/ig/meta)? Se a fração for alta, reforça que essa
    fatia de alta confiança é mesmo Meta Ads — não substitui o sinal de
    fbc/clique, só soma mais um indício independente em cima do que já
    tínhamos (idade do fbp)."""
    mask_sinal_fraco = df_pedidos["Canal_Atribuicao"].str.startswith("Meta (pixel", na=False)
    sub = df_pedidos[mask_sinal_fraco]
    if sub.empty:
        return {"total_fresco": 0, "com_utm_confirmando_meta": 0, "pct": None}

    idades = sub.apply(lambda r: _fbp_idade_horas(r.get("Fbp"), r["_data_ord"]), axis=1)
    fresco = sub[idades.notna() & (idades < 24)]
    if fresco.empty:
        return {"total_fresco": 0, "com_utm_confirmando_meta": 0, "pct": None}

    utm_meta_mask = fresco["UTM_Source"].fillna("").str.lower().isin(["fb", "ig", "meta", "facebook", "instagram"])
    com_utm = int(utm_meta_mask.sum())
    total = len(fresco)
    return {
        "total_fresco": total,
        "com_utm_confirmando_meta": com_utm,
        "pct": round(100 * com_utm / total, 1) if total else None,
    }


def montar_direto_desconhecido_diario(df_pedidos):
    """PONTO 3 — série temporal (por dia) do tamanho do canal 'Direto/
    Orgânico/Desconhecido', pra acompanhar ao longo do tempo se ele encolhe
    conforme a UTM do WhatsApp amadurece (confirmaria a leitura de ITP do
    iOS já registrada em `montar_qualidade`) ou fica estável/cresce (sinal
    de que tem outra coisa acontecendo, precisaria investigar de novo). Não
    conclui nada aqui — só deixa a série visível pra acompanhamento."""
    df = df_pedidos.copy()
    df["_dia"] = _dia_negocio(df["_data_ord"].dt.tz_convert(TZ_BRASIL))
    total_por_dia = df.groupby("_dia").size()
    direto_mask = df["Canal_Atribuicao"] == "Direto/Orgânico/Desconhecido"
    direto_por_dia = df[direto_mask].groupby("_dia").size()
    out = []
    for dia, total in total_por_dia.items():
        direto = int(direto_por_dia.get(dia, 0))
        out.append({
            "dia": dia,
            "pedidos_direto": direto,
            "pedidos_total": int(total),
            "pct": round(100 * direto / total, 2) if total else 0,
        })
    return sorted(out, key=lambda x: x["dia"])


def montar_qualidade(df_pedidos):
    """Página 'Qualidade de Dados & Funil' (4a página, justificada em
    bi-arquitetura-profissional.md seção 2.4) — prova de que o tracking
    está funcionando, não dado de negócio. Lê os próprios logs/checkpoints
    dos scripts de correção (capi_realtime.ps1, BI-Imperio-Refresh)."""
    total = len(df_pedidos)
    com_utm = int((df_pedidos["UTM_Source"].fillna("") != "").sum())

    fbc_fresco = int(df_pedidos["Canal_Atribuicao"].str.contains("clique confirmado", na=False).sum())
    fbc_expirado = int(df_pedidos["Canal_Atribuicao"].str.contains("fbc expirado", na=False).sum())

    capi_status = {"ultima_execucao": None, "eventos_no_checkpoint": None, "log_tail": []}
    log_path = os.path.join(ROOT, "capi_realtime.log")
    checkpoint_path = os.path.join(ROOT, "capi_sent_ids_3dias.json")
    if os.path.exists(log_path):
        mtime = datetime.fromtimestamp(os.path.getmtime(log_path))
        capi_status["ultima_execucao"] = mtime.isoformat()
        with open(log_path, encoding="utf-8") as f:
            linhas = f.readlines()
        capi_status["log_tail"] = [l.strip() for l in linhas[-15:]]
    if os.path.exists(checkpoint_path):
        with open(checkpoint_path, encoding="utf-8") as f:
            capi_status["eventos_no_checkpoint"] = len(json.load(f))

    bi_refresh_status = {"ultima_execucao": None, "log_tail": []}
    bi_log_path = os.path.join(ROOT, "..", "..", "..", "apps", "BI", "imperio-premios", "refresh.log")
    if os.path.exists(bi_log_path):
        mtime = datetime.fromtimestamp(os.path.getmtime(bi_log_path))
        bi_refresh_status["ultima_execucao"] = mtime.isoformat()
        with open(bi_log_path, encoding="utf-8") as f:
            linhas = f.readlines()
        bi_refresh_status["log_tail"] = [l.strip() for l in linhas[-10:]]

    # Checklist das pendências do Events Manager — manual por ora (sem API
    # pra isso, ver bi-arquitetura-profissional.md 2.4). Atualizar aqui
    # conforme formos resolvendo mais itens da aba "Ações". Revisado por
    # completo em 2026-10-08 (achados do dia, ver auditoria-tracking-bi-
    # 2026-10-08.md e gates-status.yaml) — itens confirmados em 2026-10-07
    # sem re-checagem ao vivo hoje ficam marcados explicitamente como tal
    # em vez de repetir o número antigo como se fosse atual.
    pendencias_events_manager = [
        {"item": "fbc expirado (CAPI nativa)", "status": "resolvido_por_nos", "data": "2026-10-07",
         "nota": "capi_client.py omite fbc >7 dias; 2.317 eventos reenviados corretos, automatizado a cada 15min. Não reconfirmado ao vivo nesta atualização."},
        {"item": "Deduplicação de evento (Compra)", "status": "ja_estava_ok", "data": "2026-10-07",
         "nota": "99,69% via event_id, confirmado via prints do Events Manager em 2026-10-07. Não reconfirmado ao vivo nesta atualização (precisa de acesso live ao Events Manager)."},
        {"item": "Cobertura de eventos (CAPI, Compra)", "status": "ja_estava_ok", "data": "2026-10-07",
         "nota": "100% confirmado em 2026-10-07. Não reconfirmado ao vivo nesta atualização."},
        {"item": "Qualidade de correspondência (EMQ, Compra)", "status": "em_validacao", "data": "2026-10-07",
         "nota": "Era 9,3/10 na manhã de 2026-10-07; caiu pra 7,0/10 à tarde por um bug nosso (collector.py desalinhava o CSV ao adicionar a coluna UserId, 8 ciclos sem enviar Nome/Sobrenome/País). Bug corrigido e backlog represado reenviado no mesmo dia — EMQ deve voltar a subir nos ciclos seguintes, mas isso não foi reconfirmado ao vivo no Events Manager nesta atualização. Não repetir '9,3/10' como valor atual sem checar."},
        {"item": "InitiateCheckout — dedup via EventId do pedido", "status": "em_validacao", "data": "2026-10-08",
         "nota": "Tarefa agendada foi pausada por engano mais cedo hoje (suspeita de causa raiz que se mostrou incorreta) e reativada no mesmo dia depois de confirmar que o mecanismo (event_id = EventId do pedido, mesmo id usado pelo navegador) estava certo desde o início — 105 eventos represados reenviados com sucesso, nenhum dado perdido. Cobertura de desduplicação no Events Manager ainda não confirmada com volume pós-fix suficiente (amostra de hoje ainda carrega período anterior ao script) — próxima checagem em alguns dias, não-bloqueante."},
        {"item": "Compra (capi_client.py) — event_id passou a usar EventId", "status": "em_validacao", "data": "2026-10-08",
         "nota": "Mudado de event_id=OrderId para event_id=EventId (mesma lógica já validada no InitiateCheckout), incluindo fix no send_backlog.py (NaN de EventId vazio quebrava o fallback para OrderId). Testado em código com 2 casos reais (pedido com EventId e pedido antigo sem EventId). Ainda não totalmente validado no Events Manager — precisa de dias de volume novo para a métrica de desduplicação refletir o fix."},
        {"item": "UTM — captura via webhook (order.paid real)", "status": "resolvido_por_nos", "data": "2026-10-07",
         "nota": "Causa raiz do UTM zerado era a landing page não repassar a query string pro destino — corrigido na LP. Complementar: o webhook apps/webhook-imperio-capi agora captura params.utmSource/etc no pedido real e grava na tabela pedido_utm (Supabase), com join em bi_aggregator.py::enriquecer_com_utm_webhook(). O card de '% com UTM' abaixo é de PEDIDOS, majoritariamente anteriores a essas correções — vai subir de forma gradual nos próximos dias/semanas conforme pedidos novos passam pelos dois mecanismos, não é um número que deveria ficar parado."},
        {"item": "'Web Conversions API' (order_id padrão EII1|...) ainda aparece em Compras recentes", "status": "pendente", "data": None,
         "nota": "ACHADO NOVO, NÃO RESOLVIDO: o recurso nativo do Meta ('Web Conversions API', toggle de auto-conexão) foi removido pelo founder em 2026-10-07 após gerar Compras fantasma (sem pedido real correspondente). Amostras reais de hoje ainda mostram order_id no formato 'EII1|AQAAUP4...' — o mesmo padrão — em várias Compras recentes. Ou o recurso não foi de fato desativado por completo, ou outra fonte está gerando o mesmo padrão. Precisa de investigação direta no Events Manager antes de considerar fechado."},
        {"item": "Domínios não verificados", "status": "pendente", "data": "2026-10-22",
         "nota": "imperiopremioss.com.br, sndflw.com, brunaodaimperio.com (achado original) + rapidinhas24hr.com (domínio novo da plataforma, ainda não checado em Configurações de Marca) — verificar os 4."},
        {"item": "Troca de domínio da plataforma (imperiopremioss.com -> rapidinhas24hr.com)", "status": "em_validacao", "data": "2026-10-22",
         "nota": "Founder avisou a troca. Confirmado via DNS que o domínio antigo está morto (api.imperiopremioss.com = NXDOMAIN). CORRIGIDO NO NOSSO CÓDIGO: client_api.py (base_url, testado ao vivo — login+get_sorteios OK no domínio novo), bi_aggregator.py (SITE_SUFIXOS aceita os dois domínios), capi_client.py/capi_initiatecheckout.py/webhook order-paid.js (event_source_url), LPs (apps/imperio-premios-lp/*, link direto pro site + catalogo.html que monta URL de campanha), utm-capture-imperio/api/capture.js (CORS). AINDA PENDENTE (fora do nosso controle via código, precisa de ação no console): GTM (triggers de host podem estar presos ao domínio antigo — auditoria em andamento) e verificação do domínio novo em Configurações de Marca."},
        {"item": "IPv4 -> IPv6 no Purchase", "status": "pendente_baixa_prioridade", "data": None, "nota": None},
        {"item": "Facebook Login ID / PII extra", "status": "pendente_baixa_prioridade", "data": None, "nota": None},
    ]

    utm_nota = (
        "Pedidos somados aqui são majoritariamente anteriores à correção de "
        "UTM (LP + webhook, 2026-10-07/08) — ver pendência 'UTM — captura via "
        "webhook' na tabela abaixo. Este percentual deve subir de forma gradual, não "
        "é esperado ficar estático."
    )

    # Investigação 2026-10-15 (pedido do founder: "Direto/Orgânico/
    # Desconhecido" é Meta Ads ou grupo disfarçado?): por definição de
    # _classificar_canal (client_api.py), este canal já significa "nem fbc,
    # nem gclid/ttclid, nem UTM, nem fbp" — então 0% de sinal nos 4 campos é
    # estrutural, não achado. O que de fato precisava verificação era o
    # perfil de dispositivo. Calculado ao vivo (não hardcoded) pra não
    # repetir número de uma amostra de 3 dias como se fosse o atual.
    direto_mask = df_pedidos["Canal_Atribuicao"] == "Direto/Orgânico/Desconhecido"
    n_direto = int(direto_mask.sum())
    pct_ios_direto = None
    if n_direto > 0:
        ua_direto = df_pedidos.loc[direto_mask, "UserAgent"].fillna("")
        n_ios = int(ua_direto.str.contains("iPhone|iPad", case=False, regex=True, na=False).sum())
        pct_ios_direto = round(100 * n_ios / n_direto, 1)

    pendencias_events_manager.append({
        "item": "Direto/Orgânico/Desconhecido — é Meta Ads ou grupo disfarçado?",
        "status": "investigado_nao_e_canal_oculto",
        "data": "2026-10-15",
        "nota": (
            f"Investigado a pedido do founder, agora que WhatsApp e catálogo "
            f"estão bem trackeados (menos 'sobra' pra explicar). Por definição "
            f"este canal já é 0% fbp/fbc/UTM/gclid/ttclid (é o fallback final "
            f"de _classificar_canal, não achado novo). O que FOI checado: "
            f"perfil de dispositivo — {pct_ios_direto if pct_ios_direto is not None else '—'}% "
            f"iOS (iPhone/iPad) em {n_direto} pedido(s) neste canal na janela "
            f"atual, visivelmente diferente do mix majoritariamente Android dos "
            f"canais confirmados (UTM: whatsapp, Meta Ads confirmado). Leitura "
            f"mais defensável: ITP do Safari/iOS (ou webview in-app) apagando "
            f"fbp/fbc antes do pixel registrar — limitação de navegador, não "
            f"uma 3ª origem de tráfego escondida. NÃO reclassificar estes "
            f"pedidos pra grupo ou Meta Ads sem evidência nova."
        ),
    })

    return {
        "utm": {"total_pedidos": total, "com_utm": com_utm, "pct": round(100 * com_utm / total, 2) if total else 0,
                "nota": utm_nota},
        "fbc": {"fresco": fbc_fresco, "expirado": fbc_expirado},
        "capi_realtime_status": capi_status,
        "bi_refresh_status": bi_refresh_status,
        "pendencias_events_manager": pendencias_events_manager,
        # PONTO 3 (2026-10-16) — série diária de "Direto/Orgânico/Desconhecido"
        # pra acompanhar se encolhe conforme a UTM do WhatsApp amadurece.
        "direto_desconhecido_diario": montar_direto_desconhecido_diario(df_pedidos),
    }


def montar_snapshot(dias, daily_insights, by_ad, pixel_funnel, df_pedidos, sorteios_meta, premio_por_sorteio, campanhas, pixel_funnel_host=None):
    meta_ads_df_full = df_pedidos[
        df_pedidos["Canal_Atribuicao"].str.startswith("UTM: meta", na=False)
        | df_pedidos["Canal_Atribuicao"].str.startswith("Meta Ads (clique confirmado", na=False)
    ]
    # CRÍTICO: nunca comparar gasto da campanha (que só existe a partir de
    # CAMPANHA_INICIO) contra pedidos de uma janela maior — isso infla ROAS
    # artificialmente somando pedidos de antes da campanha existir (achado
    # 2026-10-07, mesmo bug de fundo do dropdown "Enviar sempre"). Toda
    # métrica de ROAS/novo-vs-recorrente usa só o recorte pós-início.
    campanha_inicio_ts = pd.Timestamp(CAMPANHA_INICIO, tz="UTC")
    meta_ads_df = meta_ads_df_full[meta_ads_df_full["_data_ord"] >= campanha_inicio_ts]

    novo_df = meta_ads_df[meta_ads_df["Primeira_Compra_Na_Janela"] == True]  # noqa: E712
    recorrente_df = meta_ads_df[meta_ads_df["Primeira_Compra_Na_Janela"] == False]  # noqa: E712

    kpis = calcular_kpis_financeiros(df_pedidos, meta_ads_df, novo_df, recorrente_df, daily_insights, dias, campanha_inicio_ts)

    canal_counts = df_pedidos["Canal_Atribuicao"].value_counts().to_dict()
    canal_valor = df_pedidos.groupby("Canal_Atribuicao")["Valor"].sum().to_dict()

    def _linha_ad(ad, ins):
        actions = {a["action_type"]: a["value"] for a in ins.get("actions", [])} if ins else {}
        action_values = {a["action_type"]: a["value"] for a in ins.get("action_values", [])} if ins else {}
        return {
            "spend": float(ins.get("spend", 0) or 0),
            "impressions": int(ins.get("impressions", 0) or 0),
            "clicks": int(ins.get("clicks", 0) or 0),
            "purchases": int(actions.get("purchase", 0) or 0),
            "purchase_value": float(action_values.get("purchase", 0) or 0),
        }

    ads_resumo = []  # acumulado (todo o histórico do anúncio) — visão rápida
    ads_diario = []  # flat dia×anúncio — pro filtro de período recalcular no frontend
    for ad in by_ad:
        creative = ad.get("creative") or {}
        criativo = {
            "thumbnail_url": creative.get("thumbnail_url") or creative.get("image_url"),
            "tipo": "video" if creative.get("video_id") else (creative.get("object_type") or "image"),
            "video_id": creative.get("video_id"),
            "image_url": creative.get("image_url"),
            "preview_html": creative.get("preview_html"),
        }
        dias_ad = ad.get("insights_diario") or []
        acumulado = {"spend": 0.0, "impressions": 0, "clicks": 0, "purchases": 0, "purchase_value": 0.0}
        for ins in dias_ad:
            linha = _linha_ad(ad, ins)
            for k in acumulado:
                acumulado[k] += linha[k]
            ads_diario.append({
                "dia": ins.get("date_start"),
                "ad_id": ad["id"],
                "nome": ad["name"],
                "campanha_id": ad.get("campanha_id"),
                "campanha_nome": ad.get("campanha_nome"),
                **linha,
            })
        ads_resumo.append({
            "ad_id": ad["id"],
            "nome": ad["name"],
            "status": ad.get("effective_status"),
            "campanha_id": ad.get("campanha_id"),
            "campanha_nome": ad.get("campanha_nome"),
            "criativo": criativo,
            **acumulado,
        })

    snapshot = {
        "atualizado_em": datetime.now().isoformat(),
        "janela_dias_pedidos": dias,
        "campanha_inicio": CAMPANHA_INICIO,
        "aviso_metodologia": (
            "Primeira_Compra_Na_Janela é calculado só dentro da janela puxada "
            f"({dias} dias) — clientes cuja 1a compra real foi antes disso podem "
            "aparecer como 'novo' aqui. 'Novo público/Clientes existentes' do "
            "Meta não está disponível via API (recurso só de UI do Advantage+); "
            "esta classificação própria por telefone/CPF é o substituto. "
            f"ROAS e novo-vs-recorrente usam só pedidos a partir de {CAMPANHA_INICIO} "
            "(início real da campanha) — comparar gasto da campanha contra pedidos "
            "de antes dela existir infla o ROAS artificialmente (achado 2026-10-07). "
            "Canal/sorteios/diário abaixo mostram a janela completa pra contexto de "
            "negócio, não são 'resultado da campanha'. O dia de hoje no gráfico "
            "diário está SEMPRE em andamento (parcial) até virar a meia-noite — "
            "não comparar com dias fechados sem considerar isso."
        ),
        "periodo": {
            "inicio": CAMPANHA_INICIO,
            "fim": datetime.now().date().isoformat(),
            "nota": (
                "Os cards do topo e o corte Novo×Recorrente usam este intervalo "
                "(início real da campanha até agora) por padrão — use o filtro de "
                "período da página pra recalcular com outra janela."
            ),
        },
        "campanha": {
            "ad_account": AD_ACCOUNT,
            "ad_accounts": AD_ACCOUNTS,
            "campanhas": [
                {
                    "id": c["id"], "nome": c.get("name", c["id"]), "status": c.get("effective_status"),
                    "conta_id": c.get("conta_id"), "conta_nome": c.get("conta_nome"),
                }
                for c in campanhas
            ],
            "daily_insights": daily_insights,
            "ads": ads_resumo,
            "ads_diario": ads_diario,
        },
        "pixel_funil_site_todo": pixel_funnel,
        "pixel_funil_diario": montar_pixel_funil_diario(pixel_funnel),
        "pixel_funil_host_diario": montar_pixel_funil_host_diario(pixel_funnel_host or []),
        "pedidos": {
            "total_janela": len(df_pedidos),
            "por_canal_contagem": canal_counts,
            "por_canal_valor": {k: round(v, 2) for k, v in canal_valor.items()},
            "meta_ads_novo_cliente": {
                "pedidos": len(novo_df),
                "valor": round(float(novo_df["Valor"].sum()), 2),
            },
            "meta_ads_recorrente": {
                "pedidos": len(recorrente_df),
                "valor": round(float(recorrente_df["Valor"].sum()), 2),
            },
        },
        "canal_diario": montar_canal_diario(df_pedidos),
        "utm_diario": montar_utm_diario(df_pedidos),
        "utm_criativo_diario": montar_utm_criativo_diario(df_pedidos),
        "lp_eventos_diario": montar_lp_eventos_diario(dias),
        # PONTO 2 (2026-10-16) — quantos pedidos de "sinal fraco, fbp fresco"
        # também têm UTM confirmando Meta Ads. Não responde ao filtro de
        # período (é validação de metodologia, não corte de negócio) — mesmo
        # tratamento de `concentracao`/LTV, que também são globais à janela.
        "validacao_sinal_fraco_utm": validar_sinal_fraco_com_utm(df_pedidos),
        "sorteios": montar_sorteios(df_pedidos, sorteios_meta, premio_por_sorteio),
        "diario": montar_diario(df_pedidos, daily_insights, sorteios_meta=sorteios_meta),
        # Fechamento do sorteio é sempre por calendário (ver docstring de
        # `montar_sorteios_por_dia`) — por isso "sorteios_por_dia" e
        # "sorteios_por_dia_24h" abaixo saem IDÊNTICOS agora (nenhum dos
        # dois ainda aplica corte de negócio ao `drawDate`); mantidos como
        # duas chamadas/chaves separadas só pra não quebrar o contrato que
        # o frontend já espera (uma por janela de cima).
        "sorteios_por_dia": montar_sorteios_por_dia(df_pedidos, sorteios_meta, premio_por_sorteio),
        # Janela convencional (meia-noite), lado a lado com a de 21h45 acima
        # — pedido do cliente 2026-10-17, ver as duas agregações juntas.
        "diario_24h": montar_diario(df_pedidos, daily_insights, dia_fn=_dia_24h, sorteios_meta=sorteios_meta),
        "sorteios_por_dia_24h": montar_sorteios_por_dia(df_pedidos, sorteios_meta, premio_por_sorteio),
        "kpis_financeiros": kpis,
        "qualidade": montar_qualidade(df_pedidos),
        # --- página Produto (analítica — a rodada de sorteio como produto) ---
        "rodadas": montar_rodadas(df_pedidos, sorteios_meta, premio_por_sorteio),
        "pedidos_hora": montar_pedidos_hora(df_pedidos),
        "pedidos_perfil": montar_pedidos_perfil(df_pedidos),
        "concentracao": montar_concentracao(df_pedidos),
        "produto_parametros": {
            "taxa_plataforma_pct": TAXA_PLATAFORMA,
            "janelas_extracao": JANELAS_EXTRACAO,
            "portes": ["Pequeno (até R$1k)", "Médio (R$1k-5k)", "Jackpot (acima de R$5k)", "Sem prêmio identificável"],
        },
    }
    return snapshot


def dividir_por_pagina(snapshot):
    """Separa o snapshot único nos 4 JSONs temáticos de
    bi-arquitetura-profissional.md seção 2 — cada página do BI só baixa o
    que usa (ex.: executiva não carrega a lista de 20 sorteios)."""
    comuns = {
        "atualizado_em": snapshot["atualizado_em"],
        "janela_dias_pedidos": snapshot["janela_dias_pedidos"],
        "campanha_inicio": snapshot["campanha_inicio"],
        "aviso_metodologia": snapshot["aviso_metodologia"],
        "periodo": snapshot["periodo"],
    }

    executiva = {
        **comuns,
        "kpis_financeiros": snapshot["kpis_financeiros"],
        "pedidos_resumo": {
            "meta_ads_novo_cliente": snapshot["pedidos"]["meta_ads_novo_cliente"],
            "meta_ads_recorrente": snapshot["pedidos"]["meta_ads_recorrente"],
        },
        "diario": snapshot["diario"],
        "sorteios_por_dia": snapshot["sorteios_por_dia"],
        "diario_24h": snapshot["diario_24h"],
        "sorteios_por_dia_24h": snapshot["sorteios_por_dia_24h"],
    }

    operacional = {
        **comuns,
        "campanha": snapshot["campanha"],
        "pixel_funil_site_todo": snapshot["pixel_funil_site_todo"],
        "pixel_funil_diario": snapshot["pixel_funil_diario"],
        "pixel_funil_host_diario": snapshot["pixel_funil_host_diario"],
        "pedidos": snapshot["pedidos"],
        "canal_diario": snapshot["canal_diario"],
        "utm_diario": snapshot["utm_diario"],
        "utm_criativo_diario": snapshot["utm_criativo_diario"],
        "lp_eventos_diario": snapshot["lp_eventos_diario"],
        "validacao_sinal_fraco_utm": snapshot["validacao_sinal_fraco_utm"],
        "diario": snapshot["diario"],
    }

    # Produto deixou de repetir o que a Executiva já mostra (faturamento por
    # dia, LTV proxy, top sorteios por faturamento) — pedido do founder
    # 2026-10-08: "perdeu sentido porque tudo dela já é mostrado em
    # Executivo". Agora é investigação da RODADA como produto: preço por
    # número, estrutura de prêmio, giro (horas até esgotar) e horário.
    # `sorteios` sai do payload (era subconjunto de `rodadas`); `ltv_proxy`
    # sai (vive na Executiva). `diario` fica só porque o filtro de período
    # precisa saber quais dias existem no dado (min/max do seletor).
    produto = {
        **comuns,
        "produto_parametros": snapshot["produto_parametros"],
        "rodadas": snapshot["rodadas"],
        "pedidos_hora": snapshot["pedidos_hora"],
        "pedidos_perfil": snapshot["pedidos_perfil"],
        "concentracao": snapshot["concentracao"],
        "dias_com_dado": [d["dia"] for d in snapshot["diario"]],
    }

    qualidade = {
        **comuns,
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
    parser.add_argument("--outdir", default=os.path.join(ROOT, "..", "..", "..", "apps", "BI", "imperio-premios"))
    args = parser.parse_args()

    print(f"🚀 BI aggregator — janela de {args.dias} dias")
    daily_insights, by_ad, campanhas = pull_meta_insights(args.dias)
    print(f"✅ Insights: {len(campanhas)} campanhas, {len(daily_insights)} linhas diárias, {len(by_ad)} anúncios")
    pixel_funnel = pull_pixel_funnel(min(args.dias, 14))
    pixel_funnel_host = pull_pixel_funnel_por_host(min(args.dias, 14))
    print(f"✅ Pixel funil por host: {len(pixel_funnel_host)} linhas")
    print(f"✅ Pixel funil: {len(pixel_funnel)} períodos")
    df_pedidos, sorteios_meta, client = pull_pedidos(args.dias)
    df_pedidos = enriquecer_com_utm_webhook(df_pedidos)
    df_pedidos = enriquecer_com_utm_touches(df_pedidos)
    df_pedidos = classificar_novo_vs_recorrente(df_pedidos)
    premio_por_sorteio = calcular_premio_por_sorteio(sorteios_meta, client)
    df_pedidos = anexar_lucro_estimado(df_pedidos, premio_por_sorteio)

    snapshot = montar_snapshot(args.dias, daily_insights, by_ad, pixel_funnel, df_pedidos, sorteios_meta, premio_por_sorteio, campanhas, pixel_funnel_host)
    paginas = dividir_por_pagina(snapshot)

    os.makedirs(args.outdir, exist_ok=True)
    for nome, dados in paginas.items():
        out_path = os.path.join(args.outdir, f"data-{nome}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)
        publicar_bi_storage(f"data-{nome}.json", dados)
        print(f"🎉 {out_path} (publicado no Supabase Storage)")
