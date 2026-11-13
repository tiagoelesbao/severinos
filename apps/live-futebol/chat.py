# -*- coding: utf-8 -*-
"""Leitura do chat da live do YouTube — sem chave, sem cota, sem custo.

POR QUE NAO A API OFICIAL
  `liveChatMessages.list` da Data API v3 custa 5 unidades por chamada contra uma
  cota diaria de 10.000. Uma partida de duas horas com leitura a cada 5 s sao
  1.440 chamadas = 7.200 unidades: cabe em UM jogo por dia, e mais nada. Duas
  transmissoes no mesmo dia ja estouram. Aumentar a cota exige pedido e revisao.

  O caminho usado aqui e o mesmo que o player do YouTube usa no navegador:
  `youtubei/v1/live_chat/get_live_chat`, com a chave publica que vem embutida na
  propria pagina. Sem cadastro, sem limite publicado. E a mesma classe de risco
  dos endpoints da ESPN — nao documentados, podem mudar sem aviso — e por isso
  este arquivo trata ausencia de campo como normal e NUNCA levanta para fora:
  chat fora do ar significa live sem interacao, nunca live derrubada.

O QUE ESTE ARQUIVO NAO FAZ
  Nao decide o que vai ao ar. Ele entrega mensagem crua; quem escolhe o que
  merece voz e `chat_triagem.py`. A separacao e proposital: ler e uma questao
  de rede, escolher e uma questao editorial, e misturar as duas foi como muitos
  canais acabaram lendo em voz alta o que nao deviam.
"""
import json
import re
import sys
import threading
import time
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AGENTE = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
BASE_YT = "https://www.youtube.com"


def id_do_video(txt):
    """Aceita id puro, URL de watch, de live ou encurtada."""
    txt = (txt or "").strip()
    if re.fullmatch(r"[\w-]{11}", txt):
        return txt
    m = re.search(r"(?:v=|/live/|youtu\.be/|/embed/)([\w-]{11})", txt)
    return m.group(1) if m else None


def _pega(url, dados=None, cabecalhos=None):
    h = {"User-Agent": AGENTE, "Accept-Language": "pt-BR,pt;q=0.9"}
    h.update(cabecalhos or {})
    corpo = None
    if dados is not None:
        corpo = json.dumps(dados).encode("utf-8")
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=corpo, headers=h)
    with urllib.request.urlopen(req, timeout=20) as r:
        bruto = r.read().decode("utf-8", "replace")
    return bruto


def _acha_json(texto, marcador):
    """Extrai o objeto JSON que comeca logo depois de `marcador`.

    A pagina do YouTube nao entrega JSON limpo — ele vem dentro de um <script>,
    seguido de codigo. Contar chaves e o jeito de achar onde o objeto termina
    sem depender de regex, que quebra no primeiro `}` dentro de uma string.
    """
    i = texto.find(marcador)
    if i < 0:
        return None
    i = texto.find("{", i)
    if i < 0:
        return None
    prof, na_string, escapa = 0, False, False
    for j in range(i, len(texto)):
        c = texto[j]
        if escapa:
            escapa = False
            continue
        if c == "\\":
            escapa = True
            continue
        if c == '"':
            na_string = not na_string
            continue
        if na_string:
            continue
        if c == "{":
            prof += 1
        elif c == "}":
            prof -= 1
            if prof == 0:
                try:
                    return json.loads(texto[i:j + 1])
                except ValueError:
                    return None
    return None


def _procura_continuation(o):
    """A primeira `continuation` que aparecer na arvore. O YouTube troca o
    caminho exato entre versoes; procurar pela chave sobrevive a isso."""
    if isinstance(o, dict):
        for k in ("continuation",):
            v = o.get(k)
            if isinstance(v, str) and len(v) > 20:
                return v
        for v in o.values():
            r = _procura_continuation(v)
            if r:
                return r
    elif isinstance(o, list):
        for v in o:
            r = _procura_continuation(v)
            if r:
                return r
    return None


def _texto_da_mensagem(msg):
    """`runs` mistura texto e emoji; emoji vira o rotulo dele, ou some."""
    partes = []
    for r in ((msg.get("message") or {}).get("runs") or []):
        if "text" in r:
            partes.append(r["text"])
        elif "emoji" in r:
            e = r["emoji"]
            if not (e.get("isCustomEmoji")):
                partes.append((e.get("emojiId") or ""))
    return "".join(partes).strip()


class LeitorDeChat:
    """Le o chat de uma live e devolve mensagens novas a cada chamada.

    Uso:
        l = LeitorDeChat("https://youtube.com/watch?v=...")
        if l.abre():
            while True:
                for m in l.novas():
                    ...
                time.sleep(l.intervalo)
    """

    def __init__(self, video, limite_por_ciclo=60):
        self.video = id_do_video(video)
        self.chave = None
        self.cont = None
        self.cliente = None
        self.intervalo = 5.0
        self.limite = limite_por_ciclo
        self.vivo = False
        self.erro = None
        self.vistos = set()
        self._trava = threading.Lock()

    # ── abertura ────────────────────────────────────────────────────────────
    def abre(self):
        """Descobre a chave publica e o ponto de partida do chat."""
        if not self.video:
            self.erro = "não reconheci o id do vídeo"
            return False
        try:
            pag = _pega("%s/live_chat?is_popout=1&v=%s" % (BASE_YT, self.video))
        except Exception as e:
            self.erro = "não abriu a página do chat: %s" % str(e)[:70]
            return False

        m = re.search(r'"INNERTUBE_API_KEY":"([\w-]+)"', pag)
        if not m:
            self.erro = "chat indisponível (live sem chat, encerrada ou restrita)"
            return False
        self.chave = m.group(1)

        cfg = _acha_json(pag, "INNERTUBE_CONTEXT") or {}
        self.cliente = (cfg.get("client") or {})
        if not self.cliente.get("clientVersion"):
            v = re.search(r'"clientVersion":"([\d.]+)"', pag)
            self.cliente = {"clientName": "WEB",
                            "clientVersion": v.group(1) if v else "2.20240101.00.00",
                            "hl": "pt-BR", "gl": "BR"}

        dados = _acha_json(pag, "ytInitialData")
        self.cont = _procura_continuation(dados) if dados else None
        if not self.cont:
            self.erro = "não achei o ponto de partida do chat"
            return False
        self.vivo = True
        self.erro = None
        return True

    # ── leitura ─────────────────────────────────────────────────────────────
    def novas(self):
        """Mensagens que chegaram desde a ultima chamada. Nunca levanta."""
        if not self.vivo or not self.cont:
            return []
        url = "%s/youtubei/v1/live_chat/get_live_chat?key=%s&prettyPrint=false" % (
            BASE_YT, self.chave)
        corpo = {"context": {"client": self.cliente}, "continuation": self.cont}
        try:
            d = json.loads(_pega(url, corpo))
        except Exception as e:
            # Falha de rede nao encerra o chat: a proxima volta tenta de novo
            # com o mesmo ponto de continuacao.
            self.erro = str(e)[:90]
            return []

        cont = ((d.get("continuationContents") or {}).get("liveChatContinuation")
                or {})
        conts = cont.get("continuations") or []
        if conts:
            c0 = conts[0]
            for chave in ("invalidationContinuationData", "timedContinuationData",
                          "reloadContinuationData", "liveChatReplayContinuationData"):
                if chave in c0:
                    dd = c0[chave]
                    self.cont = dd.get("continuation") or self.cont
                    ms = dd.get("timeoutMs")
                    if ms:
                        # O proprio YouTube diz de quanto em quanto tempo voltar.
                        # Respeitar isso e o que mantem a leitura discreta.
                        self.intervalo = max(2.0, min(10.0, ms / 1000.0))
                    break
            else:
                self.cont = _procura_continuation(c0) or self.cont

        saida = []
        for acao in (cont.get("actions") or []):
            item = (((acao.get("addChatItemAction") or {}).get("item")) or {})
            msg = item.get("liveChatTextMessageRenderer")
            if not msg:
                continue                # entrada de membro, super chat, sistema
            ident = msg.get("id") or ""
            if ident in self.vistos:
                continue
            self.vistos.add(ident)
            texto = _texto_da_mensagem(msg)
            if not texto:
                continue
            autor = ((msg.get("authorName") or {}).get("simpleText") or "").strip()
            saida.append({"id": ident, "autor": autor, "texto": texto,
                          "quando": time.time()})

        # O conjunto de ids vistos cresce a live inteira; 4 mil e muito mais que
        # qualquer janela util e impede a memoria de subir sem parar.
        if len(self.vistos) > 4000:
            self.vistos = set(list(self.vistos)[-2000:])
        return saida[-self.limite:]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("uso: python chat.py <url ou id da live>")
        sys.exit(1)
    l = LeitorDeChat(sys.argv[1])
    print("abrindo chat de %s ..." % l.video)
    if not l.abre():
        print("falhou: %s" % l.erro)
        sys.exit(1)
    print("ok — lendo a cada %.1fs. Ctrl+C para parar.\n" % l.intervalo)
    t0 = time.time()
    total = 0
    while time.time() - t0 < (float(sys.argv[2]) if len(sys.argv) > 2 else 30):
        for m in l.novas():
            total += 1
            print("  %-22s %s" % (m["autor"][:22], m["texto"][:78]))
        time.sleep(l.intervalo)
    print("\n%d mensagens em %.0fs" % (total, time.time() - t0))
