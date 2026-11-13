# -*- coding: utf-8 -*-
"""Monta a peca inteira de um projeto, num comando.

O QUE ELE FAZ
  Roda a cadeia toda na ordem certa, injetando os valores do YAML do projeto
  nos scripts que ja existem:

      adapta_movie_builder   assets, prompts base, motor de video, duracao
      insere_360_no_movie    o panorama e os recortes por setor
      duplica_shots          um take por setor, com prompt proprio
      origem_360             congela o panorama aprovado, se houver
      so_take                escolhe o que vai executar

POR QUE UM ORQUESTRADOR E NAO UM SCRIPT SO
  Cada etapa e util sozinha. Trocar um prompt de take nao deveria exigir
  regerar o panorama; ajustar um angulo nao deveria exigir recopiar os
  assets. Mantendo as etapas separadas e a ordem aqui, da para repetir so o
  pedaco que mudou -- e a ordem, que era a fonte de erro silencioso, deixa
  de depender de memoria.

  A ordem NAO e arbitraria: o `insere_360` precisa rodar antes do
  `duplica_shots`, senao tenta remendar um grafo que ja tem seis copias e
  reclama de entradas tortas.

USO
    python monta_peca.py --projeto imperio
    python monta_peca.py --projeto imperio --take 1
    python monta_peca.py --projeto imperio --so-imagens
    python monta_peca.py --listar
"""
import argparse
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from projeto import carrega, PROJETOS                  # noqa: E402


def roda(script, args, etapa):
    r = subprocess.run([sys.executable, os.path.join(AQUI, script)] + args,
                       capture_output=True, text=True, errors="replace")
    ok = r.returncode == 0
    print("   %-22s %s" % (etapa, "ok" if ok else "FALHOU"))
    if not ok:
        for l in (r.stdout + r.stderr).strip().splitlines()[-6:]:
            print("      %s" % l[:110])
    return ok, r.stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--projeto", default=None)
    ap.add_argument("--take", type=int, default=None,
                    help="deixa so este take pronto para executar")
    ap.add_argument("--so-imagens", action="store_true",
                    help="so os frames iniciais, nenhum video")
    ap.add_argument("--saida", default=None,
                    help="nome do JSON de saida; por padrao "
                         "MOVIE-BUILDER-{PROJETO}.json")
    ap.add_argument("--listar", action="store_true")
    ap.add_argument("--conferir", action="store_true",
                    help="valida o projeto e para, sem tocar no grafo")
    a = ap.parse_args()

    if a.listar or not a.projeto:
        disp = [f[:-5] for f in sorted(os.listdir(PROJETOS))
                if f.endswith(".yaml") and not f.startswith("_")]
        print("projetos disponiveis:")
        for n in disp:
            try:
                print("   %s" % carrega(n).resumo().replace("\n", "\n   "))
            except Exception as e:
                print("   %-16s (erro: %s)" % (n, str(e)[:50]))
        if not a.projeto:
            print("\nuse: python monta_peca.py --projeto NOME")
        return 0

    pr = carrega(a.projeto)
    print(pr.resumo())
    # um projeto cujo nome comeca com `_` e MODELO, nao producao: as
    # referencias dele sao marcadores e nao existem em input/
    eh_modelo = a.projeto.lstrip("./").startswith("_")
    probs = pr.confere(exigir_arquivos=not eh_modelo)
    if probs:
        print("\n%d problema(s) -- nao montei:" % len(probs))
        for x in probs:
            print("   - %s" % x)
        return 1
    print("   projeto conferido, sem problemas\n")
    if a.conferir:
        return 0

    # CADA PROJETO ESCREVE NO SEU PROPRIO ARQUIVO.
    #
    # Antes todos os scripts tinham `MOVIE-BUILDER-IMPERIO.json` como default,
    # entao montar qualquer projeto sobrescrevia a peca do Imperio -- que e
    # producao real, nao rascunho. O nome sai do projeto, e um projeto nunca
    # pisa no arquivo de outro.
    alvo = a.saida or ("MOVIE-BUILDER-%s.json" % pr.nome.upper())
    print("montando em %s:" % alvo)
    base = ["--projeto", a.projeto]

    ok, _ = roda("adapta_movie_builder.py", base + ["--saida", alvo],
                 "assets e parametros")
    if not ok:
        return 1
    ok, _ = roda("insere_360_no_movie.py", base + ["--arquivo", alvo],
                 "ambiente 360")
    if not ok:
        return 1
    ok, _ = roda("duplica_shots.py", base + ["--arquivo", alvo], "os takes")
    if not ok:
        return 1

    if pr.panorama_pronto:
        roda("origem_360.py", ["--arquivo", alvo,
                               "--pronto", pr.panorama_pronto],
             "panorama congelado")

    if a.take is not None:
        sel = ["--take", str(a.take)] + (["--imagem"] if a.so_imagens else [])
        rot = "so o take %d%s" % (a.take, " (imagem)" if a.so_imagens else "")
    elif a.so_imagens:
        sel, rot = ["--imagens"], "so os frames iniciais"
    else:
        sel, rot = ["--tudo"], "todos os takes"
    roda("so_take.py", ["--arquivo", alvo] + sel, rot)

    print("\npronto. Recarregue o JSON no ComfyUI.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
