# -*- coding: utf-8 -*-
"""Triagem do chat — o que merece voz, e o que a voz vai dizer.

A REGRA QUE ORGANIZA TUDO: NADA DO CHAT E LIDO LITERALMENTE

  Ler mensagem de estranho em voz alta e entregar o microfone do canal para
  qualquer pessoa com um teclado. Nao e risco teorico: e o modo mais comum de
  um canal monetizado tomar strike, e basta UMA mensagem entre dez mil.

  Entao o texto da mensagem nunca vira audio. Ele e usado apenas para
  CLASSIFICAR a intencao, e a resposta sai de dado que ja esta na tela:

      "quanto ta?"          -> o placar real, lido da API
      "quem fez o gol?"     -> o autor real do ultimo gol
      "salve de recife"     -> saudacao ao nome e a cidade, nada mais
      "vai dar 2 a 1"       -> nao vira fala sozinha; entra na CONTAGEM

  A unica coisa vinda do chat que chega ao ar e o NOME de quem escreveu, e
  mesmo ele passa por peneira de caracteres e por lista de bloqueio.

POR QUE PALPITE VIRA AGREGADO, E NAO FALA INDIVIDUAL
  "O Joao aqui no chat acha que vai dar 2 a 1" nao interessa a ninguem alem do
  Joao. "A galera aqui ta dividida: metade aposta no empate" interessa a todo
  mundo, porque fala do grupo. Agregar tambem dilui qualquer tentativa de usar
  o palpite para colocar texto no ar.

RITMO
  No maximo uma interacao por `INTERVALO_S`, e nunca por cima de um lance. Um
  locutor que responde toda mensagem para de narrar o jogo — e o jogo e o
  motivo de as pessoas estarem ali.
"""
import re
import time
import unicodedata

INTERVALO_S = 90          # minimo entre duas interacoes com o chat
JANELA_PALPITE_S = 300    # quanto tempo um palpite conta para o agregado
MIN_PALPITES = 6          # abaixo disso, "a galera acha" seria mentira

# ─────────────────────────────────────────────────────────────────────────────
# Peneira do nome — a UNICA coisa do chat que vai ao ar
# ─────────────────────────────────────────────────────────────────────────────

# Termos que barram o nome inteiro. A lista e curta de proposito: ela pega o
# obvio, e o que passa dela e barrado pela peneira de caracteres logo abaixo.
BLOQUEIO = {
    "cu", "caralho", "porra", "buceta", "viado", "viadinho", "puta", "puto",
    "merda", "foda", "fdp", "pnc", "nazi", "hitler", "macaco", "preto",
    "xvideos", "onlyfans", "bet", "apostas", "telegram", "whatsapp", "wpp",
    "http", "www", "com.br", ".com", "ganhe", "lucro", "pix",
}


def _sem_acento(t):
    t = unicodedata.normalize("NFD", t)
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def nome_seguro(autor):
    """Nome pronunciavel e publicavel, ou None.

    Devolver None e o caso NORMAL, nao o excecional: a maioria dos apelidos do
    YouTube e impronunciavel ("@user-xk92j3"), e uma saudacao a um nome que a
    voz nao consegue falar soa pior que nenhuma saudacao.
    """
    if not autor:
        return None
    n = autor.strip().lstrip("@").strip()
    base = _sem_acento(n).lower()
    for termo in BLOQUEIO:
        if termo in base:
            return None
    # Apelido gerado pelo YouTube: letras coladas com numeros e hifens soltos.
    if re.search(r"[-_]\w*\d", base) or sum(c.isdigit() for c in base) >= 3:
        return None
    # So o que a voz sabe ler.
    n = re.sub(r"[^A-Za-zÀ-ÿ ]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    if not (2 <= len(n) <= 22):
        return None
    # Um nome so, ou nome e sobrenome. Frase inteira como apelido nao entra.
    partes = n.split()
    if len(partes) > 2:
        n = " ".join(partes[:2])
    if len(partes[0]) < 2:
        return None
    return n.title()


# ─────────────────────────────────────────────────────────────────────────────
# Classificacao de intencao — so pelo texto, que nunca sai daqui
# ─────────────────────────────────────────────────────────────────────────────

RE_PLACAR = re.compile(
    r"\b(quanto (ta|esta|tá|está)|qual (o |e o |é o )?placar|"
    r"como (ta|tá|esta|está) o jogo|ta quanto|tá quanto|placar\?)", re.I)
RE_TEMPO = re.compile(
    r"\b(que minuto|quanto tempo|qual minuto|que tempo|"
    r"(ta|tá|esta|está) no (primeiro|segundo) tempo|acabou\?)", re.I)
RE_GOL = re.compile(
    r"\b(quem fez o gol|quem marcou|de quem foi o gol|quem fez\?)", re.I)
RE_SAUDACAO = re.compile(
    r"\b(bo(a|m) (noite|tarde|dia)|salve|cheguei|primeira vez|"
    r"acabei de chegar|de onde|tô aqui|to aqui|assistindo)", re.I)
RE_ELOGIO = re.compile(
    r"\b(mano|muito bom|top|show|melhor (canal|live|transmiss)|"
    r"parabens|parabéns|curtindo|adorando)", re.I)
# "2x1", "2 a 1", "2-1" — placar palpitado
RE_PALPITE_PLACAR = re.compile(r"\b(\d)\s*(?:x|a|-)\s*(\d)\b", re.I)

CIDADES = [
    "são paulo", "rio de janeiro", "belo horizonte", "salvador", "brasília",
    "fortaleza", "curitiba", "recife", "porto alegre", "manaus", "belém",
    "goiânia", "guarulhos", "campinas", "são luís", "maceió", "natal",
    "teresina", "campo grande", "joão pessoa", "santos", "florianópolis",
    "vitória", "cuiabá", "aracaju", "londrina", "uberlândia", "sorocaba",
    "ribeirão preto", "niterói", "juiz de fora", "caxias do sul", "portugal",
    "japão", "estados unidos", "angola", "moçambique",
]


def _cidade(texto):
    t = _sem_acento(texto).lower()
    for c in CIDADES:
        if _sem_acento(c) in t:
            return c.title()
    return None


def classifica(texto):
    """(intencao, extra). `extra` carrega o que a intencao precisa."""
    t = (texto or "").strip()
    if not (2 <= len(t) <= 220):
        return None, None
    if RE_GOL.search(t):
        return "gol", None
    if RE_PLACAR.search(t):
        return "placar", None
    if RE_TEMPO.search(t):
        return "tempo", None
    m = RE_PALPITE_PLACAR.search(t)
    if m:
        return "palpite", (int(m.group(1)), int(m.group(2)))
    if RE_SAUDACAO.search(t):
        return "saudacao", _cidade(t)
    if RE_ELOGIO.search(t):
        return "elogio", None
    return None, None


# ─────────────────────────────────────────────────────────────────────────────
# Montagem da fala — sempre com dado da tela, nunca com texto do chat
# ─────────────────────────────────────────────────────────────────────────────

def _placar_falado(d):
    return "%s %s a %s %s" % (d["casa"]["nome"], d["casa"]["placar"],
                              d["fora"]["placar"], d["fora"]["nome"])


def _minuto_falado(txt):
    """"67'" vira "67 minutos". O apostrofo e simbolo de tela, nao de fala — a
    voz o le como pausa ou como nada, e o numero fica solto no ar."""
    if not txt:
        return ""
    n = re.match(r"\s*(\d+)", str(txt))
    return ("%s minutos" % n.group(1)) if n else ""


def _ultimo_gol(d):
    for e in (d.get("eventos") or []):
        if e.get("tipo") in ("Goal", "Penalty - Scored", "Own Goal"):
            return e
    return None


class TriagemDeChat:
    """Recebe mensagens cruas, devolve no maximo uma fala por vez."""

    def __init__(self, intervalo_s=INTERVALO_S):
        self.intervalo_s = intervalo_s
        self.ultima_em = 0.0
        self.palpites = []          # [(quando, casa, fora)]
        self.fila = []              # intencoes esperando a vez
        self.ja_saudados = set()
        self.contagem = {"lidas": 0, "classificadas": 0, "faladas": 0}

    # ── entrada ─────────────────────────────────────────────────────────────
    def absorve(self, mensagens):
        """Classifica o lote e guarda o que pode virar fala."""
        agora = time.time()
        for m in mensagens:
            self.contagem["lidas"] += 1
            intencao, extra = classifica(m.get("texto"))
            if not intencao:
                continue
            self.contagem["classificadas"] += 1
            if intencao == "palpite":
                self.palpites.append((agora, extra[0], extra[1]))
                continue            # palpite NUNCA vira fala sozinho
            nome = nome_seguro(m.get("autor"))
            if intencao == "saudacao":
                if not nome or nome in self.ja_saudados:
                    continue
                self.ja_saudados.add(nome)
                # Numa live de duas horas com chat cheio, guardar todo nome ja
                # saudado faria o conjunto crescer sem teto. Mil e mais do que
                # qualquer transmissao consegue saudar, e cortar pela metade
                # apenas libera nomes antigos para uma nova saudacao — que a
                # essa altura ja soa como reconhecimento, nao como repeticao.
                if len(self.ja_saudados) > 1000:
                    self.ja_saudados = set(list(self.ja_saudados)[-500:])
            self.fila.append({"intencao": intencao, "nome": nome, "extra": extra})
        # A fila nao acumula a live inteira: pergunta de dez minutos atras
        # respondida agora soa como transmissao travada.
        self.fila = self.fila[-8:]

    # ── saida ───────────────────────────────────────────────────────────────
    def fala(self, d, agora=None):
        """Uma fala de interacao, ou None. Nunca levanta."""
        agora = agora or time.time()
        if agora - self.ultima_em < self.intervalo_s:
            return None
        try:
            f = self._monta(d, agora)
        except Exception:
            return None             # chat quebrado nao pode calar o narrador
        if f:
            self.ultima_em = agora
            self.contagem["faladas"] += 1
        return f

    def _monta(self, d, agora):
        # 1. o agregado de palpites tem prioridade quando ha massa suficiente
        self.palpites = [p for p in self.palpites
                         if agora - p[0] <= JANELA_PALPITE_S]
        if len(self.palpites) >= MIN_PALPITES:
            texto = self._texto_palpites(d)
            self.palpites = []
            if texto:
                return {"texto": texto, "prioridade": "baixa",
                        "chave": "chat-palpite-%d" % int(agora)}

        # 2. senao, a pergunta mais antiga que ainda faz sentido
        while self.fila:
            item = self.fila.pop(0)
            texto = self._texto_do_item(item, d)
            if texto:
                return {"texto": texto, "prioridade": "baixa",
                        "chave": "chat-%s-%d" % (item["intencao"], int(agora))}
        return None

    def _texto_do_item(self, item, d):
        """A frase e montada em duas metades: quem perguntou (do chat, so o
        nome) e a resposta (da tela, sempre). Sem nome, a pergunta vira
        impessoal — nunca uma frase truncada."""
        nome, i = item["nome"], item["intencao"]
        if i == "placar":
            abre = ("%s pergunta o placar aqui no chat" % nome) if nome                 else "Perguntaram o placar aqui no chat"
            return "%s: %s." % (abre, _placar_falado(d))
        if i == "tempo":
            rel = _minuto_falado(d.get("relogio"))
            est = (d.get("estado") or "").strip()
            onde = rel or est
            if not onde:
                return None
            abre = ("%s, o jogo está" % nome) if nome else "O jogo está"
            return "%s em %s." % (abre, onde)
        if i == "gol":
            g = _ultimo_gol(d)
            if not g or not g.get("quem"):
                return None
            apoio = (", com assistência de %s" % g["apoio"]) if g.get("apoio") else ""
            minuto = _minuto_falado(g.get("min"))
            quando = (", aos %s" % minuto) if minuto else ""
            abre = ("%s, o gol foi de" % nome) if nome else "O gol foi de"
            return "%s %s%s%s." % (abre, g["quem"], apoio, quando)
        if i == "saudacao":
            cid = item.get("extra")
            if nome and cid:
                return "Salve, %s, de %s! Bem-vindo à transmissão." % (nome, cid)
            if nome:
                return "Salve, %s! Bem-vindo à transmissão." % nome
            return None
        if i == "elogio":
            if not nome:
                return None
            return "Valeu, %s! Fica com a gente até o fim." % nome
        return None

    def _texto_palpites(self, d):
        """O que o chat acha do resultado — como grupo, nunca um a um."""
        casa = sum(1 for _, a, b in self.palpites if a > b)
        fora = sum(1 for _, a, b in self.palpites if b > a)
        emp = sum(1 for _, a, b in self.palpites if a == b)
        n = casa + fora + emp
        if n < MIN_PALPITES:
            return None
        nc, nf = d["casa"]["nome"], d["fora"]["nome"]
        maior = max(casa, fora, emp)
        if maior <= n * 0.45:
            return ("A galera aqui no chat está dividida sobre o resultado: "
                    "%d apostam no %s, %d no %s e %d no empate."
                    % (casa, nc, fora, nf, emp))
        if maior == emp:
            return "A maioria do chat está apostando no empate. %d de %d palpites." % (emp, n)
        time_ = nc if casa >= fora else nf
        return "O chat aposta no %s: %d de %d palpites dão a vitória para eles." % (
            time_, maior, n)


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    exemplos = [
        ("Joao Pedro", "quanto ta o jogo?"),
        ("@user-xk92j3", "quanto ta?"),
        ("Marina", "boa noite, salve de Recife!"),
        ("Carlos", "quem fez o gol?"),
        ("Rafa", "vai dar 2x1"),
        ("Bia", "acho que 1 a 1"),
        ("Tiago", "3x0 fácil"),
        ("Leo", "2 a 0"),
        ("Ana", "1x1"),
        ("Pedro", "2-1"),
        ("cuzao123", "boa noite"),
        ("Julia", "melhor canal de futebol"),
        ("Spam", "ganhe dinheiro no telegram t.me/xxx"),
        ("Ze", "kkkkkkk"),
    ]
    print("PENEIRA DO NOME (o unico dado do chat que vai ao ar)")
    for a, _ in exemplos:
        print("  %-16s -> %s" % (a, nome_seguro(a) or "— barrado"))

    print("\nCLASSIFICACAO")
    for a, t in exemplos:
        i, e = classifica(t)
        print("  %-38s -> %-10s %s" % (t[:38], i or "ignorada", e if e else ""))

    print("\nO QUE SAI NO AR")
    d = {"casa": {"nome": "Flamengo", "placar": "2"},
         "fora": {"nome": "Botafogo", "placar": "1"},
         "relogio": "67'", "estado": "2º tempo",
         "eventos": [{"tipo": "Goal", "quem": "Samuel Lino",
                      "apoio": "Jorginho", "min": "13'"}]}
    tri = TriagemDeChat(intervalo_s=0)
    tri.absorve([{"autor": a, "texto": t} for a, t in exemplos])
    for _ in range(6):
        f = tri.fala(d)
        if not f:
            break
        print("  %s" % f["texto"])
    print("\nlidas %d · classificadas %d · faladas %d"
          % (tri.contagem["lidas"], tri.contagem["classificadas"],
             tri.contagem["faladas"]))
