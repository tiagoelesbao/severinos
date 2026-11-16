# -*- coding: utf-8 -*-
"""Le as URLs de modelo dos workflows das aulas e baixa para o acervo no HD.

DE ONDE VEM A LISTA
  Os workflows do MickMumpitz trazem nos de anotacao com o link de cada modelo
  e a pasta de destino. Em vez de transcrever isso a mao -- 25 modelos, e a mao
  erra em dois -- o script varre os JSON, extrai as URLs e deduz a subpasta do
  proprio caminho da URL (`.../diffusion_models/x.safetensors` -> `diffusion_models`).

POR QUE BAIXAR PARA O HD, E NAO PARA O SSD
  O acervo completo passa de 130 GB e nao cabe nos dois SSD somados. O HD e o
  REPOUSO: tudo desce para la e, quando a fase precisa de um modelo, o
  `arquiva.py --acordar` traz so ele para o SSD que o ComfyUI le.

  A subpasta e preservada no HD justamente para que a volta seja mecanica.

DUAS CORRECOES DE URL QUE O HUGGINGFACE EXIGE
  `blob` -> `resolve`   o link que a pessoa copia do browser aponta para a
                        PAGINA do arquivo; baixar dele devolve HTML.
  `?download=true`      alguns repositorios respondem 302 sem isso.

RETOMAVEL
  Download de 22 GB cai. O script usa `Range` para continuar de onde parou e
  confere o tamanho final contra o `Content-Length` -- arquivo curto e pior que
  arquivo ausente, porque o ComfyUI tenta carregar e quebra no meio.

USO
    python baixa_modelos.py --lista
    python baixa_modelos.py --so ltx
    python baixa_modelos.py --todos
"""
import argparse
import glob
import io
import json
import os
import re
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AULAS = [r"C:\Users\Pichau\Downloads\aula character consistancy",
         r"C:\Users\Pichau\Downloads\aula video gen"]
ACERVO = r"E:\Acervo\modelos"
# O que ja esta ATIVO no SSD nao precisa descer de novo para o acervo: sao os
# mesmos bytes, e baixar 18 GB duas vezes so gasta banda e disco.
ATIVOS = r"D:\ComfyUI_Models"


def _ja_no_ssd(nome):
    for raiz, dirs, arqs in os.walk(ATIVOS):
        dirs[:] = [d for d in dirs if d != ".cache"]
        if nome.lower() in (a.lower() for a in arqs):
            return os.path.relpath(raiz, ATIVOS)
    return None

# Subpasta pelo trecho da URL. A ordem importa: `text_encoders` antes de
# `encoders` evitaria ambiguidade se houvesse, e o fallback fica por ultimo.
PASTAS = [
    ("diffusion_models", "diffusion_models"),
    ("text_encoders", "text_encoders"),
    ("split_files/vae", "vae"),
    ("/vae/", "vae"),
    ("/loras/", "loras"),
    ("/unet/", "unet"),
    ("/clip/", "clip"),
]


def _limpa(u):
    """Tira o lixo de markdown grudado e conserta o link do HuggingFace."""
    u = u.strip().rstrip(').,"\'>]')
    # link colado de markdown vem como `url](url` — fica com o primeiro
    u = u.split("](")[0]
    u = u.replace("/blob/", "/resolve/")
    return u


def _subpasta(u):
    baixo = u.lower()
    for chave, pasta in PASTAS:
        if chave in baixo:
            return pasta
    # sem pista na URL, o nome do arquivo costuma dizer
    n = os.path.basename(u).lower()
    if "vae" in n:
        return "vae"
    if "lora" in n:
        return "loras"
    if any(k in n for k in ("t5", "qwen_3", "qwen3vl", "umt5", "gemma")):
        return "text_encoders"
    return "diffusion_models"


def colhe():
    """[(url, subpasta, arquivo)] de todos os workflows das aulas."""
    vistos, fora = set(), []
    for pa in AULAS:
        if not os.path.isdir(pa):
            continue
        for f in sorted(glob.glob(os.path.join(pa, "*.json"))):
            t = io.open(f, encoding="utf-8", errors="replace").read()
            for m in re.finditer(r'https?://[^\s"\'<>]+', t):
                u = _limpa(m.group(0))
                if not re.search(r"\.(safetensors|gguf|pt|pth|onnx|bin)$", u, re.I):
                    continue
                if "huggingface.co" not in u:
                    continue
                nome = os.path.basename(u)
                if nome.lower() in vistos:
                    continue
                vistos.add(nome.lower())
                fora.append((u, _subpasta(u), nome))
    return sorted(fora, key=lambda x: (x[1], x[2]))


def baixa(url, destino, tentativas=3):
    """Baixa com retomada. Devolve (ok, bytes, motivo)."""
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    parcial = destino + ".parcial"
    for t in range(tentativas):
        ja = os.path.getsize(parcial) if os.path.isfile(parcial) else 0
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0", "Accept": "*/*"})
        if ja:
            req.add_header("Range", "bytes=%d-" % ja)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                total = int(r.headers.get("Content-Length") or 0) + ja
                modo = "ab" if ja and r.status == 206 else "wb"
                if modo == "wb":
                    ja = 0
                t0, ultimo = time.time(), 0
                with open(parcial, modo) as f:
                    while True:
                        b = r.read(1 << 20)
                        if not b:
                            break
                        f.write(b)
                        ja += len(b)
                        if total and time.time() - ultimo > 20:
                            ultimo = time.time()
                            mbs = ja / 2**20 / max(time.time() - t0, 1)
                            print("      %5.1f%%  %6.1f MB/s" %
                                  (100.0 * ja / total, mbs), flush=True)
            if total and ja != total:
                raise IOError("saiu com %d de %d bytes" % (ja, total))
            os.replace(parcial, destino)
            return True, ja, ""
        except Exception as e:
            if t == tentativas - 1:
                return False, ja, str(e)[:70]
            time.sleep(3 * (t + 1))
    return False, 0, "?"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lista", action="store_true")
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--so", help="so os que contem este texto no nome")
    a = ap.parse_args()

    itens = colhe()
    if a.so:
        itens = [x for x in itens if a.so.lower() in x[2].lower()]
    print("%d modelo(s)\n" % len(itens))

    if a.lista:
        for u, sub, n in itens:
            d = os.path.join(ACERVO, sub, n)
            tem = " [ja tem]" if os.path.isfile(d) else ""
            print("  %-18s %-52s%s" % (sub, n[:52], tem))
        return 0
    if not a.todos and not a.so:
        ap.error("use --lista, --todos ou --so")

    ok = falhou = pulado = 0
    for i, (u, sub, n) in enumerate(itens, 1):
        d = os.path.join(ACERVO, sub, n)
        if os.path.isfile(d):
            print("[%2d/%d] %-50s ja tem" % (i, len(itens), n[:50]))
            pulado += 1
            continue
        ssd = _ja_no_ssd(n)
        if ssd:
            print("[%2d/%d] %-50s ja ativo em D:\%s" % (i, len(itens), n[:50], ssd))
            pulado += 1
            continue
        print("[%2d/%d] %-50s -> %s" % (i, len(itens), n[:50], sub), flush=True)
        bom, tam, motivo = baixa(u, d)
        if bom:
            print("      %.2f GB" % (tam / 2**30), flush=True)
            ok += 1
        else:
            print("      FALHOU: %s" % motivo, flush=True)
            falhou += 1
    print("\n%d baixado(s) · %d ja tinha · %d falhou" % (ok, pulado, falhou))
    return 1 if falhou else 0


if __name__ == "__main__":
    sys.exit(main())
