# -*- coding: utf-8 -*-
"""Mede os roteiros e gera o SRT que dirige a narração.

POR QUE ISTO EXISTE
  Eu escrevi "762 palavras, 5m01s" no cabeçalho de um roteiro sem contar. Eram 608.
  Numero no cabecalho tem que ser MEDIDO, nunca digitado — entao este script conta o
  texto real e reescreve o proprio cabecalho.

O RITMO VEM DA ESTRUTURA, NAO E UM NUMERO SO
  Medido na transcricao integral das duas referencias:
    referencia A (praticas)  -> 127,5 wpm   <- ritmo DELES, para modelar
    referencia B (reflexoes) -> 151,1 wpm   <- idem
    motor male02             -> 171,6 wpm   <- ritmo NOSSO, para prever duracao
  Um roteiro de 600 palavras dura 4m42s na A e 3m58s na B. Usar um numero unico
  erra a duracao em quase um minuto.

O SRT E A PARTITURA DE PROSODIA
  Regra do playbook, confirmada pela medicao: cue COLADO a duracao natural da fala,
  e intervalo aberto SO onde a pausa significa alguma coisa. Faixa util 0,4 a 0,8 s
  — a mediana medida na referencia v2 foi 0,72 s. Acima de 1,0 s vira buraco, que foi
  exatamente a queixa do founder no primeiro teste.

DUAS GRANULARIDADES, E ELAS NAO SAO A MESMA
  O SRT fino (76 cues numa peca de 5 min) serve para LEGENDA — palavra na tela no
  tempo certo. Ele NAO serve para gerar a narracao: o motor gera um arquivo por
  cue e concatena, e cada emenda vira uma parada. Medido na primeira peca: 47
  pausas acima de 250 ms, mediana 0,98 s, 16% do tempo em silencio digital, contra
  16 pausas em 42 minutos na referencia.

  Por isso saem DOIS arquivos:
    {roteiro}.srt          cues finos  -> legenda
    {roteiro}.blocos.json  paragrafos  -> narracao, um bloco por geracao

  Num roteiro de 20 min, isso e a diferenca entre ~300 emendas e ~40.

Uso:  python conta_roteiros.py            mede e reescreve os cabecalhos
      python conta_roteiros.py --srt      idem, grava .srt e .blocos.json
"""
import glob, io, json, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    "..", "..", "data", "roteiros", "estoico")
RAIZ = os.path.normpath(RAIZ)

# ─────────────────────────────────────────────────────────────────────────────
# DOIS WPM, E ELES NAO SAO INTERCAMBIAVEIS — medido em 2026-08-30
#
# WPM_REFERENCIA e o ritmo das pecas que MODELAMOS. Serve para entender o
# genero: quantas praticas cabem, quanto dura um bloco, onde o ritmo cai.
#
# WPM_MOTOR e o ritmo do que a NOSSA voz efetivamente produz. E o unico que
# serve para prever duracao.
#
# Confundir os dois custou uma geracao inteira: o LA1 foi escrito para 20m17s
# a 127,5 wpm e saiu com 14m56s. Medindo o audio real — 84 de 84 blocos, texto
# integral, sem truncamento — o motor `male02` fala a 171,6 wpm. O roteiro nao
# estava errado; a PREVISAO estava, porque usava o ritmo de outra pessoa.
#
# Para reprever: palavras_alvo = minutos_desejados x WPM_MOTOR.
# 20 min a 171,6 -> 3.432 palavras, e nao 2.550.
WPM_REFERENCIA = {"A": 127.5, "B": 151.1}

# Por voz. Medir com `mede_wpm_do_motor.py` depois da primeira peca de cada voz.
WPM_MOTOR = {"male02": 171.6}
VOZ_PADRAO = "male02"

# `WPM` continua sendo o usado no calculo — agora apontando para o motor.
WPM = {"A": WPM_MOTOR[VOZ_PADRAO], "B": WPM_MOTOR[VOZ_PADRAO]}
PAUSA_S = 0.6                      # dentro da faixa util medida
MIN_PALAVRAS_CUE = 6
MAX_PALAVRAS_CUE = 14

GRAVA_SRT = "--srt" in sys.argv


def limpa_citacao(linha):
    """Tira a marca de blockquote e o italico, deixando so a fala."""
    t = linha.lstrip(">").strip()
    return t.strip("*").strip() if t.startswith("*") and t.endswith("*") else t


def do_primeiro_secao(texto):
    """Descarta frontmatter, titulo e nota de cabecalho — tudo antes de `## `.

    A nota que abre cada roteiro e escrita como blockquote, igual as citacoes
    narradas da estrutura B. O que as separa nao e a marca, e a posicao.
    """
    m = re.search(r"^## ", texto, re.M)
    return texto[m.start():] if m else texto


def blocos_narrados(texto):
    """Paragrafos inteiros, na ordem — a unidade de GERACAO da narracao.

    Um paragrafo e uma respiracao. Gerar por paragrafo mantem a prosodia continua
    dentro dele; so a fronteira entre paragrafos vira emenda, e ali a pausa e
    desejada.
    """
    texto = do_primeiro_secao(texto)
    if texto.startswith("---"):
        texto = texto.split("---", 2)[2]
    blocos, atual = [], []
    for l in texto.split(chr(10)):
        s = l.strip()
        if not s:
            if atual:
                blocos.append(" ".join(atual))
                atual = []
            continue
        # `>` NAO entra aqui: na estrutura B a citacao em blockquote e NARRADA.
        # Descarta-la subestimava a peca e deslocava os marcadores de imagem, que
        # sao casados por contagem de palavras.
        if s.startswith(("#", "---", "**[img")):
            if atual:
                blocos.append(" ".join(atual))
                atual = []
            continue
        s = re.sub(r"\*\(.*?\)\*", "", s)      # (marcador de movimento) - some
        s = re.sub(r"\*\*(.*?)\*\*", r"\1", s)  # negrito - o conteudo fica
        s = re.sub(r"\*(.*?)\*", r"\1", s)      # italico - idem
        # A citacao que abre cada reflexao da estrutura B e NARRADA. Sem tirar
        # a marca de blockquote, o ">" entraria no texto entregue ao TTS.
        s = s.lstrip(">").strip()
        s = s.replace("‖", "").strip()
        if s:
            atual.append(s)
    if atual:
        blocos.append(" ".join(atual))
    return blocos


def corpo_narrado(texto):
    """So o que a VOZ diz. Fora: cabecalho, titulos, notas, marcadores de imagem."""
    texto = do_primeiro_secao(texto)
    if texto.startswith("---"):
        texto = texto.split("---", 2)[2]
    linhas = []
    for l in texto.split("\n"):
        s = l.strip()
        if not s or s.startswith(("#", "---", "**[img")):
            continue
        s = re.sub(r"\*\(.*?\)\*", "", s)        # (marcador de movimento)
        s = re.sub(r"\*\*(.*?)\*\*", r"\1", s)   # negrito
        s = re.sub(r"\*(.*?)\*", r"\1", s)       # italico (citacao)
        # A marca de blockquote sai do TEXTO. A citacao que abre cada reflexao
        # da estrutura B e narrada; o ">" e formatacao de markdown e chegaria
        # ao TTS como se fosse fala.
        s = s.lstrip(">").strip()
        if s:
            linhas.append(s)
    return "\n".join(linhas)


def em_cues(corpo, wpm):
    """Quebra em cues por frase, respeitando o marcador de pausa.

    Cada cue recebe a duracao NATURAL da fala dele. A folga so existe onde o
    roteiro pediu, com o marcador de pausa.
    """
    cues, t = [], 0.0
    for bloco in corpo.split("\n"):
        # o marcador de pausa vira uma marca no fim do cue em que aparece
        partes = re.split(r"(‖)", bloco)
        buf = []
        for p in partes:
            if p == "‖":
                if buf:
                    buf[-1]["pausa_depois"] = True
                continue
            for frase in re.split(r"(?<=[.!?])\s+", p.strip()):
                if not frase:
                    continue
                palavras = frase.split()
                # frase longa vira mais de um cue, quebrando na virgula
                while palavras:
                    if len(palavras) <= MAX_PALAVRAS_CUE:
                        pedaco, palavras = palavras, []
                    else:
                        corte = MAX_PALAVRAS_CUE
                        for i in range(MAX_PALAVRAS_CUE, MIN_PALAVRAS_CUE - 1, -1):
                            if palavras[i - 1].endswith((",", ";", ":", "—")):
                                corte = i
                                break
                        pedaco, palavras = palavras[:corte], palavras[corte:]
                    buf.append({"texto": " ".join(pedaco), "pausa_depois": False})
        cues.extend(buf)

    for c in cues:
        dur = len(c["texto"].split()) / wpm * 60.0
        c["inicio"] = t
        c["fim"] = t + dur
        t = c["fim"] + (PAUSA_S if c["pausa_depois"] else 0.0)
    return cues, t


def hhmmss(s):
    return "%02d:%02d:%02d,%03d" % (s // 3600, s % 3600 // 60, s % 60, (s % 1) * 1000)


def main():
    arquivos = sorted(f for f in glob.glob(os.path.join(RAIZ, "*.md"))
                      if not os.path.basename(f).startswith("_"))
    print("%-22s %-3s %7s %9s %6s %7s %7s" %
          ("roteiro", "est", "palavras", "duracao", "cues", "pausas", "blocos"))
    total = 0.0
    for f in arquivos:
        txt = open(f, encoding="utf-8").read()
        est = re.search(r"^estrutura:\s*(\w+)", txt, re.M)
        est = est.group(1) if est else "A"
        wpm = WPM[est]

        corpo = corpo_narrado(txt)
        n = len(corpo.split())
        cues, dur = em_cues(corpo, wpm)
        pausas = sum(1 for c in cues if c["pausa_depois"])
        total += dur

        legivel = "%dm%02ds" % (dur // 60, dur % 60)
        txt = re.sub(r"^palavras:.*$", "palavras: %d" % n, txt, flags=re.M)
        txt = re.sub(r"^duracao_calculada:.*$",
                     "duracao_calculada: %s   # %.1f wpm, medido na referencia"
                     % (legivel, wpm), txt, flags=re.M)
        open(f, "w", encoding="utf-8").write(txt)

        if GRAVA_SRT:
            blocos = blocos_narrados(txt)
            json.dump(
                {"roteiro": os.path.basename(f)[:-3], "wpm": wpm,
                 "blocos": [{"i": i, "palavras": len(b.split()),
                             "duracao_s": round(len(b.split()) / wpm * 60, 1),
                             "texto": b}
                            for i, b in enumerate(blocos)]},
                io.open(os.path.splitext(f)[0] + ".blocos.json", "w",
                        encoding="utf-8"), ensure_ascii=False, indent=1)
            srt = os.path.splitext(f)[0] + ".srt"
            with open(srt, "w", encoding="utf-8") as out:
                for i, c in enumerate(cues, 1):
                    out.write("%d\n%s --> %s\n%s\n\n" %
                              (i, hhmmss(c["inicio"]), hhmmss(c["fim"]), c["texto"]))

        print("%-22s %-3s %7d %9s %6d %7d %7d" %
              (os.path.basename(f)[:-3], est, n, legivel, len(cues), pausas,
               len(blocos_narrados(txt))))

    print("\n  %d roteiros · %dm%02ds de narracao no total"
          % (len(arquivos), total // 60, total % 60))
    if GRAVA_SRT:
        print("  SRT gravados ao lado de cada roteiro")


if __name__ == "__main__":
    main()
