# -*- coding: utf-8 -*-
"""Legendas alinhadas ao AUDIO REAL, e nao ao SRT escrito.

POR QUE — o numero que fecha a discussao
  A legenda vinha do SRT escrito, que e a partitura de PROSODIA. O audio gerado
  nao obedece a essa partitura: o motor gera cue a cue e insere pausa em cada
  emenda. Medindo os inicios de fala do arquivo contra as marcacoes do SRT:

      cue  1 -> desvio  +0,01 s
      cue 25 -> desvio  +0,87 s
      cue 41 -> desvio  +5,18 s
      cue 57 -> desvio +11,37 s
      cue 73 -> desvio +14,20 s

  O desvio e MONOTONICO: cada pausa nao prevista empurra tudo o que vem depois.
  No comeco bate; no fim a legenda esta 14 segundos adiantada. E por isso que
  parecia piorar a cada troca de bloco — nao piorava por bloco, piorava sempre.

  Isso NAO se conserta na legenda; conserta-se na FONTE do tempo. A unica fonte
  correta e o audio que existe.

O QUE FAZ
  Transcreve a narracao com marcacao POR PALAVRA (Whisper) e escreve o
  `Caption[]` que a composicao consome. Como o roteiro e conhecido, as palavras
  transcritas sao conferidas contra ele — a marcacao do Whisper e o que interessa,
  a grafia vem do roteiro.

ATENCAO
  Nao rodar com o ComfyUI carregado: 16 GB de RAM nao comportam os dois.

Uso:  python legendas_do_audio.py <audio> <roteiro.srt> [saida.json] [modelo]
"""
import io, json, os, re, sys, unicodedata

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def le_srt(caminho):
    txt = io.open(caminho, encoding="utf-8").read()
    return [b.strip() for b in re.findall(
        r"\d+\s*\n[\d:,]+ --> [\d:,]+\s*\n(.+?)(?:\n\n|\Z)", txt, re.S)]


def normaliza(p):
    p = unicodedata.normalize("NFD", p.lower())
    return "".join(c for c in p if unicodedata.category(c) != "Mn" and c.isalnum())


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    audio, srt = sys.argv[1], sys.argv[2]
    saida = sys.argv[3] if len(sys.argv) > 3 else os.path.splitext(audio)[0] + ".captions.json"
    modelo = sys.argv[4] if len(sys.argv) > 4 else "small"

    palavras_roteiro = " ".join(le_srt(srt)).split()
    print("  roteiro: %d palavras" % len(palavras_roteiro))

    # A TRANSCRICAO E CARA (12 min para 5 min de audio) e o ALINHAMENTO e barato.
    # Guardar as palavras ouvidas em disco permite afinar o alinhamento sem
    # retranscrever — que foi exatamente o que precisei fazer quando o pareamento
    # por posicao se mostrou errado.
    cache = os.path.splitext(audio)[0] + ".words.json"
    if os.path.isfile(cache):
        ouvidas = json.load(io.open(cache, encoding="utf-8"))
        print("  ouvidas: %d palavras (do cache)" % len(ouvidas))
    else:
        import whisper
        print("  carregando whisper '%s'..." % modelo)
        m = whisper.load_model(modelo)
        print("  transcrevendo com marcacao por palavra (isto demora)...")
        r = m.transcribe(audio, language="pt", word_timestamps=True, verbose=False)
        ouvidas = []
        for seg in r["segments"]:
            for w in seg.get("words", []):
                t = w["word"].strip()
                if t:
                    ouvidas.append({"t": t, "ini": w["start"], "fim": w["end"]})
        json.dump(ouvidas, io.open(cache, "w", encoding="utf-8"), ensure_ascii=False)
        print("  ouvidas: %d palavras" % len(ouvidas))

    # A GRAFIA VEM DO ROTEIRO, O TEMPO VEM DO AUDIO.
    # Parear por POSICAO nao funciona: o Whisper ouviu 603 palavras e o roteiro tem
    # 613, e o primeiro descompasso desalinha todo o resto — na primeira tentativa
    # so 23% casaram, o que significa palavra errada na tela na hora certa.
    #
    # `SequenceMatcher` resolve isso: ele acha os BLOCOS iguais e trata o que sobra
    # como insercao ou omissao. Palavra do roteiro que o Whisper nao ouviu ganha
    # tempo interpolado dentro do buraco; palavra que o Whisper inventou e descartada.
    import difflib
    na = [normaliza(w["t"]) for w in ouvidas]
    nb = [normaliza(w) for w in palavras_roteiro]
    sm = difflib.SequenceMatcher(a=na, b=nb, autojunk=False)

    caps, casadas = [], 0
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                w = ouvidas[i1 + k]
                caps.append({"text": palavras_roteiro[j1 + k],
                             "startMs": round(w["ini"] * 1000),
                             "endMs": round(w["fim"] * 1000),
                             "timestampMs": round((w["ini"] + w["fim"]) / 2 * 1000),
                             "confidence": 1})
                casadas += 1
        elif tag in ("replace", "delete", "insert"):
            # janela de tempo que o trecho ocupa no AUDIO
            if i2 > i1:
                t0, t1 = ouvidas[i1]["ini"], ouvidas[i2 - 1]["fim"]
            elif caps:
                t0 = t1 = caps[-1]["endMs"] / 1000
            else:
                t0 = t1 = 0.0
            faltam = j2 - j1
            if faltam <= 0:
                continue                      # o Whisper ouviu de sobra: descarta
            passo = (t1 - t0) / faltam if t1 > t0 else 0.18
            for k in range(faltam):
                a0 = t0 + k * passo
                caps.append({"text": palavras_roteiro[j1 + k],
                             "startMs": round(a0 * 1000),
                             "endMs": round((a0 + passo) * 1000),
                             "timestampMs": round((a0 + passo / 2) * 1000),
                             "confidence": 0})

    caps.sort(key=lambda c: c["startMs"])

    json.dump(caps, io.open(saida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("  %d legendas · %d%% casaram com o roteiro · ultima em %.1f s"
          % (len(caps), round(100 * casadas / max(1, len(caps))), caps[-1]["endMs"] / 1000))
    print("  escrito: %s" % saida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
