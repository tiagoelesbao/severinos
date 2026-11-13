# -*- coding: utf-8 -*-
"""Tira a pasta `models` do ComfyUI do disco que nao escreve mais.

O PROBLEMA, MEDIDO
    C: (NVMe ADATA)    904,78 MB/s de escrita
    E: (HDD WD)         38,52 MB/s
    D: (SSD Kingston)   nao escreveu 4 MB em 180 segundos

  `ComfyUI\\models` e um junction para `D:\\ComfyUI_Models`. Enquanto for, tudo
  que o ComfyUI precisa GRAVAR ali -- e ele grava sozinho, sem avisar -- morre.
  Foi o que aconteceu com o RMBG-1.4: quatro tentativas de download, quatro
  paradas entre 39,9 e 40,9 MB, a ultima rastejando a 9 kB/s com previsao de 4
  horas. O mesmo arquivo baixa em 40 segundos gravando no C:.

  O detalhe que torna isso dificil de enxergar: o `easy imageRemBg` usa
  `torch.hub.download_url_to_file`, que NAO TEM TIMEOUT. A thread fica presa
  num socket que nunca fecha, o `Interrupt` do ComfyUI nao alcanca, e nem
  `taskkill /F` mata -- o processo vira zumbi segurando a porta 8188.

POR QUE O E: E NAO O C:
  O C: tem 20 GB livres e e onde moram os modelos do caminho quente (Flux2 e
  LTX), que fazem streaming de pesos e precisam de latencia baixa. O E: tem 214
  GB, zero eventos de erro em 8 horas de log, e guarda bem o resto -- que
  carrega uma vez e nao faz streaming. 38 MB/s e de sobra para isso.

QUANDO RODAR
  Com o ComfyUI FECHADO. O script recusa rodar se a porta 8188 estiver de pe,
  porque trocar o junction sob os pes de um processo que esta lendo dali e
  pedir para quebrar.

USO
    python arruma_models.py --conferir     # so mostra o que faria
    python arruma_models.py                # troca o junction
    python arruma_models.py --copiar       # e ainda copia o que sobrou no D:
"""
import argparse
import os
import socket
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MODELS = r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\models"
VELHO = r"D:\ComfyUI_Models"
NOVO = r"E:\ComfyUI_Models"


def porta_ocupada(p=8188):
    s = socket.socket()
    s.settimeout(1)
    try:
        return s.connect_ex(("127.0.0.1", p)) == 0
    finally:
        s.close()


def alvo_do_junction(caminho):
    """Le o destino de um reparse point sem depender de modulo externo."""
    r = subprocess.run(["cmd", "/c", "dir", "/al", os.path.dirname(caminho)],
                       capture_output=True, text=True, errors="replace")
    base = os.path.basename(caminho)
    for l in r.stdout.splitlines():
        if base in l and "[" in l:
            return l[l.index("[") + 1:l.rindex("]")]
    return None


def tamanho(d):
    t = n = 0
    for raiz, _, arqs in os.walk(d):
        for a in arqs:
            try:
                t += os.path.getsize(os.path.join(raiz, a))
                n += 1
            except OSError:
                pass
    return t, n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--conferir", action="store_true")
    ap.add_argument("--zumbi", action="store_true",
                    help="a porta 8188 esta presa por um processo morto-vivo, "
                         "que nao le mais nada -- prossiga assim mesmo")
    ap.add_argument("--copiar", action="store_true",
                    help="depois de trocar, copia do D: o que ainda serve "
                         "(leitura do D: ainda funciona, ~5 MB/s)")
    a = ap.parse_args()

    # A checagem existe para nao trocar o junction sob os pes de um ComfyUI que
    # esta LENDO dali. Um zumbi preso em I/O nao le nada -- e remover um
    # junction mexe no diretorio PAI, nao nos handles abertos no destino. Por
    # isso `--zumbi` e seguro nesse caso especifico, e so nele.
    if porta_ocupada() and not a.zumbi:
        raise SystemExit("o ComfyUI esta de pe na 8188 -- feche antes. "
                         "Se ele ja nao responde e nao morre nem com taskkill, "
                         "e um zumbi preso em I/O: rode com --zumbi.")

    atual = alvo_do_junction(MODELS)
    print("junction atual: %s -> %s" % (MODELS, atual))
    if atual and os.path.normcase(atual.rstrip("\\")) == os.path.normcase(NOVO):
        print("ja aponta para o E: -- nada a fazer")
        return 0
    if not os.path.isdir(NOVO):
        raise SystemExit("%s nao existe -- crie a arvore de pastas antes" % NOVO)

    print("\no que vai mudar:")
    print("   %s  ->  %s" % (MODELS, NOVO))
    print("   o conteudo do D: NAO e apagado; ele so sai do caminho")
    if a.conferir:
        print("\n(--conferir: nao mexi em nada)")
        return 0

    # remover um junction apaga o ATALHO, nao o destino
    subprocess.run(["cmd", "/c", "rmdir", MODELS], capture_output=True)
    if os.path.exists(MODELS):
        raise SystemExit("nao consegui remover o junction -- algo ainda o usa")
    r = subprocess.run(["cmd", "/c", "mklink", "/J", MODELS, NOVO],
                       capture_output=True, text=True, errors="replace")
    if not os.path.isdir(MODELS):
        raise SystemExit("mklink falhou: %s" % (r.stdout + r.stderr)[:200])
    print("\nfeito: %s" % alvo_do_junction(MODELS))

    if a.copiar:
        print("\ncopiando do D: (leitura ainda funciona, devagar):")
        for sub in sorted(os.listdir(VELHO)):
            org = os.path.join(VELHO, sub)
            if not os.path.isdir(org):
                continue
            dst = os.path.join(NOVO, sub)
            os.makedirs(dst, exist_ok=True)
            for arq in sorted(os.listdir(org)):
                o = os.path.join(org, arq)
                d = os.path.join(dst, arq)
                if not os.path.isfile(o) or arq.endswith((".partial", ".parcial")):
                    continue
                if os.path.exists(d) and os.path.getsize(d) == os.path.getsize(o):
                    continue
                gb = os.path.getsize(o) / 1e9
                t0 = time.time()
                try:
                    with open(o, "rb") as fi, open(d + ".parcial", "wb") as fo:
                        while True:
                            b = fi.read(8 * 1024 * 1024)
                            if not b:
                                break
                            fo.write(b)
                    os.replace(d + ".parcial", d)
                    print("   %-46s %5.2f GB  %5.1f MB/s"
                          % (arq[:46], gb, gb * 1000 / max(time.time() - t0, .1)))
                except Exception as e:
                    print("   %-46s FALHOU (%s)" % (arq[:46], str(e)[:40]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
