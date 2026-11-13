# -*- coding: utf-8 -*-
"""Banco de provas de voz: a MESMA frase de narração em todas as opções.

POR QUE UMA FRASE DE GOL E NÃO UMA FRASE NEUTRA
  Escolher voz lendo texto corrido engana. Narração de futebol vive de pico —
  vogal esticada, exclamação, aceleração. Uma voz que soa bem lendo notícia
  pode achatar completamente no "Gooool", e é justamente aí que ela precisa
  funcionar.

  Por isso o banco tem três amostras por voz: o pico (gol), o corrido
  (estatística) e a interação com o público (chamada de engajamento).

Uso:  python prova_vozes.py            gera tudo em assets/prova-vozes/
      python prova_vozes.py --rapido   só a frase de gol
"""
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
DEST = os.path.join(AQUI, "assets", "prova-vozes")

FRASES = [
    ("gol", "Gooool do Flamengo! Samuel Lino, aos treze minutos do primeiro tempo!"),
    ("corrido", "O Flamengo tem sessenta e três por cento de posse de bola e já finalizou dezoito vezes."),
    ("chamada", "Se você está gostando da transmissão, deixa o like e se inscreve no canal."),
]

PIPER = ["pt_BR-faber-medium", "pt_BR-cadu-medium", "pt_BR-jeff-medium", "pt_BR-edresson-low"]
EDGE = ["pt-BR-AntonioNeural", "pt-BR-FranciscaNeural", "pt-BR-ThalitaMultilingualNeural"]


def piper(modelo, texto, destino, veloc="0.92"):
    m = os.path.join(AQUI, "_vozes", modelo + ".onnx")
    if not os.path.isfile(m):
        return False
    subprocess.run([sys.executable, "-m", "piper", "-m", m, "-f", destino,
                    "--length-scale", veloc, "--noise-w-scale", "0.6"],
                   input=texto.encode("utf-8"), capture_output=True, timeout=90)
    return os.path.isfile(destino) and os.path.getsize(destino) > 1000


def edge(voz, texto, destino, rate="+18%"):
    import asyncio
    import edge_tts

    async def go():
        await edge_tts.Communicate(texto, voz, rate=rate).save(destino)

    asyncio.run(go())
    return os.path.isfile(destino) and os.path.getsize(destino) > 1000


def para_mp3(origem, destino):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", origem,
                    "-c:a", "libmp3lame", "-b:a", "192k", destino], timeout=60)
    if origem != destino and os.path.isfile(origem):
        os.remove(origem)


def main():
    os.makedirs(DEST, exist_ok=True)
    frases = FRASES[:1] if "--rapido" in sys.argv else FRASES
    print("%d vozes x %d frases\n" % (len(PIPER) + len(EDGE), len(frases)))

    for nome in PIPER:
        curto = nome.replace("pt_BR-", "").replace("-medium", "").replace("-low", "")
        for tag, txt in frases:
            alvo = os.path.join(DEST, "piper-%s__%s" % (curto, tag))
            t0 = time.time()
            if piper(nome, txt, alvo + ".wav"):
                para_mp3(alvo + ".wav", alvo + ".mp3")
                print("  piper %-10s %-9s %.1fs" % (curto, tag, time.time() - t0))
            else:
                print("  piper %-10s %-9s FALHOU" % (curto, tag))

    for voz in EDGE:
        curto = voz.replace("pt-BR-", "").replace("Neural", "").replace("Multilingual", "")
        for tag, txt in frases:
            alvo = os.path.join(DEST, "edge-%s__%s.mp3" % (curto, tag))
            t0 = time.time()
            try:
                ok = edge(voz, txt, alvo)
            except Exception as e:
                print("  edge  %-10s %-9s erro: %s" % (curto, tag, str(e)[:50]))
                continue
            print("  edge  %-10s %-9s %.1fs%s" % (curto, tag, time.time() - t0,
                                                  "" if ok else "  FALHOU"))

    print("\nsaída: assets/prova-vozes/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
