"""Copia imagens do OUTPUT do ComfyUI para o INPUT.

POR QUE ISTO EXISTE
  O `SaveImage` grava no `output/`. O `LoadImage`, que alimenta o I2V, so
  enxerga o `input/`. Numa fila que gera imagem e DEPOIS anima essa imagem, os
  dois lados nunca se encontram sozinhos — o job de video procura um arquivo que
  esta na outra pasta e falha. Em fila noturna isso significa a noite inteira
  falhando em sequencia.

  Nao ha hook entre jobs no `run_batch.py` (ele so enfileira workflows), entao a
  ponte tem que ser um passo separado, chamado pelo .bat entre as duas fases.

O SUFIXO
  O ComfyUI acrescenta `_00001_` ao `filename_prefix`, e incrementa quando o
  arquivo ja existe: `_00002_`, `_00003_`... Uma execucao repetida NAO
  sobrescreve. Por isso aqui se copia sempre o MAIS RECENTE por prefixo, e o
  destino recebe nome estavel, sem sufixo — senao o job de I2V teria que
  adivinhar qual rodada usar. Foi exatamente esse o defeito que fez um
  storyboard mostrar a rodada antiga.

USO
  python copia_para_input.py curtos/la1-p1/cru  curtos-la1p1
      ^ subpasta em output/                     ^ subpasta em input/
"""
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
COMFY = os.path.join(r"C:" + os.sep, "Users", "Pichau", "Desktop",
                     "ComfyUI_windows_portable", "ComfyUI")
OUT = os.path.join(COMFY, "output")
IN = os.path.join(COMFY, "input")

# `nome_00012_.png` -> ("nome", 12). O sufixo e o que precisa sair do nome final.
SUFIXO = re.compile(r"^(?P<base>.+?)_(?P<n>\d{5})_\.(?P<ext>png|jpg|jpeg|webp)$",
                    re.IGNORECASE)


def mais_recentes(pasta):
    """{base: caminho} — para cada prefixo, o arquivo de maior contador.

    Usa o CONTADOR e nao o mtime: o mtime empata quando dois jobs terminam no
    mesmo segundo, e o contador e a ordem real de escrita do ComfyUI.
    """
    achados = {}
    if not os.path.isdir(pasta):
        return achados
    for nome in os.listdir(pasta):
        m = SUFIXO.match(nome)
        if not m:
            continue
        base, n = m.group("base"), int(m.group("n"))
        anterior = achados.get(base)
        if anterior is None or n > anterior[0]:
            achados[base] = (n, os.path.join(pasta, nome), m.group("ext"))
    return achados


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    rel_out = sys.argv[1].replace("/", os.sep)
    rel_in = (sys.argv[2] if len(sys.argv) > 2 else rel_out).replace("/", os.sep)

    origem = os.path.join(OUT, rel_out)
    destino = os.path.join(IN, rel_in)

    if not os.path.isdir(origem):
        print("[copia] ERRO: nao existe %s" % origem)
        print("[copia] a fase de imagens nao produziu nada — o I2V nao tem o que animar")
        return 1

    os.makedirs(destino, exist_ok=True)
    achados = mais_recentes(origem)

    if not achados:
        print("[copia] ERRO: nenhuma imagem com sufixo _NNNNN_ em %s" % origem)
        return 1

    copiados = 0
    for base, (n, caminho, ext) in sorted(achados.items()):
        alvo = os.path.join(destino, "%s.%s" % (base, ext))
        # Sobrescreve de proposito: o destino e o "mais recente conhecido".
        shutil.copy2(caminho, alvo)
        print("  %-34s <- _%05d_" % (base + "." + ext, n))
        copiados += 1

    print("[copia] %d imagem(ns) em input%s%s" % (copiados, os.sep, rel_in))
    return 0


if __name__ == "__main__":
    sys.exit(main())
