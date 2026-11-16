# -*- coding: utf-8 -*-
"""Pack de publicacao — tudo de um episodio num lugar so, do titulo ao video.

POR QUE UM PACK, E NAO ARQUIVOS ESPALHADOS
  Um episodio nao e um arquivo, e uma corrente: pauta, embalagem, roteiro,
  narracao, takes, audio, montagem. Se cada estagio grava onde quer, ninguem
  responde a pergunta que mais importa no dia a dia — "o que falta neste
  episodio?" — sem abrir seis pastas.

  O pack responde isso em um arquivo. `publicacao.yaml` e o INDICE: lista o que
  ja existe, o que falta, e as decisoes travadas (titulo, thumb, estilo). Os
  estagios seguintes leem dali e escrevem de volta.

ONDE ELE MORA, E POR QUE
  workspaces/businesses/virals/creative-studio/canais/{canal}/episodios/

  Dentro do registro do CANAL, junto do channel-brief, do thumb-system e do
  voice-lock. O episodio herda a identidade do canal por vizinhanca: quem abre a
  pasta do canal ve a identidade e a producao no mesmo lugar.

  Nao fica em `apps/`, porque `apps/` e codigo. Nao fica em `outputs/`, porque
  la e destino de render, nao registro de publicacao.

Uso:
    python pack.py novo 2026-09-04-abel-stjd
    python pack.py estado 2026-09-04-abel-stjd
    python pack.py estado                       # todos os episodios
"""
import argparse
import json
import os
import shutil
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
CANAL = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                     "creative-studio", "canais", "bora-de-bola")
EPISODIOS = os.path.join(CANAL, "episodios")

# A ordem e a do pipeline. Cada pasta declara o que espera receber, para que o
# `estado` saiba dizer o que falta sem precisar de um arquivo de configuracao
# por episodio.
ETAPAS = [
    ("00-pauta", "Pauta e fontes",
     ["fato.json"], "/pauta-futebol"),
    ("01-embalagem", "Título, thumb e a promessa",
     ["titulo.md", "thumb-final.png"], "/packaging"),
    ("02-roteiro", "Roteiro e razão de claims",
     ["roteiro.md", "claim-ledger.json"], "@head-of-copy"),
    ("03-narracao", "Locução gerada",
     ["vo.mp3"], "voz.py perfil vod"),
    ("04-takes", "Imagens e vídeos que alternam na tela",
     [], "@image-lead"),
    ("05-audio", "Trilha e ambiência",
     [], "@sound-designer"),
    ("06-final", "Montagem e metadados de publicação",
     ["video.mp4"], "@editor"),
]


def caminho(slug):
    return os.path.join(EPISODIOS, slug)


def novo(slug, titulo=None, thumb_texto=None, estilo="E3"):
    base = caminho(slug)
    for pasta, _, _, _ in ETAPAS:
        os.makedirs(os.path.join(base, pasta), exist_ok=True)
    os.makedirs(os.path.join(base, "01-embalagem", "thumbs"), exist_ok=True)

    man = os.path.join(base, "publicacao.yaml")
    if os.path.exists(man):
        print("já existe: %s" % man)
        return base

    with open(man, "w", encoding="utf-8") as f:
        f.write("""# ═══════════════════════════════════════════════════════════════════════
# %s
# O índice do episódio. Cada estágio lê daqui e escreve de volta.
# ═══════════════════════════════════════════════════════════════════════

episodio:
  slug: %s
  canal: bora-de-bola
  criado_em: '%s'
  status: embalagem        # pauta | embalagem | roteiro | producao | montagem | publicado

# ── DECISÕES TRAVADAS ────────────────────────────────────────────────────
# Mudar qualquer uma daqui exige refazer o que veio depois.
decisoes:
  titulo: %s
  thumb_texto: %s
  estilo_thumb: %s        # E3 | E5 | E7 | E10 (thumb-system.yaml § templates)
  promessa: ''
  aprovado_em: ''
  aprovado_por: ''

# ── A CORRENTE ───────────────────────────────────────────────────────────
etapas:
  '00-pauta':      { feito: false, responsavel: '/pauta-futebol' }
  '01-embalagem':  { feito: false, responsavel: '/packaging' }
  '02-roteiro':    { feito: false, responsavel: '@head-of-copy' }
  '03-narracao':   { feito: false, responsavel: 'voz.py perfil vod' }
  '04-takes':      { feito: false, responsavel: '@image-lead' }
  '05-audio':      { feito: false, responsavel: '@sound-designer' }
  '06-final':      { feito: false, responsavel: '@editor' }

# ── PUBLICAÇÃO ───────────────────────────────────────────────────────────
publicacao:
  plataforma: youtube
  canal_id: ''
  publicado_em: ''
  url: ''
  desempenho:
    impressoes: null
    ctr: null
    retencao_media: null
""" % (slug, slug, datetime.now().strftime("%Y-%m-%d %H:%M"),
       json.dumps(titulo or "", ensure_ascii=False),
       json.dumps(thumb_texto or "", ensure_ascii=False), estilo))

    print("pack criado: %s" % base)
    for pasta, nome, _, _ in ETAPAS:
        print("  %-14s %s" % (pasta, nome))
    return base


def estado(slug=None):
    if not os.path.isdir(EPISODIOS):
        print("nenhum episódio ainda")
        return
    slugs = [slug] if slug else sorted(os.listdir(EPISODIOS))
    for s in slugs:
        base = caminho(s)
        if not os.path.isdir(base):
            print("não achei %s" % s)
            continue
        print("\n%s" % s)
        print("─" * 74)
        for pasta, nome, espera, quem in ETAPAS:
            d = os.path.join(base, pasta)
            arqs = []
            for r, _, fs in os.walk(d):
                arqs += [f for f in fs if not f.startswith(".")]
            faltam = [e for e in espera if not os.path.exists(os.path.join(d, e))]
            if espera:
                marca = "ok " if not faltam else "—  "
            else:
                marca = "ok " if arqs else "—  "
            detalhe = ("%d arquivo%s" % (len(arqs), "" if len(arqs) == 1 else "s")
                       if arqs else "vazio")
            falta = ("  falta: %s" % ", ".join(faltam)) if faltam else ""
            print("  %s %-14s %-34s %-12s %s" % (marca, pasta, nome, detalhe, falta))
            if faltam or not arqs:
                print("     %s" % quem)


def migra(slug, origem):
    """Move o que ja existe do job antigo para dentro do pack."""
    base = caminho(slug)
    mapa = [
        ("fato.json", "00-pauta"),
        ("titulo.md", "01-embalagem"),
        ("candidatos.json", "01-embalagem"),
    ]
    movidos = 0
    for arq, destino in mapa:
        o = os.path.join(origem, arq)
        if os.path.isfile(o):
            shutil.copy2(o, os.path.join(base, destino, arq))
            movidos += 1
    val = os.path.join(origem, "validacao")
    if os.path.isdir(val):
        for f in os.listdir(val):
            shutil.copy2(os.path.join(val, f),
                         os.path.join(base, "01-embalagem", "thumbs", f))
            movidos += 1
    return movidos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("acao", choices=["novo", "estado", "migra"])
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--titulo")
    ap.add_argument("--thumb")
    ap.add_argument("--estilo", default="E3")
    ap.add_argument("--de")
    a = ap.parse_args()

    if a.acao == "novo":
        novo(a.slug, a.titulo, a.thumb, a.estilo)
    elif a.acao == "migra":
        n = migra(a.slug, a.de)
        print("%d arquivos movidos para o pack" % n)
    else:
        estado(a.slug)
    return 0


if __name__ == "__main__":
    sys.exit(main())
