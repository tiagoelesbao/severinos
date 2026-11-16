# -*- coding: utf-8 -*-
"""Move pasta fria para o HD e deixa um atalho no lugar — nada quebra.

O PROBLEMA
  Tres discos com perfis muito diferentes:

    C:  ADATA LEGEND 710     SSD NVMe    476 GB   ~3.500 MB/s
    D:  Kingston SA400       SSD SATA    111 GB     ~500 MB/s
    E:  WDC WD5000AAKX       HDD 7200    466 GB     ~130 MB/s

  Os dois SSD estao apertados e o HD esta vazio. Mas mover pasta na mao quebra
  caminho: script, workflow e config que apontam para `C:\\...\\outputs` param de
  achar. A saida e mover o CONTEUDO e deixar uma JUNCTION no caminho antigo --
  o Windows resolve sozinho e nenhum codigo precisa mudar.

POR QUE JUNCTION E NAO SYMLINK
  Junction (`mklink /J`) funciona sem privilegio de administrador; symlink de
  diretorio exige. Como isto vai rodar em sessao normal, junction e a unica que
  nao pede elevacao. Limite: so serve para DIRETORIO e so no mesmo computador --
  que e exatamente o caso.

O QUE PODE IR PARA O HD, E O QUE NAO PODE
  Pode: acervo, render antigo, cache regeneravel, material de referencia,
  modelo que nao esta na fase atual.

  NAO pode: modelo que o ComfyUI vai carregar na sessao. Um LTX de 22 GB sai do
  HD em ~2,8 min contra ~7 s do NVMe -- e se o grafo troca de modelo entre
  execucoes, isso vira o gargalo da noite. Para esses existe `--ativar`, que
  traz de volta para o SSD enquanto a fase dura.

FOLGA NOS SSD
  O script recusa mover coisa PARA um SSD que ficaria com menos de `--folga`
  (padrao 25 GB). SSD cheio nao so fica lento como derruba trabalho que precisa
  de arquivo temporario grande -- e o motor de video precisa.

USO
    python arquiva.py --plano
    python arquiva.py --mover "C:\\...\\outputs" --categoria renders
    python arquiva.py --listar
    python arquiva.py --restaurar "C:\\...\\outputs"
    python arquiva.py --ativar modelos-repouso/unet/Wan2.2-I2V-A14B-HighNoise-Q4_K_M.gguf
"""
import argparse
import io
import json
import os
import shutil
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HD = r"E:\Acervo"
MANIFESTO = os.path.join(HD, "_manifesto.json")
FOLGA_PADRAO_GB = 25


def _gb(n):
    return n / 2 ** 30


def _livre(caminho):
    import ctypes
    livre = ctypes.c_ulonglong(0)
    ctypes.windll.kernel32.GetDiskFreeSpaceExW(
        ctypes.c_wchar_p(os.path.splitdrive(os.path.abspath(caminho))[0] + "\\"),
        None, None, ctypes.pointer(livre))
    return livre.value


def _tamanho(caminho):
    if os.path.isfile(caminho):
        return os.path.getsize(caminho)
    t = 0
    for raiz, _, arqs in os.walk(caminho):
        for a in arqs:
            try:
                t += os.path.getsize(os.path.join(raiz, a))
            except OSError:
                pass
    return t


def _e_junction(caminho):
    """True se o caminho ja e um atalho (reparse point)."""
    try:
        return bool(os.path.isdir(caminho) and
                    os.readlink(caminho))
    except OSError:
        return False


def _manifesto():
    if os.path.isfile(MANIFESTO):
        try:
            return json.load(io.open(MANIFESTO, encoding="utf-8"))
        except Exception:
            pass
    return {"itens": []}


def _grava(m):
    os.makedirs(HD, exist_ok=True)
    io.open(MANIFESTO, "w", encoding="utf-8").write(
        json.dumps(m, ensure_ascii=False, indent=2))


def _apaga(caminho, tentativas=5):
    """rmtree que aguenta o HD.

    No disco mecanico o Windows devolve `WinError 145 (pasta nao esta vazia)`
    no meio de um rmtree: a remocao dos filhos ainda nao terminou quando o pai
    e tentado. Nao e erro de logica -- e latencia. Repetir com pausa resolve.
    """
    for i in range(tentativas):
        try:
            if os.path.isdir(caminho):
                # `rd /s /q` do proprio Windows em vez de `shutil.rmtree`: o
                # rmtree do Python percorre a arvore e chama `os.rmdir` no pai
                # assim que termina os filhos, e no HD a remocao dos filhos
                # ainda nao foi para o disco -- WinError 145 em pasta que ele
                # mesmo acabou de esvaziar. O `rd` nao tem essa corrida.
                r = subprocess.run(["cmd", "/c", "rd", "/s", "/q", caminho],
                                   capture_output=True)
                if os.path.isdir(caminho):
                    raise OSError("rd nao removeu: %s" % caminho)
            elif os.path.exists(caminho):
                os.remove(caminho)
            return True
        except OSError:
            if i == tentativas - 1:
                raise
            time.sleep(1.0 + i)
    return False


def mover(origem, categoria, folga_gb=FOLGA_PADRAO_GB, seco=False):
    """Move o conteudo para o HD e deixa uma junction no caminho antigo."""
    origem = os.path.abspath(origem)
    if not os.path.exists(origem):
        print("   nao existe: %s" % origem)
        return False
    if _e_junction(origem):
        print("   ja e atalho: %s" % origem)
        return False

    tam = _tamanho(origem)
    destino = os.path.join(HD, categoria, os.path.basename(origem))
    if os.path.exists(destino):
        # Execucao interrompida no meio deixa copia PARCIAL. Se o tamanho bate,
        # o trabalho ja foi feito e so falta trocar pelo atalho; se nao bate, a
        # copia esta incompleta e tem de ser refeita do zero.
        parcial = _tamanho(destino)
        if parcial == tam:
            print("   %-52s ja copiado, so faltava o atalho"
                  % os.path.basename(origem)[:52])
        else:
            print("   %-52s copia parcial (%.2f de %.2f GB) — refazendo"
                  % (os.path.basename(origem)[:52], _gb(parcial), _gb(tam)))
            _apaga(destino)
    if tam > _livre(HD):
        print("   nao cabe no HD: precisa %.1f GB, tem %.1f GB"
              % (_gb(tam), _gb(_livre(HD))))
        return False

    print("   %-52s %7.2f GB" % (os.path.basename(origem)[:52], _gb(tam)))
    if seco:
        return True

    os.makedirs(os.path.dirname(destino), exist_ok=True)
    if os.path.exists(destino):
        pass                              # ja conferido acima, so falta o resto
    # COPIA, CONFERE, SO ENTAO APAGA. `shutil.move` entre volumes diferentes ja
    # e copia+apaga por baixo, mas sem conferencia: se a copia sair curta, o
    # original ja foi. Aqui o original so morre depois de o tamanho bater.
    if not os.path.exists(destino):
        if os.path.isdir(origem):
            shutil.copytree(origem, destino)
        else:
            shutil.copy2(origem, destino)
    novo = _tamanho(destino)
    if novo != tam:
        print("   [ERRO] copia saiu com %.2f GB contra %.2f GB — original "
              "MANTIDO" % (_gb(novo), _gb(tam)))
        return False

    _apaga(origem)
    # `text=True` assume utf-8 e o `cmd` responde na codepage do console
    # (cp850/cp1252 aqui). Com acento na mensagem de erro, o decode estoura e
    # derruba o script DEPOIS de o original ja ter sido apagado.
    r = subprocess.run(["cmd", "/c", "mklink", "/J", origem, destino],
                       capture_output=True)
    saida = (r.stdout or b"") + (r.stderr or b"")
    saida = saida.decode("utf-8", errors="replace")
    if r.returncode != 0:
        # sem o atalho o caminho antigo fica orfao — melhor desfazer
        shutil.move(destino, origem)
        print("   [ERRO] mklink falhou (%s) — desfeito" % saida.strip()[:60])
        return False

    m = _manifesto()
    m["itens"] = [x for x in m["itens"] if x["origem"] != origem]
    m["itens"].append({"origem": origem, "destino": destino,
                       "categoria": categoria, "bytes": tam,
                       "quando": time.strftime("%Y-%m-%d %H:%M")})
    _grava(m)
    return True


def restaurar(origem, folga_gb=FOLGA_PADRAO_GB):
    """Traz de volta para o disco original e remove o atalho."""
    origem = os.path.abspath(origem)
    m = _manifesto()
    it = next((x for x in m["itens"] if x["origem"].lower() == origem.lower()),
              None)
    if not it:
        print("   nao esta no manifesto: %s" % origem)
        return False
    tam = _tamanho(it["destino"])
    livre = _livre(origem)
    if livre - tam < folga_gb * 2 ** 30:
        print("   [RECUSADO] o disco ficaria com %.1f GB (folga minima %d GB)"
              % (_gb(livre - tam), folga_gb))
        return False
    if _e_junction(origem):
        os.rmdir(origem)                 # remove so o atalho, nao o conteudo
    shutil.move(it["destino"], origem)
    m["itens"] = [x for x in m["itens"] if x is not it]
    _grava(m)
    print("   restaurado: %s (%.2f GB)" % (origem, _gb(tam)))
    return True


def listar():
    m = _manifesto()
    if not m["itens"]:
        print("   nada arquivado ainda")
        return
    tot = 0
    print("%-10s %9s  %s" % ("CATEGORIA", "TAMANHO", "ORIGEM"))
    print("-" * 78)
    for x in sorted(m["itens"], key=lambda y: -y["bytes"]):
        tot += x["bytes"]
        print("%-10s %7.2f GB  %s" % (x["categoria"][:10], _gb(x["bytes"]),
                                      x["origem"][:54]))
    print("-" * 78)
    print("%d item(ns) · %.1f GB no HD" % (len(m["itens"]), _gb(tot)))


# ── O PLANO PADRAO ──────────────────────────────────────────────────────────
#
# Cada linha e (caminho, categoria, por que pode ir). A ordem e por seguranca:
# o que e puro cache primeiro, o que e trabalho concluido depois.
U = os.path.expanduser("~")
REPO = os.path.join(U, "Desktop", "Sistemas", "Virals", "severinos")
COMFY = os.path.join(U, "Desktop", "ComfyUI_windows_portable", "ComfyUI")

PLANO = [
    (os.path.join(U, "AppData", "Roaming", "Claude", "vm_bundles"),
     "caches", "sandbox do Claude Code — regenera sozinho"),
    (os.path.join(U, ".cache", "huggingface"),
     "caches", "modelos baixados por script; o HF rebaixa se faltar"),
    (os.path.join(U, "AppData", "Roaming", "Notion"),
     "caches", "cache do app"),
    (os.path.join(COMFY, "output"),
     "renders", "saidas antigas do ComfyUI"),
    (os.path.join(REPO, "outputs"),
     "renders", "renders ja entregues do projeto"),
    (os.path.join(U, "Desktop", "Sistemas", "SaAS", "Bot_youtube", "downloads"),
     "referencia", "videos modelados — material de consulta"),
]


def plano(seco=True, folga_gb=FOLGA_PADRAO_GB):
    print("DISCOS")
    for d in ("C:\\", "D:\\", "E:\\"):
        if os.path.exists(d):
            print("   %s  %.1f GB livres" % (d, _gb(_livre(d))))
    print("\nPLANO — %s" % ("SIMULACAO" if seco else "EXECUTANDO"))
    print("-" * 78)
    tot = 0
    for caminho, cat, porque in PLANO:
        if not os.path.exists(caminho):
            print("   %-52s (nao existe)" % os.path.basename(caminho)[:52])
            continue
        if _e_junction(caminho):
            print("   %-52s (ja arquivado)" % os.path.basename(caminho)[:52])
            continue
        t = _tamanho(caminho)
        tot += t
        print("   %-52s %7.2f GB  %s" % (os.path.basename(caminho)[:52],
                                         _gb(t), porque))
        if not seco:
            mover(caminho, cat, folga_gb, seco=False)
    print("-" * 78)
    print("total a liberar dos SSD: %.1f GB" % _gb(tot))


# ── MODELOS: DORMIR E ACORDAR ───────────────────────────────────────────────
#
# Modelo e caso a parte porque a SUBPASTA importa: `unet/`, `text_encoders/`,
# `loras/`. Arquivando sem ela, a volta vira adivinhacao -- e o ComfyUI so acha
# o modelo se ele estiver na pasta certa.
MODELOS = r"D:\ComfyUI_Models"
MODELOS_HD = os.path.join(HD, "modelos")


def dormir(padrao, seco=False):
    r"""Manda para o HD todo modelo cujo caminho relativo casa com `padrao`.

    O arquivo vai para `E:\Acervo\modelos\{mesma subpasta}\{mesmo nome}`, e
    NAO fica junction no lugar: modelo ausente o ComfyUI simplesmente nao lista,
    enquanto junction para o HD ele carregaria -- devagar, sem avisar, e a lentidao
    apareceria como "o Wan travou" tres horas depois.
    """
    import fnmatch
    achados = []
    for raiz, dirs, arqs in os.walk(MODELOS):
        dirs[:] = [d for d in dirs if d != ".cache"]
        for a in arqs:
            rel = os.path.relpath(os.path.join(raiz, a), MODELOS)
            if fnmatch.fnmatch(rel.replace("\\", "/").lower(),
                               padrao.replace("\\", "/").lower()):
                achados.append(rel)
    if not achados:
        print("   nada casou com %s" % padrao)
        return 0
    tot = 0
    for rel in sorted(achados):
        org = os.path.join(MODELOS, rel)
        t = _tamanho(org)
        tot += t
        print("   %-56s %7.2f GB" % (rel[:56], _gb(t)))
        if seco:
            continue
        dst = os.path.join(MODELOS_HD, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(org, dst)
        if _tamanho(dst) != t:
            print("      [ERRO] copia curta — original mantido")
            continue
        os.remove(org)
        m = _manifesto()
        m["itens"].append({"origem": org, "destino": dst,
                           "categoria": "modelo", "bytes": t,
                           "quando": time.strftime("%Y-%m-%d %H:%M")})
        _grava(m)
    print("   %s %.1f GB" % ("liberaria" if seco else "liberado", _gb(tot)))
    return tot


def acordar(padrao, folga_gb=FOLGA_PADRAO_GB):
    r"""Traz o modelo de volta para `D:\ComfyUI_Models`, na subpasta certa."""
    import fnmatch
    m = _manifesto()
    alvos = [x for x in m["itens"] if x["categoria"] == "modelo"
             and fnmatch.fnmatch(os.path.relpath(x["destino"], MODELOS_HD)
                                 .replace("\\", "/").lower(),
                                 padrao.replace("\\", "/").lower())]
    if not alvos:
        print("   nada dormindo casa com %s" % padrao)
        return 0
    precisa = sum(x["bytes"] for x in alvos)
    livre = _livre(MODELOS)
    if livre - precisa < folga_gb * 2 ** 30:
        print("   [RECUSADO] %s ficaria com %.1f GB (folga minima %d GB)"
              % (os.path.splitdrive(MODELOS)[0], _gb(livre - precisa), folga_gb))
        print("   ponha outro modelo para dormir antes, ou baixe a folga")
        return 0
    for x in alvos:
        os.makedirs(os.path.dirname(x["origem"]), exist_ok=True)
        shutil.move(x["destino"], x["origem"])
        print("   %-56s %7.2f GB" % (
            os.path.relpath(x["origem"], MODELOS)[:56], _gb(x["bytes"])))
    m["itens"] = [x for x in m["itens"] if x not in alvos]
    _grava(m)
    return precisa


def dormindo():
    m = _manifesto()
    mods = [x for x in m["itens"] if x["categoria"] == "modelo"]
    if not mods:
        print("   nenhum modelo dormindo")
        return
    print("%9s  %s" % ("TAMANHO", "SUBPASTA / ARQUIVO"))
    print("-" * 74)
    for x in sorted(mods, key=lambda y: -y["bytes"]):
        print("%7.2f GB  %s" % (_gb(x["bytes"]),
                                os.path.relpath(x["destino"], MODELOS_HD)))
    print("-" * 74)
    print("%d modelo(s) · %.1f GB no HD" % (len(mods),
                                            _gb(sum(x["bytes"] for x in mods))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plano", action="store_true", help="simula o plano padrao")
    ap.add_argument("--executar", action="store_true", help="executa o plano")
    ap.add_argument("--mover", help="caminho avulso para arquivar")
    ap.add_argument("--categoria", default="avulso")
    ap.add_argument("--restaurar", help="traz de volta para o disco original")
    ap.add_argument("--listar", action="store_true")
    ap.add_argument("--folga", type=int, default=FOLGA_PADRAO_GB,
                    help="GB que todo SSD tem de manter livre")
    ap.add_argument("--dormir", help="padrao de modelo para mandar ao HD "
                                     "(ex.: 'TTS/*' ou '*/ace_step*')")
    ap.add_argument("--acordar", help="padrao de modelo para trazer de volta")
    ap.add_argument("--dormindo", action="store_true",
                    help="lista os modelos que estao no HD")
    ap.add_argument("--seco", action="store_true", help="so simula")
    a = ap.parse_args()

    if a.dormindo:
        dormindo()
    elif a.dormir:
        dormir(a.dormir, a.seco)
    elif a.acordar:
        acordar(a.acordar, a.folga)
    elif a.listar:
        listar()
    elif a.restaurar:
        restaurar(a.restaurar, a.folga)
    elif a.mover:
        mover(a.mover, a.categoria, a.folga)
    elif a.executar:
        plano(seco=False, folga_gb=a.folga)
    else:
        plano(seco=True, folga_gb=a.folga)
    return 0


if __name__ == "__main__":
    sys.exit(main())
