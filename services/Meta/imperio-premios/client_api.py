"""
Cliente autenticado da API do Império Prêmios (api.rapidinhas24hr.com).

Achado 2026-10-22 (founder avisou troca de domínio da plataforma): o
domínio antigo (imperiopremioss.com e api.imperiopremioss.com) está MORTO —
confirmado via DNS (api.imperiopremioss.com = NXDOMAIN, imperiopremioss.com
sem registro A) e via curl (connection failed). Novo domínio público:
rapidinhas24hr.com (ex.: https://rapidinhas24hr.com/campanha/{slug}).
Testado ao vivo: https://api.rapidinhas24hr.com/api/auth/login responde 200
com as MESMAS credenciais (IMPERIO_PREMIOS_API_EMAIL/_PASSWORD, sem
mudança) — mesmo backend, só domínio novo na frente.

Produtizado a partir de C:\\Users\\Pichau\\Desktop\\etc\\extract.py (pipeline
solto, fora de controle de versão, com credencial em texto puro). Mudanças
em relação ao original:

- Credenciais via variáveis de ambiente (IMPERIO_PREMIOS_API_EMAIL /
  IMPERIO_PREMIOS_API_PASSWORD), nunca hardcoded.
- Reautenticação automática em 401 (o original só tratava 429).
- Usa `userId.phoneDetails.e164` direto quando a API já devolve (confirmado
  em amostra real: já vem pronto, ex. "+5521*****2245"), com fallback pra
  normalização manual só quando o campo não existir.
- Captura campos que o pipeline original descartava e que são necessários
  pro CAPI: `_id` do pedido (event_id de dedup), `paymentId`,
  `paymentEndToEndId`, `paymentAt` (event_time), `userAgent` (confirmado
  presente em 100% dos pedidos amostrados), `email`/`cpf` (presentes em
  36,5%/18,8% dos pedidos — enviar ao CAPI só quando existirem).
"""
import os
import re
import time
import json
import requests
from collections import defaultdict
from datetime import datetime, timedelta
from dateutil import parser as date_parser
import pytz


def is_paused() -> bool:
    """Flag de pausa self-service (apps/BI/imperio-premios/api/toggle-pause.js
    + botão no nav do dashboard) — achado 2026-10-24: o founder testando login
    manual no painel da plataforma tinha a sessão derrubada pelos nossos 5
    jobs agendados (todos passam por login() aqui) relogando em paralelo.

    Lê de Supabase Storage (bucket "catalogo", objeto "bi_paused.json") —
    NÃO do Edge Config: tentei o Edge Config primeiro (mesmo store do botão
    "Sincronizar agora") e bati no limite de escrita do plano Free (429
    rate_limited, trava por 30 dias) — já quase no teto só com o uso normal.
    Storage não tem esse limite, mesmo padrão já provado em
    `snapshot_sorteios.py` pro catálogo de sorteios.

    Falha de leitura (sem env var, objeto inexistente, rede fora) = NÃO
    pausado — um problema de infra secundária nunca deve travar o pipeline
    principal. Lê as env vars DENTRO da função (não em module-level) de
    propósito: alguns chamadores (ex.: bi_aggregator.py) importam este
    módulo ANTES de chamar `load_dotenv()` — uma constante de módulo
    capturaria `None` pra sempre."""
    supabase_url = (os.environ.get("IMPERIO_SUPABASE_URL") or "").strip().strip('"').rstrip("/")
    if not supabase_url:
        return False
    try:
        r = requests.get(f"{supabase_url}/storage/v1/object/public/catalogo/bi_paused.json", timeout=8)
        if r.status_code == 404:
            return False
        r.raise_for_status()
        return bool(r.json().get("paused"))
    except Exception:
        return False


class SorteiosAPIClient:
    def __init__(self, email=None, password=None):
        self.base_url = "https://api.rapidinhas24hr.com/api"
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        })
        self.email = email or os.environ.get("IMPERIO_PREMIOS_API_EMAIL")
        self.password = password or os.environ.get("IMPERIO_PREMIOS_API_PASSWORD")
        if not self.email or not self.password:
            raise RuntimeError(
                "IMPERIO_PREMIOS_API_EMAIL / IMPERIO_PREMIOS_API_PASSWORD não configurados no .env"
            )
        self.token = None
        self.request_count = 0
        self.max_requests_per_minute = 20
        # Janela de atribuição por clique — mesma usada no ad set real do
        # Ads Manager (attribution_spec: CLICK_THROUGH window_days=7,
        # confirmado via API em 2026-10-07). Achado na mesma data: a
        # plataforma reenvia o MESMO fbc por meses (Events Manager aponta
        # "fbclid expirado" desde 28/jul/2026 — fbc com >90 dias sendo
        # enviado pro CAPI). Sem essa janela, _classificar_canal contava
        # qualquer fbc como "Meta Ads confirmado" mesmo de cliques de
        # meses atrás, inflando a atribuição artificialmente (84 pedidos/
        # R$6.277 viraram 3 pedidos/R$216 depois do filtro de idade).
        self.FBC_MAX_AGE_DIAS = 7

    # ------------------------------------------------------------------ auth
    def login(self):
        if is_paused():
            print("⏸️ Login automático pausado pelo dashboard (flag bi_paused) — pulando.")
            return False
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"email": self.email, "password": self.password},
            )
            if response.status_code != 200:
                print(f"❌ Falha no login: {response.status_code}")
                return False
            data = response.json()
            self.token = data.get("accessToken") or data.get("token")
            if not self.token:
                print("❌ Login OK mas resposta sem accessToken/token.")
                return False
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print("✅ Login bem-sucedido!")
            return True
        except Exception as e:
            print(f"❌ Erro no login: {e}")
            return False

    def _rate_limit(self):
        self.request_count += 1
        if self.request_count >= self.max_requests_per_minute:
            time.sleep(5)
            self.request_count = 0

    def _get(self, url, params=None, _retried_401=False):
        """GET com reautenticação automática em 401 — o pipeline original só
        tratava 429 e deixava o token expirar silenciosamente em coletas longas."""
        self._rate_limit()
        response = self.session.get(url, params=params)
        if response.status_code == 401 and not _retried_401:
            print("🔑 Token expirado (401). Reautenticando...")
            if self.login():
                return self._get(url, params=params, _retried_401=True)
        return response

    # --------------------------------------------------------------- sorteios
    def get_sorteios(self, days=30):
        if not self.token:
            print("❌ Sem token para fazer requisições")
            return []
        try:
            all_products = []
            # Achado CRÍTICO 2026-10-07 (founder: faturamento real do site
            # R$95.236 vs R$23.586 capturado por nós — quase 75% perdido):
            # /products é indexado a partir de page=0 (confirmado ao vivo —
            # page=0 traz os sorteios criados nas últimas horas, page=1 já
            # pula ~10h de sorteios novos). Começar em page=1 fazia este
            # método pular SEMPRE os ~25 sorteios mais recentes, todo ciclo,
            # desde sempre — não só o BI, o envio de CAPI também nunca via
            # sorteios novos a tempo (mesma función usada por collector.py e
            # bi_aggregator.py). Mesmo padrão 0-index já usado corretamente
            # em get_participantes_sorteio logo abaixo (page=0).
            page = 0
            rows_per_page = 25
            cutoff_date = datetime.now(pytz.UTC) - timedelta(days=days)
            filters = {"title": None, "status": "all", "privacy": "all", "drawDate": None}
            paginas_sem_novos = 0
            limite_paginas_sem_novos = 8

            while True:
                params = {"page": page, "rowsPerPage": rows_per_page, "filters": json.dumps(filters)}
                response = self._get(f"{self.base_url}/products", params=params)
                if response.status_code != 200:
                    print(f"❌ Erro ao buscar sorteios: {response.status_code}")
                    break
                data = response.json()
                products = self._extract_list(data, ["products", "data", "items", "result", "list", "docs"])
                if not products:
                    break

                antes = len(all_products)
                for product in products:
                    created_date = self._extract_date(product)
                    if created_date is None:
                        if self._has_recent_date_in_title(product.get("title", ""), days):
                            all_products.append(product)
                    elif created_date >= cutoff_date:
                        all_products.append(product)
                adicionados = len(all_products) - antes
                paginas_sem_novos = 0 if adicionados else paginas_sem_novos + 1

                if paginas_sem_novos >= limite_paginas_sem_novos:
                    break
                if len(products) < rows_per_page:
                    break
                page += 1
                time.sleep(0.5)

            print(f"✅ Encontrados {len(all_products)} sorteios nos últimos {days} dias")
            return all_products
        except Exception as e:
            print(f"❌ Erro ao buscar sorteios: {e}")
            return []

    def _has_recent_date_in_title(self, title, days):
        if not title:
            return False
        for pattern in [r"(\d{2}/\d{2}/\d{4})", r"(\d{2}-\d{2}-\d{4})", r"(\d{4}-\d{2}-\d{2})"]:
            match = re.search(pattern, title)
            if not match:
                continue
            for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"]:
                try:
                    data = datetime.strptime(match.group(1), fmt)
                    if (datetime.now() - data).days <= days:
                        return True
                except ValueError:
                    continue
        return False

    def _extract_list(self, data, keys):
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for key in keys:
                if key in data and isinstance(data[key], list):
                    return data[key]
        return []

    def _extract_date(self, product):
        for key in ["createdAt", "date", "createDate", "created_date", "drawDate", "updatedAt"]:
            if key in product:
                try:
                    return date_parser.parse(product[key])
                except Exception:
                    continue
        return None

    def _extract_date_from_order(self, order):
        for key in ["paymentAt", "createdAt", "date", "purchaseDate", "orderDate", "updatedAt", "expirationAt"]:
            if key in order and order[key]:
                try:
                    return date_parser.parse(order[key])
                except Exception:
                    continue
        return None

    # ------------------------------------------------------------------ orders
    def get_participantes_sorteio(self, product_id, max_retries=3, status="paid"):
        """status="paid" (default, usado pelo pipeline de Compra) ou "all"
        (usado pelo InitiateCheckout — achado 2026-10-07: "all" também
        devolve status "waiting-payment"/"expired", ou seja, TODO checkout
        iniciado, não só o que terminou pago)."""
        if not self.token:
            return []
        for attempt in range(max_retries):
            try:
                all_orders = []
                page = 0
                rows_per_page = 100
                while True:
                    params = {
                        "page": page, "rowsPerPage": rows_per_page,
                        "filterName": "", "filterNumber": "", "filterAffiliate": "",
                        "filterPaymentId": "", "filterPhone": "", "filterOrderId": "",
                        "filterStatus": status, "filterPaymentEndToEndId": "",
                        "filterStartDate": "null", "filterEndDate": "null",
                    }
                    response = self._get(f"{self.base_url}/product/{product_id}/orders", params=params)
                    if response.status_code == 429:
                        time.sleep(10)
                        continue
                    if response.status_code != 200:
                        break
                    try:
                        data = response.json()
                    except ValueError:
                        break
                    # Chave real confirmada por inspeção ao vivo: "orders" (o
                    # pipeline original testava ['content','orders','data',...]
                    # e tecnicamente funcionava, mas deixo "orders" primeiro
                    # por ser a chave real observada).
                    orders = self._extract_list(data, ["orders", "content", "data", "items", "result", "list", "rows"])
                    if not orders:
                        break
                    all_orders.extend(orders)
                    if len(orders) < rows_per_page:
                        break
                    page += 1
                    time.sleep(0.5)
                return all_orders
            except Exception as e:
                print(f"❌ Erro na tentativa {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(5)
                    continue
                return []
        return []

    # --------------------------------------------------------------- parsing
    def _parse_valor_brl(self, texto):
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

    def _parse_valor_brl_from_title(self, titulo):
        if not titulo:
            return 0.0
        for padrao in [r"(?:VALENDO|VALEND0)\s*R?\$?\s*([\d\.,]+)", r"R\$\s*([\d\.,]+)"]:
            match = re.search(padrao, titulo, re.IGNORECASE)
            if match:
                valor = self._parse_valor_brl(match.group(1))
                if valor > 0:
                    return valor
        return 0.0

    def extrair_valor_premio(self, produto):
        if isinstance(produto, str):
            return self._parse_valor_brl_from_title(produto)
        titulo = produto.get("title", "")
        valor_titulo = self._parse_valor_brl_from_title(titulo)
        valor_awards = 0.0
        awards = produto.get("awards")
        if awards and isinstance(awards, list):
            for a in awards:
                a_normalizado = re.sub(r"[Oo]", "0", str(a))
                valor_awards += self._parse_valor_brl(a_normalizado)
        if valor_awards > 0:
            if valor_titulo > 0 and valor_titulo >= valor_awards * 10:
                return valor_titulo
            return valor_awards
        return valor_titulo

    def _fbc_age_days(self, fbc, reference_dt):
        """Idade (em dias) do clique embutido no _fbc, relativa ao momento
        do pedido. Formato Meta: fb.1.<timestamp_ms>.<fbclid>. Retorna None
        se não der pra parsear (fbc ausente/mal formado)."""
        if not fbc or not reference_dt:
            return None
        try:
            ts_ms = int(str(fbc).split(".")[2])
            click_dt = datetime.fromtimestamp(ts_ms / 1000, tz=pytz.UTC)
            if reference_dt.tzinfo is None:
                reference_dt = pytz.UTC.localize(reference_dt)
            return (reference_dt - click_dt).total_seconds() / 86400
        except (IndexError, ValueError, OSError):
            return None

    def _classificar_canal(self, fbc, fbp, gclid, ttclid, utm_source, affiliate, fbc_age_dias=None):
        """Prioridade: UTM > fbc fresco > gclid/ttclid > afiliado > fbp > direto.
        UTM vem primeiro porque é explícito e não expira silenciosamente
        (diferente do fbc, que a plataforma reenvia velho — ver
        funil-conversao.md). Quando os dois concordam, o canal já deixa
        isso explícito ao invés de escolher só um."""
        fbc_fresco = bool(fbc) and (fbc_age_dias is None or fbc_age_dias <= self.FBC_MAX_AGE_DIAS)
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

    def limpar_telefone(self, telefone):
        if not telefone:
            return ""
        telefone = re.sub(r"[^0-9+]", "", str(telefone))
        if not telefone:
            return ""
        if len(telefone) >= 10:
            if telefone.startswith("55"):
                telefone = telefone[2:]
            ddd, numero = telefone[:2], telefone[2:]
            return f"({ddd}) {numero[:5]}-{numero[5:10]}"
        return telefone

    def _normalizar_telefone_e164_fallback(self, telefone_formatado):
        """Fallback manual — só usado quando `userId.phoneDetails.e164` não
        vem no payload. Quando vem (caso comum), usar direto, sem reinventar."""
        if not telefone_formatado:
            return ""
        digitos = re.sub(r"\D", "", telefone_formatado)
        if not digitos:
            return ""
        if not digitos.startswith("55"):
            digitos = "55" + digitos
        return f"+{digitos}"

    # ----------------------------------------------------------------- rows
    def extrair_linha_pedido(self, participante):
        """Constrói 1 linha de dados brutos a partir de 1 pedido cru da API,
        incluindo os campos de identidade/CAPI que o pipeline original
        descartava (OrderId, PaymentId, PaymentEndToEndId, UserAgent, Email,
        Cpf). Retorna None se o pedido não tiver valor (ignorado)."""
        user = participante.get("userId") if isinstance(participante.get("userId"), dict) else {}

        # "login" NÃO entra no fallback: nesta plataforma login é o próprio
        # telefone (mesmo campo usado como fallback de telefone 3 linhas
        # abaixo) — usá-lo aqui hashearia um telefone disfarçado de nome no
        # fn/ln da CAPI. Confirmado ao vivo em 2026-10-07: 12/12 pedidos
        # pagos recentes já vêm com "name" de verdade, então o fallback
        # nunca deveria precisar disso de qualquer forma.
        nome = user.get("name") or user.get("fullName") or \
            participante.get("customerName") or participante.get("name") or participante.get("userName")

        telefone_bruto = user.get("phone") or user.get("login") or \
            participante.get("customerPhone") or participante.get("phone")
        telefone = self.limpar_telefone(telefone_bruto)

        e164 = ""
        phone_details = user.get("phoneDetails") if isinstance(user.get("phoneDetails"), dict) else {}
        if phone_details.get("e164"):
            e164 = phone_details["e164"]
        elif telefone:
            e164 = self._normalizar_telefone_e164_fallback(telefone)

        # Achado 2026-10-07 (EMQ caindo pro evento Compra, founder filtrando
        # "hoje"): Nome e phoneDetails.country vêm 100% preenchidos na API
        # (amostra ao vivo confirmada) — nunca usávamos. Único canal que
        # mandava nome/sobrenome/país pro Meta era a CAPI NATIVA da
        # plataforma (fatia pequena e condicional); conforme nosso próprio
        # pipeline cresce em volume, a fatia com esses campos cai — diluindo
        # a EMQ em vez de melhorar. Mandar isso NO NOSSO envio resolve na
        # raiz, não só dilui.
        pais = (phone_details.get("country") or "").lower()

        quantidade = int(participante.get("quantity", 1) or 1)

        # Números escolhidos pelo comprador (campo `numbers` do pedido cru —
        # confirmado ao vivo 2026-10-08: lista de strings de 2 dígitos, ex.
        # ["19","49"], 1 entrada por número comprado, sempre com len ==
        # quantity). Nunca foi capturado antes; é a única fonte de "escolha
        # consciente de número" (conscious selection) que o produto tem —
        # alimenta o teste de uniformidade e o mapa de números frios da
        # página Produto do BI. Serializado com "|" (não ",") porque o CSV
        # de dados brutos usa ";" como separador e "," como decimal BR;
        # pipe não colide com nenhum dos dois.
        numeros = participante.get("numbers")
        numeros_lista = [str(n).strip() for n in numeros if str(n).strip()] if isinstance(numeros, list) else []

        valor = 0.0
        if participante.get("total") is not None:
            valor = float(participante["total"])
        if valor == 0:
            if participante.get("price") is not None:
                valor = float(participante["price"]) * quantidade
            elif participante.get("subtotal") is not None:
                valor = float(participante["subtotal"])
            elif participante.get("amount") is not None:
                valor = float(participante["amount"])
        if valor <= 0:
            return None

        fbc = participante.get("fbc") or ""
        fbp = participante.get("fbp") or ""
        gclid = participante.get("gclid") or ""
        ttclid = participante.get("ttclid") or ""
        utm_source = participante.get("utmSource") or ""
        affiliate = participante.get("affiliate") or participante.get("primeAffiliate") or ""

        reference_dt = None
        for campo in (participante.get("paymentAt"), participante.get("createdAt")):
            if campo:
                try:
                    reference_dt = date_parser.parse(campo)
                    break
                except (ValueError, TypeError):
                    continue
        fbc_idade_dias = self._fbc_age_days(fbc, reference_dt)
        canal = self._classificar_canal(fbc, fbp, gclid, ttclid, utm_source, affiliate, fbc_idade_dias)
        fbc_fresco = bool(fbc) and (fbc_idade_dias is None or fbc_idade_dias <= self.FBC_MAX_AGE_DIAS)
        # "Veio de anúncio PAGO" é mais estrito que Canal_Atribuicao: UTM de
        # canal orgânico (ex. whatsapp/community, ver funil-conversao.md)
        # não conta aqui mesmo que tenha UTM — só meta/google/tiktok/ads.
        utm_paga = str(utm_source).lower() in ("meta", "google", "tiktok", "ads", "fb", "ig")
        veio_de_anuncio_pago = bool(utm_paga or fbc_fresco or gclid or ttclid)

        return {
            "OrderId": participante.get("_id") or "",
            "EventId": participante.get("eventId") or "",
            "UserId": user.get("_id") or "",
            "PaymentId": participante.get("paymentId") or "",
            "PaymentEndToEndId": participante.get("paymentEndToEndId") or "",
            # Sem fallback pra placeholder: "Nome" vazio faz capi_client.py
            # pular fn/ln de verdade (seu guard `if fn:`) em vez de hashear
            # um literal tipo "Anônimo" que nunca bate com nada no Meta.
            "Nome": nome or "",
            "Pais": pais,
            "Telefone": telefone,
            "Telefone_E164": e164,
            "Email": user.get("email") or "",
            "Cpf": user.get("cpf") or "",
            "Valor": valor,
            "Quantidade": quantidade,
            "Numeros": "|".join(numeros_lista),
            # Preço unitário POR NÚMERO definido na rodada (numbersConfig.price
            # do produto, replicado em cada pedido pela própria API). É o
            # parâmetro de preço que o operador decide ao criar a rodada —
            # base do eixo de elasticidade da página Produto. Fica aqui (e não
            # só no produto) porque um mesmo sorteio pode ter o preço editado
            # no meio da vida: o pedido guarda o preço que o comprador pagou.
            "Preco_Unitario": float(participante.get("price") or 0) or (valor / quantidade if quantidade else 0.0),
            "Desconto": float(participante.get("discount") or 0),
            "ProductId": participante.get("productId", ""),
            "Status": participante.get("status", ""),
            # Achado 2026-10-17 (pedido do cliente, via founder): "baixa
            # manual" é quando um número não vende organicamente até o
            # sorteio fechar, e um admin marca o pedido como "paid" na mão
            # (approvedBy="admin") em vez de vir de um gateway real
            # (approvedBy="paysure"/"pay2m"). Confirmado ao vivo: 647
            # números em 10 dias/295 sorteios, 11 casos onde o número de
            # baixa manual GANHOU o prêmio do dia. Esse valor já está
            # dentro do "Valor" acima (conta como pedido pago hoje) — este
            # campo só permite separar depois, não muda nada no cálculo
            # existente.
            "ApprovedBy": participante.get("approvedBy") or "",
            "ExpiredBy": participante.get("expiredBy") or "",
            "Data": participante.get("createdAt", ""),
            "PaymentAt": participante.get("paymentAt") or "",
            "Canal_Atribuicao": canal,
            "Veio_De_Anuncio": veio_de_anuncio_pago,
            "UTM_Source": utm_source,
            "UTM_Campaign": participante.get("utmCampaign") or "",
            "UTM_Medium": participante.get("utmMedium") or "",
            "UTM_Content": participante.get("utmContent") or "",
            "UTM_Term": participante.get("utmTerm") or "",
            "Fbc": fbc,
            "Fbc_Idade_Dias": round(fbc_idade_dias, 1) if fbc_idade_dias is not None else "",
            "Fbp": fbp,
            "Gclid": gclid,
            "Ttclid": ttclid,
            "Affiliate": affiliate,
            "Ip": participante.get("ip") or "",
            "UserAgent": participante.get("userAgent") or "",
        }

    def processar_lote(self, participantes_data):
        """Converte uma lista de pedidos crus em linhas de dados brutos,
        pulando os sem valor. Usado pelo collector por sorteio."""
        linhas = []
        for participante in participantes_data:
            try:
                linha = self.extrair_linha_pedido(participante)
                if linha:
                    linhas.append(linha)
            except Exception as e:
                print(f"⚠️ Erro ao processar participante: {e}")
        return linhas
