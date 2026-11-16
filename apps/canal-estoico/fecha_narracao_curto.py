# -*- coding: utf-8 -*-
"""Traz a narracao do ComfyUI para o pack do curto e mede a fala REAL.

DUAS ETAPAS QUE SEMPRE ANDAM JUNTAS

  1. O `.flac` que sai do ComfyUI vira `02-narracao/vo.mp3` dentro do pack.
     A saida do motor fica numa arvore paralela (`output/curtos/la1-pN/`) e o
     pack e o que viaja; deixar o audio so no motor e perder a peca quando a
     pasta de output for limpa.

  2. O mp3 e transcrito com tempo POR PALAVRA para `fala-real.json`.

POR QUE O PASSO 2 NAO E OPCIONAL
  O `narracao.srt` e uma ESTIMATIVA a 171,6 wpm; o motor nao respeita essa
  regua. No canal de futebol a deriva chegou a mais de dois minutos num
  episodio de dez, e o efeito na tela foi cartela entrando fora do assunto.

  A legenda do curto se posiciona por este arquivo. Sem ele, a legenda anda no
  ritmo do que foi ESCRITO em vez do que foi DITO -- e nao ha ajuste manual que
  conserte isso ao longo de sessenta segundos.

USO
    python fecha_narracao_curto.py --todos
    python fecha_narracao_curto.py LA1-p3-privacao-30s
"""
import argparse
import io
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
_CANAIS = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                       "creative-studio", "canais")
CURTOS = os.path.join(_CANAIS, "canal-estoico", "curtos")
SAIDA_COMFY = os.path.join(
    r"C:" + os.sep, "Users", "Pichau", "Desktop", "ComfyUI_windows_portable",
    "ComfyUI", "output", "curtos")

VOZ = "clone-v1"


def curto_id(slug):
    """`LA1-p3-privacao-30s` -> `la1-p3`, que e o prefixo usado no ComfyUI."""
    return "-".join(slug.split("-")[:2]).lower()


def traz_audio(slug):
    pack = os.path.join(CURTOS, slug)
    destino = os.path.join(pack, "02-narracao", "vo.mp3")
    if os.path.isfile(destino):
        return destino, False
    origem = os.path.join(SAIDA_COMFY, curto_id(slug),
                          "narracao-%s_00001.flac" % VOZ)
    if not os.path.isfile(origem):
        return None, False
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", origem,
                    "-b:a", "192k", destino], capture_output=True)
    return (destino, True) if os.path.isfile(destino) else (None, False)


def transcreve(slug, modelo):
    """Grava `fala-real.json` com o tempo de INICIO e FIM de cada palavra.

    `small` basta: o que importa e QUANDO, nao a grafia -- a grafia da legenda
    vem do roteiro (ver `alinha()` em monta_curto.py). Roda na CPU, sequencial,
    porque o ComfyUI ocupa a GPU e a maquina tem 16 GB.
    """
    pack = os.path.join(CURTOS, slug)
    mp3 = os.path.join(pack, "02-narracao", "vo.mp3")
    alvo = os.path.join(pack, "02-narracao", "fala-real.json")
    # A TRANSCRICAO SO VALE PARA O AUDIO QUE A GEROU.
    #
    # Existir nao bastava: renarrando com outra voz o `vo.mp3` muda e o
    # `fala-real.json` velho continua no lugar, com os tempos da narracao
    # anterior. A legenda e as ancoras leem dele -- sairiam alinhadas ao audio
    # que nao esta mais ali, sem uma linha de aviso. Comparar a data resolve.
    if os.path.isfile(alvo) and os.path.getmtime(alvo) >= os.path.getmtime(mp3):
        return json.load(io.open(alvo, encoding="utf-8")), False

    from faster_whisper import WhisperModel
    m = WhisperModel(modelo, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(mp3, language="pt", word_timestamps=True)
    palavras = []
    for s in segs:
        for w in (s.words or []):
            p = (w.word or "").strip()
            if p:
                palavras.append({"t": round(w.start, 2),
                                 "f": round(w.end, 2), "p": p})
    d = {"duracao": palavras[-1]["f"] if palavras else 0, "palavras": palavras}
    io.open(alvo, "w", encoding="utf-8").write(
        json.dumps(d, ensure_ascii=False))
    return d, True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--modelo", default="small")
    # O canal de FUTEBOL narra pelo `narra_comfy.py --curto`, que ja grava o
    # `vo.mp3` direto no pack. Aqui so falta a transcricao -- mas ela e o passo
    # que a legenda depende, entao o script serve aos dois canais.
    ap.add_argument("--canal", choices=("estoico", "futebol", "curiosidades",
                                   "avisos"), default="estoico")
    a = ap.parse_args()

    global CURTOS
    PASTA = {"futebol": "bora-de-bola", "curiosidades": "curiosidades-animais",
             "avisos": "placas-de-aviso"}
    if a.canal in PASTA:
        CURTOS = os.path.join(_CANAIS, PASTA[a.canal], "curtos")

    alvos = ([s for s in sorted(os.listdir(CURTOS))
              if os.path.isdir(os.path.join(CURTOS, s))]
             if a.todos else [a.slug])
    if not alvos or alvos == [None]:
        ap.error("informe o slug ou use --todos")

    print("%-34s %8s  %s" % ("CURTO", "FALA", "ESTADO"))
    print("-" * 62)
    for s in alvos:
        mp3, novo = traz_audio(s)
        if not mp3:
            print("%-34s %8s  sem flac no ComfyUI" % (s, "—"))
            continue
        d, tnovo = transcreve(s, a.modelo)
        # `duracao` so existe nos arquivos gerados aqui; o do LA1-P1 veio de
        # uma versao anterior e nao tem o campo. A ultima palavra sempre serve.
        pal = d.get("palavras") or []
        dur = d.get("duracao") or (pal[-1].get("f") or pal[-1]["t"] if pal else 0)
        print("%-34s %7.1fs  %s · %s"
              % (s, dur,
                 "audio novo" if novo else "audio ja estava",
                 "transcrito" if tnovo else "transcricao ja estava"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
