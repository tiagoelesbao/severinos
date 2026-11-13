"""
Cliente de produção da Meta Conversions API (CAPI) para o Império Prêmios.

Porta de produção do `MetaCAPIClient` ensinado no Módulo 08 do MBA
(docs/meta_mba/Apostila/MODULO_08_TRACKING_PIXEL_CAPI_EMQ_E_DEDUPLICACAO.md),
adaptada aos campos reais confirmados por inspeção ao vivo da API do cliente
(ver plano em C:\\Users\\Pichau\\.claude\\plans\\stateless-tickling-hammock.md):

- `em`/`ph` com SHA-256 SOMENTE quando presentes (email em 36,5% dos
  pedidos, telefone em ~100%) — nunca manda hash de string vazia (isso
  derruba o EMQ ao invés de ajudar).
- `fbp`/`fbc` em texto puro (nunca hashear).
- `client_ip_address` e `client_user_agent` (user agent confirmado presente
  em 100% dos pedidos).
- `event_id` = `_id` do pedido (OrderId) — estável e único, garante
  deduplicação correta com o Pixel do navegador se um dia existir.
- `event_time` = `PaymentAt` (timestamp de confirmação de pagamento).

Requer META_IMPERIO_PREMIOS_DATASET_ID e META_IMPERIO_PREMIOS_ACCESS_TOKEN
no .env — ainda não configurados (dependem do founder gerar o Dataset/System
User token no Business Manager do cliente). Até lá, só o modo --dry-run
funciona.
"""
import os
import sys
import hashlib
import time
import argparse
import requests
import pandas as pd
from datetime import datetime
import pytz
from dateutil import parser as date_parser
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env"))

GRAPH_VERSION = "v26.0"
IMPERIO_SUPABASE_URL = os.environ.get("IMPERIO_SUPABASE_URL")
IMPERIO_SUPABASE_SERVICE_ROLE_KEY = os.environ.get("IMPERIO_SUPABASE_SERVICE_ROLE_KEY")


def buscar_fbc_confiavel(fbps):
    """Busca em utm_touches (capturado via GTM direto do cookie _fbc do
    navegador, não contaminado pelo bug de fbc congelado da plataforma —
    ver bug-report-fbc-plataforma.md) o fbc mais recente conhecido por fbp.
    Usado em vez de pedido["Fbc"] (vem da API do cliente, sempre "fresco"
    mesmo quando o clique real é antigo — inutiliza o filtro de idade)."""
    fbps = [f for f in set(fbps) if f]
    if not fbps or not IMPERIO_SUPABASE_URL or not IMPERIO_SUPABASE_SERVICE_ROLE_KEY:
        return {}
    resultado = {}
    headers = {
        "apikey": IMPERIO_SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {IMPERIO_SUPABASE_SERVICE_ROLE_KEY}",
    }
    for i in range(0, len(fbps), 100):
        lote = fbps[i:i + 100]
        valores = ",".join(lote)
        resp = requests.get(
            f"{IMPERIO_SUPABASE_URL}/rest/v1/utm_touches",
            params={
                "select": "fbp,fbc,captured_at",
                "fbp": f"in.({valores})",
                "fbc": "not.is.null",
                "order": "captured_at.desc",
            },
            headers=headers,
        )
        if not resp.ok:
            continue
        for row in resp.json():
            # order=captured_at.desc garante que a primeira ocorrência de
            # cada fbp já é a mais recente — setdefault ignora as demais.
            resultado.setdefault(row["fbp"], row["fbc"])
    return resultado


def _hash(value):
    if value is None:
        return None
    value = str(value).strip().lower()
    if not value:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _hash_nome_partes(nome_completo):
    """Divide em (primeiro nome, resto) pro fn/ln do Advanced Matching —
    convenção do próprio Meta: só o PRIMEIRO espaço separa fn de ln, o
    resto (incluindo nomes compostos/sobrenomes múltiplos) vira ln inteiro."""
    if not nome_completo:
        return None, None
    partes = str(nome_completo).strip().split(None, 1)
    if not partes:
        return None, None
    fn = _hash(partes[0])
    ln = _hash(partes[1]) if len(partes) > 1 else None
    return fn, ln


def _hash_phone(e164):
    """Telefone no CAPI: dígitos com código de país, SEM o '+' antes do hash
    (a Meta aceita com ou sem '+', mas a doc oficial usa sem — padronizando)."""
    if not e164:
        return None
    digits = str(e164).lstrip("+").strip()
    if not digits:
        return None
    return hashlib.sha256(digits.encode("utf-8")).hexdigest()


class MetaCAPIClient:
    # Achado 2026-10-07: a plataforma do cliente reenvia o MESMO fbc por até
    # 349 dias (Events Manager: "servidor está enviando um valor fbclid
    # expirado", alta prioridade, desde 28/jul/2026). Em vez de pedir pro dev
    # deles corrigir, corrigimos NO NOSSO PRÓPRIO envio: nunca mandamos fbc
    # mais velho que essa janela — ver bug-report-fbc-plataforma.md e
    # client_api.py::FBC_MAX_AGE_DIAS (mesmo valor, mesma janela de
    # attribution_spec CLICK_THROUGH do ad set real).
    FBC_MAX_AGE_DIAS = 7

    def __init__(self, dataset_id=None, access_token=None):
        self.dataset_id = dataset_id or os.environ.get("META_IMPERIO_PREMIOS_DATASET_ID")
        self.access_token = access_token or os.environ.get("META_IMPERIO_PREMIOS_ACCESS_TOKEN")
        self.url = f"https://graph.facebook.com/{GRAPH_VERSION}/{self.dataset_id}/events" if self.dataset_id else None
        # fbp -> fbc confiável (capturado via GTM, ver buscar_fbc_confiavel).
        # Populado externamente (eventos_de_csv) antes de montar os eventos.
        self.fbc_confiavel_por_fbp = {}

    def configurado(self):
        return bool(self.dataset_id and self.access_token)

    def _fbc_fresco(self, fbc, event_time_unix):
        """True se o clique embutido no fbc (fb.1.<ts_ms>.<fbclid>) ainda
        está dentro da janela de atribuição — caso contrário o fbc é
        omitido do payload (nunca enviamos um clique stale como se fosse
        recente, mesmo que a plataforma do cliente faça isso)."""
        if not fbc:
            return False
        try:
            ts_ms = int(str(fbc).split(".")[2])
            click_dt = datetime.fromtimestamp(ts_ms / 1000, tz=pytz.UTC)
            evento_dt = datetime.fromtimestamp(event_time_unix, tz=pytz.UTC)
            idade_dias = (evento_dt - click_dt).total_seconds() / 86400
            return 0 <= idade_dias <= self.FBC_MAX_AGE_DIAS
        except (IndexError, ValueError, OSError, TypeError):
            return False

    def build_purchase_events(self, pedido: dict) -> list:
        """Monta 1 evento "PurchasePlataforma" (custom, nome exclusivo nosso)
        a partir de 1 pedido. NÃO manda mais o "Purchase" padrão (removido
        2026-10-16 — ver achado abaixo).

        Por quê: medimos (28 dias) o "Purchase" padrão vindo 3,43x maior que
        pedido real, e atribuímos isso inteiramente ao pixel NATIVO da
        plataforma do cliente. Auditoria de hoje (2026-10-16), puxando
        aggregation=event dia a dia direto da API, achou outra coisa: a
        razão Purchase/InitiateCheckout fica ESTÁVEL (~0,42-0,49) de 18/09 a
        07/10 e só começa a subir em 08/10 (0,91) — crescendo até ~1,4-1,5x
        de 10/10 em diante e ficando nesse platô até hoje. Essa data bate
        exatamente com a maturação do pipeline próprio: capi_client.py usa
        event_id = EventId do pedido desde 08/10 (achado/fix do mesmo dia,
        ver gates-status.yaml), por analogia ao que FOI validado ao vivo pro
        InitiateCheckout (capi_initiatecheckout.py) — mas pro Purchase isso
        nunca foi confirmado com teste real (gates-status.yaml registra
        isso em aberto: "Evento purchase... não confirmado ao vivo"). Se o
        Purchase nativo do navegador usa um event_id DIFERENTE do EventId
        de checkout (gerado só na confirmação do pagamento, não na entrada
        do carrinho), a dedup nunca bateria — e cada pedido real vira 2
        eventos "Purchase" contados em vez de 1 (o nosso CAPI + o nativo),
        o que combina com a tarefa agendada CAPI-Imperio-Realtime rodando a
        cada 15min desde 2026-10-07T07:00 e ficando "completa" por volta de
        08-10/10 (consistente com a curva observada). Ou seja: o "3,43x" de
        poluição medido antes provavelmente já incluía uma fatia nossa, não
        só do pixel nativo do cliente.
        Em vez de caçar o campo de event_id certo pro Purchase do navegador
        (risco de repetir o mesmo erro), paramos de mandar o "Purchase"
        padrão via CAPI — zero perda real: campanhas novas vão otimizar em
        cima de "PurchasePlataforma" (nome exclusivo, não pode duplicar
        porque mais ninguém usa esse nome), e o "Purchase" nativo do
        cliente continua existindo exatamente como sempre esteve, fora do
        nosso controle — só paramos de CONTRIBUIR pra inflação dele."""
        base = self.build_purchase_event(pedido)
        real = dict(base)
        real["event_name"] = "PurchasePlataforma"
        return [real]

    def build_purchase_event(self, pedido: dict) -> dict:
        """Monta 1 evento Purchase a partir de 1 linha de dados_brutos_completos
        (dict vindo de client_api.extrair_linha_pedido / CSV do collector)."""
        event_time = pedido.get("PaymentAt") or pedido.get("Data")
        try:
            event_time_unix = int(date_parser.parse(event_time).timestamp()) if event_time else int(time.time())
        except Exception:
            event_time_unix = int(time.time())

        user_data = {}

        em = _hash(pedido.get("Email"))
        if em:
            user_data["em"] = [em]

        ph = _hash_phone(pedido.get("Telefone_E164"))
        if ph:
            user_data["ph"] = [ph]

        # Achado 2026-10-07 (Events Manager > Parâmetros do evento,
        # "Cobertura de identificação externa"): não enviávamos external_id.
        # A API do cliente devolve um _id de usuário estável (MongoDB ObjectId)
        # — hash por boas práticas, mesmo não sendo PII direto.
        ext_id = _hash(pedido.get("UserId"))
        if ext_id:
            user_data["external_id"] = [ext_id]

        if pedido.get("Fbp"):
            user_data["fbp"] = pedido["Fbp"]
        # Prioridade: fbc capturado por nós via GTM (genuíno, sem a
        # corrupção de timestamp da plataforma) — só cai pro campo da API
        # do cliente quando ainda não temos captura própria pra esse fbp
        # (ex.: pedido de antes da tag entrar no ar, ou visita que caiu na
        # home ainda sem GTM funcionando).
        fbc_confiavel = self.fbc_confiavel_por_fbp.get(pedido.get("Fbp"))
        fbc_para_usar = fbc_confiavel or pedido.get("Fbc")
        if self._fbc_fresco(fbc_para_usar, event_time_unix):
            user_data["fbc"] = fbc_para_usar
        if pedido.get("Ip"):
            user_data["client_ip_address"] = pedido["Ip"]
        if pedido.get("UserAgent"):
            user_data["client_user_agent"] = pedido["UserAgent"]

        # Achado 2026-10-07 (EMQ caindo pro evento Compra): nome e país nunca
        # eram mandados por NÓS — só pela CAPI nativa da plataforma (fatia
        # pequena), então conforme nosso volume cresce, a proporção com esses
        # campos cai (dilui em vez de melhorar). Nome vem 100% preenchido,
        # país também (sempre "br" na amostra ao vivo) — mandar direto
        # resolve na raiz.
        fn, ln = _hash_nome_partes(pedido.get("Nome"))
        if fn:
            user_data["fn"] = [fn]
        if ln:
            user_data["ln"] = [ln]
        pais = _hash(pedido.get("Pais"))
        if pais:
            user_data["country"] = [pais]

        return {
            "event_name": "Purchase",
            "event_time": event_time_unix,
            # Achado 2026-10-08 (auditoria de dedup pós-fix do InitiateCheckout):
            # OrderId é só o _id do nosso lado, sem nenhuma relação com o id que
            # o pixel do site usa no seu próprio Purchase — nunca bateria pra
            # dedup. EventId é o mesmo campo "<n>.<timestamp_ms>.<n>" validado
            # ao vivo no InitiateCheckout (ver capi_initiatecheckout.py) como
            # sendo a id real compartilhada com o navegador; fallback pro
            # OrderId só nos registros raros sem EventId.
            "event_id": pedido.get("EventId") or pedido.get("OrderId"),
            "action_source": "website",
            # Achado 2026-10-07 (Events Manager > Ações, "Envie o URL de
            # origem do evento ausente" — 11% dos Purchase afetados): a API
            # do cliente não devolve a URL exata da página por pedido, mas
            # Meta só exige QUE exista um event_source_url válido do domínio
            # onde a conversão ocorreu — usamos o domínio real do checkout.
            "event_source_url": "https://rapidinhas24hr.com/",  # domínio trocado 2026-10-22 (era imperiopremioss.com, morto)
            "user_data": user_data,
            "custom_data": self._montar_custom_data(pedido),
        }

    def _montar_custom_data(self, pedido):
        """Achado 2026-10-16 (Gerenciador de Eventos, comparação 'hoje' vs
        28 dias): nosso envio sempre mandou só 3 campos (currency/value/
        order_id) — nunca mandamos content_ids/content_type/contents, que
        aparecem na amostra agregada do Meta vindos de outro remetente
        (provavelmente o CAPI nativo da plataforma, contado no mesmo balde
        'API de Conversões'). Já temos o dado pra mandar de verdade: ProductId
        é o id do sorteio, Quantidade e Preco_Unitario vêm do próprio pedido."""
        custom_data = {
            "currency": "BRL",
            "value": float(pedido.get("Valor", 0) or 0),
            "order_id": pedido.get("OrderId"),
        }
        product_id = pedido.get("ProductId")
        if product_id:
            custom_data["content_ids"] = [product_id]
            custom_data["content_type"] = "product"
            try:
                preco_unitario = float(pedido.get("Preco_Unitario", 0) or 0)
            except (TypeError, ValueError):
                preco_unitario = 0.0
            try:
                quantidade = int(float(pedido.get("Quantidade", 1) or 1))
            except (TypeError, ValueError):
                quantidade = 1
            custom_data["contents"] = [{
                "id": product_id,
                "quantity": quantidade,
                "item_price": preco_unitario,
            }]
        return custom_data

    def send_events(self, eventos: list, test_event_code: str = None):
        if not self.configurado():
            raise RuntimeError(
                "META_IMPERIO_PREMIOS_DATASET_ID/ACCESS_TOKEN não configurados no .env — "
                "veja 'Fora de escopo' no plano."
            )
        payload = {"data": eventos, "access_token": self.access_token}
        if test_event_code:
            payload["test_event_code"] = test_event_code
        res = requests.post(self.url, json=payload)
        if res.status_code == 200:
            body = res.json()
            print(f"✅ {len(eventos)} evento(s) enviados. "
                  f"events_received={body.get('events_received')} fbtrace_id={body.get('fbtrace_id')}")
        else:
            print(f"❌ Erro CAPI ({res.status_code}): {res.text}")
        return res


def eventos_de_csv(raw_csv_path, limite=None):
    # dtype=str sozinho NÃO basta: o pandas detecta célula vazia como NaN
    # ANTES de aplicar o dtype, então a coluna "string" ainda pode conter
    # float NaN em vez de ''. Sem o fillna abaixo, isso virava literalmente
    # a string inválida "NaN" no JSON enviado ao Meta (pego em dry-run antes
    # do 1º envio real, 2026-10-05) — nunca confiar só em dtype=str pra isso.
    str_cols = ["OrderId", "UserId", "PaymentId", "Telefone_E164", "Email", "Fbp", "Fbc", "Ip", "UserAgent", "Nome", "Pais"]
    df = pd.read_csv(raw_csv_path, sep=";", encoding="utf-8-sig", dtype={c: str for c in str_cols})
    df[str_cols] = df[str_cols].fillna("")
    if limite:
        df = df.head(limite)
    client = MetaCAPIClient()
    client.fbc_confiavel_por_fbp = buscar_fbc_confiavel(df["Fbp"].tolist())
    eventos = []
    for _, row in df.iterrows():
        pedido = row.to_dict()
        eventos.extend(client.build_purchase_events(pedido))
    return eventos, client


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("raw_csv", help="Caminho do dados_brutos_completos_*.csv gerado pelo collector.py")
    parser.add_argument("--limite", type=int, default=5)
    parser.add_argument("--dry-run", action="store_true", help="Monta os payloads e imprime, sem enviar")
    parser.add_argument("--test-event-code", default=None, help="Código de Test Events do Events Manager")
    args = parser.parse_args()

    eventos, client = eventos_de_csv(args.raw_csv, limite=args.limite)
    print(f"📦 {len(eventos)} evento(s) Purchase montados a partir de {args.raw_csv}")

    tem_em = sum(1 for e in eventos if "em" in e["user_data"])
    tem_ph = sum(1 for e in eventos if "ph" in e["user_data"])
    tem_fbc = sum(1 for e in eventos if "fbc" in e["user_data"])
    print(f"   com 'em': {tem_em}/{len(eventos)} | com 'ph': {tem_ph}/{len(eventos)} | com 'fbc': {tem_fbc}/{len(eventos)}")

    if args.dry_run or not client.configurado():
        if not client.configurado() and not args.dry_run:
            print("⚠️ Dataset/Token não configurados — caindo para --dry-run automaticamente.")
        import json
        for ev in eventos[:3]:
            print(json.dumps(ev, indent=2, ensure_ascii=False))
    else:
        client.send_events(eventos, test_event_code=args.test_event_code)
