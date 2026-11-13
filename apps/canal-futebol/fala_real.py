# -*- coding: utf-8 -*-
"""Transcreve o `vo.mp3` e grava ONDE cada palavra e realmente dita.

POR QUE ISTO EXISTE
  A montagem precisa saber em que segundo a locucao chega em cada assunto. Ate
  06/09 eu usava o `roteiro.blocos.srt` para isso -- e ele e uma ESTIMATIVA: o
  `narra_comfy` monta a regua a 135 wpm e o motor fala a ~196. Num episodio de
  10 minutos isso da mais de dois minutos de deriva.

  O founder pegou o efeito disso na tela: a cartela aparecia e saia enquanto o
  assunto ainda estava sendo falado, porque a posicao vinha do ROTEIRO e nao do
  AUDIO.

  Aqui a fonte passa a ser o audio. O que esta escrito e uma intencao; o que
  esta no mp3 e o fato.

SAIDA
  `03-narracao/fala-real.json`
      { "duracao": 608.2,
        "palavras": [ {"t": 0.42, "p": "arbitro"}, ... ] }

  A palavra vai NORMALIZADA (sem acento, minuscula): quem consulta compara
  trecho de roteiro com trecho falado, e acento so atrapalha esse casamento.

CUSTO
  ~1 min de CPU para 10 min de audio no modelo `small`. Roda uma vez por
  episodio, depois da narracao e antes da montagem.
"""
import argparse
import io
import json
import os
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
CANAL = os.path.join(AQUI, "..", "..", "workspaces", "businesses", "virals",
                     "creative-studio", "canais", "bora-de-bola")


def norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--modelo", default="small",
                    help="small basta: o que importa e QUANDO, nao a grafia")
    a = ap.parse_args()

    pack = os.path.join(CANAL, "episodios", a.slug)
    mp3 = os.path.join(pack, "03-narracao", "vo.mp3")
    if not os.path.isfile(mp3):
        print("sem vo.mp3 em %s — narre antes" % a.slug)
        return 1

    from faster_whisper import WhisperModel
    print("carregando %s..." % a.modelo)
    m = WhisperModel(a.modelo, device="cpu", compute_type="int8")

    # `word_timestamps` e o ponto todo: sem ele volta so o intervalo do segmento
    segs, info = m.transcribe(mp3, language="pt", word_timestamps=True)

    palavras = []
    for s in segs:
        for w in (s.words or []):
            p = norm(w.word)
            if p:
                palavras.append({"t": round(w.start, 2), "p": p})

    saida = os.path.join(pack, "03-narracao", "fala-real.json")
    io.open(saida, "w", encoding="utf-8").write(json.dumps(
        {"duracao": round(palavras[-1]["t"], 2) if palavras else 0,
         "palavras": palavras}, ensure_ascii=False))

    print("%d palavras · ultima aos %.1fs" % (len(palavras),
                                              palavras[-1]["t"] if palavras else 0))
    print(saida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
