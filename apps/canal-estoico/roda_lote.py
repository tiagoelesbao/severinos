# -*- coding: utf-8 -*-
"""Executa a esteira inteira de um pack do lote dark, e do lote inteiro.

O QUE ELE FAZ
  Os sete passos da esteira documentada em `docs/CANAIS-TIKTOK-DARK.md` §7,
  na ordem, pulando o que ja esta pronto:

    1 hook gerado (Flux2-Klein)      -> 03-takes/hook.png
    2 acervo com guarda de conteudo  -> 03-takes/acervo/
    3 narracao clonada (ComfyUI)     -> 02-narracao/vo.mp3
    4 transcricao (tempos de palavra)-> 02-narracao/fala-real.json
    5 montagem rascunho              -> 04-final/curto.mp4 (540x960)
    6 montagem final                 -> 04-final/curto.mp4 (1080x1920)

POR QUE EM SERIE, E POR QUE RETOMAVEL
  Cada peca ocupa GPU (hook e narracao) e depois oito threads de CPU (montagem).
  Dois processos ao mesmo tempo nao ganham tempo e ja colidiram em arquivo
  temporario. E como o lote inteiro leva horas, o runner tem de poder parar e
  voltar: cada passo checa se a saida ja existe antes de gastar de novo.

  `--refaz` forca; `--ate` para depois de um passo (util para conferir o acervo
  antes de gastar narracao).

USO
    python roda_lote.py CUR-l02-enxergam-40s --canal curiosidades
    python roda_lote.py --todos --canal avisos --ate acervo
    python roda_lote.py --todos
"""
import argparse
import io
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
FUT = os.path.join(RAIZ, "apps", "canal-futebol")
CANAIS = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                      "creative-studio", "canais")
PASTA = {"curiosidades": "curiosidades-animais", "avisos": "placas-de-aviso"}
VOZ_REF = "ref-amazonia.wav"

PASSOS = ["hook", "acervo", "narracao", "transcricao", "rascunho", "final"]


def _roda(cmd, cwd=None):
    r = subprocess.run([sys.executable, "-X", "utf8"] + cmd, cwd=cwd)
    return r.returncode == 0


def _pack(slug, canal):
    return os.path.join(CANAIS, PASTA[canal], "curtos", slug)


def _tem(p, *partes):
    f = os.path.join(p, *partes)
    return os.path.isfile(f) and os.path.getsize(f) > 10240


def um(slug, canal, ate=None, refaz=()):
    pack = _pack(slug, canal)
    if not os.path.isdir(pack):
        print("%-28s pack inexistente" % slug)
        return False
    print("\n" + "═" * 66)
    print("%s · %s" % (slug, canal))
    print("═" * 66)
    t0 = time.time()

    # 1 · HOOK -----------------------------------------------------------
    if "hook" not in refaz and _tem(pack, "03-takes", "hook.png"):
        print("hook        ja existe")
    else:
        pr = os.path.join(pack, "01-roteiro", "hook.txt")
        if not os.path.isfile(pr):
            print("hook        sem 01-roteiro/hook.txt — pulando")
        else:
            prompt = io.open(pr, encoding="utf-8").read().strip()
            if not _roda([os.path.join(AQUI, "hook_imagem.py"), slug,
                          "--canal", canal, "--prompt", prompt]):
                print("hook        FALHOU"); return False
    if ate == "hook":
        return True

    # 2 · ACERVO ---------------------------------------------------------
    tem_acervo = os.path.isdir(os.path.join(pack, "03-takes", "acervo")) and \
        len([f for f in os.listdir(os.path.join(pack, "03-takes", "acervo"))
             if f.endswith((".mp4", ".png")) and f.startswith("t")]) >= 6 \
        if os.path.isdir(os.path.join(pack, "03-takes", "acervo")) else False
    if "acervo" not in refaz and tem_acervo:
        print("acervo      ja existe")
    elif not _roda([os.path.join(AQUI, "acervo_curto.py"), slug,
                    "--canal", canal]):
        print("acervo      FALHOU"); return False
    if ate == "acervo":
        return True

    # 3 · NARRACAO -------------------------------------------------------
    if "narracao" not in refaz and _tem(pack, "02-narracao", "vo.mp3"):
        print("narracao    ja existe")
    elif not _roda([os.path.join(FUT, "narra_comfy.py"), slug, "--curto",
                    "--canal-dir", os.path.join(CANAIS, PASTA[canal]),
                    "--voz-ref", VOZ_REF], cwd=FUT):
        print("narracao    FALHOU"); return False
    if ate == "narracao":
        return True

    # 4 · TRANSCRICAO ----------------------------------------------------
    # o proprio script ja invalida por data (mtime do json contra o do mp3),
    # entao chamar sempre e barato e nunca deixa tempo velho passar
    if not _roda([os.path.join(AQUI, "fecha_narracao_curto.py"), slug,
                  "--canal", canal]):
        print("transcricao FALHOU"); return False
    if ate == "transcricao":
        return True

    # 5 · RASCUNHO -------------------------------------------------------
    if not _roda([os.path.join(AQUI, "monta_curto.py"), slug,
                  "--canal", canal, "--rascunho"]):
        print("rascunho    FALHOU"); return False
    if ate == "rascunho":
        return True

    # 6 · FINAL ----------------------------------------------------------
    if not _roda([os.path.join(AQUI, "monta_curto.py"), slug,
                  "--canal", canal]):
        print("final       FALHOU"); return False

    print("── %s pronto em %.1f min" % (slug, (time.time() - t0) / 60))
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--canal", choices=sorted(PASTA))
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--ate", choices=PASSOS,
                    help="para depois deste passo (conferir antes de gastar)")
    ap.add_argument("--refaz", default="",
                    help="passos a refazer mesmo se ja existem, separados por ,")
    a = ap.parse_args()
    refaz = tuple(x.strip() for x in a.refaz.split(",") if x.strip())

    if a.todos:
        canais = [a.canal] if a.canal else ["curiosidades", "avisos"]
        alvos = []
        for c in canais:
            base = os.path.join(CANAIS, PASTA[c], "curtos")
            for s in sorted(os.listdir(base)):
                if os.path.isfile(os.path.join(base, s, "curto.yaml")):
                    alvos.append((s, c))
        print("%d pecas na fila" % len(alvos))
        ok = 0
        for s, c in alvos:
            if um(s, c, a.ate, refaz):
                ok += 1
        print("\n%d de %d concluidas" % (ok, len(alvos)))
        return 0

    if not a.slug:
        ap.error("informe o slug ou --todos")
    canal = a.canal or ("curiosidades" if a.slug.startswith("CUR") else "avisos")
    return 0 if um(a.slug, canal, a.ate, refaz) else 1


if __name__ == "__main__":
    sys.exit(main())
