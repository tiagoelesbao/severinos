# -*- coding: utf-8 -*-
"""Audita a locucao gerada transcrevendo ela de volta e comparando com o roteiro.

POR QUE ISTO EXISTE
  O motor de TTS falha CALADO. Ele ja devolveu audio de um segundo reportando
  `success`, e ja comeu uma frase inteira quando o numero estava por extenso. Um
  audio que existe e toca nao prova que ele diz o que o roteiro escreveu.

  A unica verificacao que pega isso e ouvir de volta: transcrever o mp3 gerado e
  medir a distancia ate o texto que o originou.

COMO LER O NUMERO
  WER e taxa de erro por palavra, por distancia de edicao.

    ate 12%   normal — o transcritor tambem erra, e a diferenca costuma ser
              grafia ("bodafogo", "a bel") e nao fala
    12-25%    conferir com `diff` — provavelmente o motor trocou palavra
    acima 25% bloco perdido — refazer

  Piso zero nao existe e nao deve ser perseguido: apertar a normalizacao ate o
  numero zerar e calibrar a regua contra o resultado desejado, e ela para de
  detectar o defeito real — frase comida e audio truncado.

  O piso nunca e zero: o transcritor tambem erra, e ele escreve "52" onde o
  roteiro pediu "cinquenta e dois". A normalizacao abaixo cuida da maior parte
  dessas diferencas de grafia para o numero medir fala, e nao ortografia.

USO
  python -X utf8 audita_narracao.py 2026-09-04-abel-stjd
"""
import argparse
import os
import re
import sys

from narra_comfy import CANAL, blocos_do_roteiro

UNI = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito",
       "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis",
       "dezessete", "dezoito", "dezenove"]
DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta",
       "setenta", "oitenta", "noventa"]
CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
       "seiscentos", "setecentos", "oitocentos", "novecentos"]


def extenso(n):
    """Numero para extenso em pt-BR ate 9999 — o suficiente para um roteiro."""
    if n < 20:
        return UNI[n]
    if n < 100:
        d, u = divmod(n, 10)
        return DEZ[d] + (" e " + UNI[u] if u else "")
    if n < 1000:
        c, r = divmod(n, 100)
        if n == 100:
            return "cem"
        return CEM[c] + (" e " + extenso(r) if r else "")
    m, r = divmod(n, 1000)
    cab = "mil" if m == 1 else extenso(m) + " mil"
    return cab + (" e " + extenso(r) if r else "")


ORDINAIS = {
    "primeir": 1, "segund": 2, "terceir": 3, "quart": 4, "quint": 5,
    "sext": 6, "setim": 7, "sétim": 7, "oitav": 8, "non": 9, "decim": 10,
    "décim": 10, "vigesim": 20, "vigésim": 20, "trigesim": 30, "trigésim": 30,
}
IGUAIS = {          # grafias distintas para o mesmo som
    "num": "no", "numa": "na", "nuns": "nos", "numas": "nas",
    "pra": "para", "pro": "para o", "dum": "de um", "duma": "de uma",
    "meia": "trinta", "h": "",
}


def sem_acento(t):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", t)
                   if unicodedata.category(c) != "Mn")


def normaliza(t):
    """Deixa so o que e FALA: sem marcacao, sem pontuacao, numero por extenso."""
    t = re.sub(r"\[F\d+\]", " ", t)
    t = t.replace("*", " ").replace("`", " ").replace("—", " ").replace("–", " ")
    t = t.replace("R$", " reais ")
    # 48,33 -> "quarenta e oito virgula trinta e tres"
    t = re.sub(r"(\d+),(\d+)", lambda m: "%s virgula %s" % (m.group(1), m.group(2)), t)
    t = re.sub(r"(\d)\.(\d{3})\b", r"\1\2", t)          # 2.500 -> 2500
    t = re.sub(r"\d+", lambda m: " %s " % extenso(int(m.group(0)))
               if int(m.group(0)) < 10000 else m.group(0), t)
    t = sem_acento(t.lower())
    t = re.sub(r"[^a-z\s]", " ", t)
    saida = []
    for p in t.split():
        for raiz, n in ORDINAIS.items():
            if p.startswith(sem_acento(raiz)) and len(p) - len(raiz) <= 2:
                p = sem_acento(extenso(n))
                break
        p = IGUAIS.get(p, p)
        if p:
            saida.append(p)
    return " ".join(saida)


def wer(ref, hip):
    """Distancia de edicao por palavra, dividida pelo tamanho da referencia."""
    r, h = ref.split(), hip.split()
    if not r:
        return 0.0
    ant = list(range(len(h) + 1))
    for i, pr in enumerate(r, 1):
        atual = [i]
        for j, ph in enumerate(h, 1):
            atual.append(min(ant[j] + 1, atual[j - 1] + 1,
                             ant[j - 1] + (pr != ph)))
        ant = atual
    return ant[-1] / len(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--modelo", default="small",
                    help="modelo do faster-whisper (small basta para medir WER)")
    a = ap.parse_args()

    pack = os.path.join(CANAL, "episodios", a.slug)
    brutos = os.path.join(pack, "03-narracao", "_blocos")
    roteiro = os.path.join(pack, "02-roteiro", "roteiro.md")

    grupos, ordem = {}, []
    for nome, txt in blocos_do_roteiro(roteiro):
        grupos.setdefault(nome, []).append(txt)
        if nome not in ordem:
            ordem.append(nome)

    from faster_whisper import WhisperModel
    print("carregando %s..." % a.modelo)
    m = WhisperModel(a.modelo, device="cpu", compute_type="int8")

    print("\n%-3s %-30s %7s %7s  %s" % ("#", "BLOCO", "WER", "PALAVRAS", ""))
    print("─" * 62)
    ruins, pior = 0, 0.0
    for i, nome in enumerate(ordem, 1):
        mp3 = os.path.join(brutos, "%02d.mp3" % i)
        if not os.path.isfile(mp3):
            print("%-3d %-30s   sem áudio" % (i, nome[:30]))
            ruins += 1
            continue
        ref = normaliza(" ".join(grupos[nome]))
        seg, _ = m.transcribe(mp3, language="pt", beam_size=1)
        hip = normaliza(" ".join(s.text for s in seg))
        e = wer(ref, hip) * 100
        pior = max(pior, e)
        marca = "OK" if e <= 12 else ("CONFERIR" if e <= 25 else "REFAZER")
        if e > 12:
            ruins += 1
        print("%-3d %-30s %6.1f%% %7d  %s" % (i, nome[:30], e,
                                              len(ref.split()), marca))

    print("─" * 62)
    print("pior bloco: %.1f%%   ·   %d bloco(s) fora da faixa" % (pior, ruins))
    return 1 if ruins else 0


if __name__ == "__main__":
    sys.exit(main())
