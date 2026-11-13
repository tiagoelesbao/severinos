# -*- coding: utf-8 -*-
"""Monta o acervo de takes do episodio — video em movimento, nao cartela parada.

O DEFEITO QUE ISTO CORRIGE
  A primeira montagem usou cartela como FUNDO. Cartela e fundo chapado com texto:
  onde o texto acaba, sobra cor crua, e onze minutos disso e uma tela verde com
  legenda. O padrao do genero e o oposto — take real correndo por baixo, e o
  texto POR CIMA dele.

  A cartela nao estava errada; o lugar dela e que estava. Ela e camada, nao base.

O QUE ENTRA NO ACERVO, EM ORDEM DE FORCA
  1. foto do FATO       Abel, o julgamento, o clube — e o que o video trata
  2. video generico     torcida, gramado, treino, estadio a noite: da movimento
  3. escudo / camisa    ESPN, entra dentro de cartela, nunca como plano cheio

  O generico e ilustrativo e todo canal do genero usa assim. A regra que ele
  obedece: **nao pode sugerir que e o fato**. Torcida generica sob a fala sobre
  torcida e ilustracao; torcida generica sob "o momento do chute no microfone"
  seria encenacao, e isso este canal nao faz.

LICENCA
  Pexels permite uso comercial sem atribuicao obrigatoria. Ainda assim o
  `acervo.json` guarda autor e URL de cada peca: se um dia a origem for
  questionada, a resposta esta escrita, e nao na memoria de quem baixou.

USO
  python -X utf8 broll/acervo.py 2026-09-04-abel-stjd
  python -X utf8 broll/acervo.py 2026-09-04-abel-stjd --listar   (não baixa)
"""
import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
from narra_comfy import CANAL  # noqa: E402

API = "https://api.pexels.com"
# Sem User-Agent a Pexels devolve 403 — e o 403 nao diz que o problema e esse.
CAB = {"User-Agent": "Mozilla/5.0 (bora-de-bola/1.0)"}

# As consultas vao em INGLES porque e nisso que o acervo esta indexado; a mesma
# busca em portugues devolve uma fracao dos resultados e de qualidade pior.
# Cada uma declara a que BLOCO do roteiro ela serve.
CONSULTAS = [
    # ── POR QUE TUDO AQUI DIZ "SOCCER", E NUNCA "FOOTBALL" ────────────────
    # O acervo e catalogado em ingles AMERICANO: "football" ali significa
    # FUTEBOL AMERICANO. Em 06/09 sete consultas usavam a palavra e o video
    # ganhou jogada de capacete e ombreira no meio do classico.
    #
    # E consulta de EMOCAO sem contexto de esporte cai em outro lugar:
    # "crowd raising hands" trouxe pessoas de maos levantadas em CULTO, e ate
    # um cordao de crucifixo. Toda consulta agora carrega uma palavra que
    # ancora o assunto -- soccer, pitch, stadium.
    ("packed soccer stadium crowd cheering", "torcida",  ["GANCHO", "NÚMEROS", "FECHO"]),
    ("soccer supporters in stadium stands",  "torcida",  ["GANCHO", "FECHO"]),
    ("soccer fans celebrating in stadium",   "torcida",  ["ÍNDICE", "FECHO"]),
    ("soccer stadium floodlights night",     "estadio",  ["ÍNDICE", "BLOCO 6"]),
    ("aerial view soccer stadium night",     "estadio",  ["NÚMEROS", "BLOCO 6"]),
    ("empty soccer stadium seats",           "estadio",  ["CTA", "BLOCO 6"]),
    ("soccer players training drills",       "treino",   ["BLOCO 4", "BLOCO 5"]),
    ("soccer team training on pitch",        "treino",   ["BLOCO 5"]),
    ("soccer player kicking ball match",     "jogo",     ["ÍNDICE", "BLOCO 4"]),
    ("soccer players competing on pitch",    "jogo",     ["BLOCO 2", "BLOCO 4"]),
    ("soccer goal post net on pitch",        "campo",    ["ABERTURA", "BLOCO 2"]),
    ("soccer boots close up on grass",       "campo",    ["CTA", "ABERTURA", "BLOCO 3"]),
    ("soccer referee showing yellow card",   "arbitro",  ["BLOCO 1", "BLOCO 3"]),
    # "whistle close up" trouxe um CRUCIFIXO pendurado no pescoco -- o acervo
    # casou "close up" com o objeto, nao com o apito. Consulta de OBJETO isolado
    # e a mais perigosa: sem gente e sem campo no quadro, nada ancora o assunto.
    ("soccer referee showing red card player", "arbitro", ["GANCHO", "BLOCO 3"]),
    ("soccer players arguing with referee",  "arbitro",  ["BLOCO 1", "BLOCO 3B"]),
    # "referee running on pitch" trouxe RUGBY: a cena descrita existe nos dois
    # esportes, e sem a bola no quadro o acervo escolhe o que quiser.
    ("soccer referee with ball on field",    "arbitro",  ["BLOCO 3", "BLOCO 3B"]),
]

# Um take precisa durar mais que o plano; abaixo disso ele repete dentro do
# proprio plano, e repeticao curta le como travamento.
# Clipe curto reaproveitado tres vezes mostra o mesmo trecho tres vezes,
# por mais que o ponto de entrada seja sorteado.
MIN_S, MAX_S = 9, 45
LARG_MIN = 1280


def busca(caminho, chave, **q):
    url = "%s/%s?%s" % (API, caminho, urllib.parse.urlencode(q))
    r = urllib.request.Request(url, headers=dict(CAB, Authorization=chave))
    with urllib.request.urlopen(r, timeout=40) as f:
        return json.load(f)


def escolhe_arquivo(v):
    """O menor arquivo que ainda entrega 1080p — baixar 4K para exibir em 1080
    e minuto de download e disco por nenhum pixel a mais na entrega."""
    fs = [f for f in v.get("video_files", [])
          if (f.get("width") or 0) >= LARG_MIN and f.get("link")]
    if not fs:
        return None
    exatos = [f for f in fs if f["width"] <= 1920]
    return sorted(exatos or fs, key=lambda f: f["width"])[-1] if exatos else \
        sorted(fs, key=lambda f: f["width"])[0]


def baixa(url, destino):
    r = urllib.request.Request(url, headers=CAB)
    with urllib.request.urlopen(r, timeout=180) as f, open(destino, "wb") as g:
        while True:
            b = f.read(262144)
            if not b:
                break
            g.write(b)
    return os.path.getsize(destino)


def folha_de_contato(pasta):
    """Um frame de cada take, lado a lado, para CONFERIR o que veio.

    POR QUE ISTO NAO E OPCIONAL
      A consulta nao garante o assunto. Em 06/09, depois de eu ja ter trocado
      todo "football" por "soccer", o acervo ainda devolveu:

        - "soccer referee whistle close up"  -> um CRUCIFIXO pendurado no pescoco
        - "soccer referee running on pitch"  -> RUGBY

      Os dois foram para o video e o founder os viu na tela. Consulta de OBJETO
      isolado ("whistle close up") e a mais perigosa: sem gente e sem campo no
      quadro, nada ancora o assunto. Cena que existe em varios esportes
      ("referee running on pitch") vem igualmente perigosa.

      Nao ha como automatizar esse julgamento -- e olhar. O que da para
      automatizar e PRODUZIR A FOLHA, para que olhar custe dez segundos.

    Sai em `_CONFERIR.jpg`, dentro da propria pasta do acervo.
    """
    import glob
    import subprocess as sp
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return None
    mp4 = sorted(glob.glob(os.path.join(pasta, "*.mp4")))
    if not mp4:
        return None
    tmp = os.path.join(pasta, "_frames")
    os.makedirs(tmp, exist_ok=True)
    ims = []
    for f in mp4:
        n = os.path.splitext(os.path.basename(f))[0]
        j = os.path.join(tmp, n + ".jpg")
        sp.run(["ffmpeg", "-v", "error", "-ss", "2", "-i", f, "-frames:v", "1",
                "-vf", "scale=260:-1", j, "-y"], capture_output=True)
        if os.path.isfile(j):
            ims.append((n, Image.open(j)))
    if not ims:
        return None
    W, H = ims[0][1].size
    C = 4
    L = (len(ims) + C - 1) // C
    folha = Image.new("RGB", (C * W, L * (H + 18)), (18, 18, 18))
    d = ImageDraw.Draw(folha)
    for i, (n, im) in enumerate(ims):
        x, y = (i % C) * W, (i // C) * (H + 18)
        folha.paste(im.resize((W, H)), (x, y + 18))
        d.text((x + 3, y + 3), n, fill=(240, 240, 240))
    alvo = os.path.join(pasta, "_CONFERIR.jpg")
    folha.save(alvo, quality=88)
    for _, im in ims:
        im.close()
    import shutil
    shutil.rmtree(tmp, ignore_errors=True)
    return alvo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--listar", action="store_true", help="mostra sem baixar")
    a = ap.parse_args()

    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(AQUI)), ".env"))
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(
        os.path.dirname(AQUI))), ".env"))
    chave = os.getenv("PEXELS_API_KEY", "").strip()
    if not chave:
        print("PEXELS_API_KEY ausente no .env")
        return 1

    saida = os.path.join(CANAL, "episodios", a.slug, "04-takes", "acervo")
    os.makedirs(saida, exist_ok=True)

    print("%-30s %-9s %5s %10s  %s" % ("CONSULTA", "ETIQUETA", "DUR", "TAM", "ARQUIVO"))
    print("─" * 78)
    acervo, usados = [], set()
    for i, (q, etiqueta, blocos) in enumerate(CONSULTAS, 1):
        try:
            d = busca("videos/search", chave, query=q, per_page=15,
                      orientation="landscape", size="medium")
        except Exception as e:
            print("%-30s  falhou: %s" % (q[:30], e))
            continue

        v = arq = None
        for cand in d.get("videos", []):
            # Um mesmo video aparece em consultas parecidas; repeti-lo no acervo
            # significaria repeti-lo na tela achando que sao dois takes.
            if cand["id"] in usados:
                continue
            if not (MIN_S <= cand.get("duration", 0) <= MAX_S):
                continue
            f = escolhe_arquivo(cand)
            if f:
                v, arq = cand, f
                break
        if not v:
            print("%-30s  nenhum candidato dentro dos limites" % q[:30])
            continue
        usados.add(v["id"])

        nome = "t%02d-%s.mp4" % (i, etiqueta)
        destino = os.path.join(saida, nome)
        tam = 0
        if not a.listar:
            if os.path.isfile(destino) and os.path.getsize(destino) > 10240:
                tam = os.path.getsize(destino)
            else:
                try:
                    tam = baixa(arq["link"], destino)
                except Exception as e:
                    print("%-30s  download falhou: %s" % (q[:30], e))
                    continue
        print("%-30s %-9s %4ds %9s  %s"
              % (q[:30], etiqueta, v["duration"],
                 "%.1f MB" % (tam / 1048576) if tam else "—", nome))
        acervo.append({
            "arquivo": nome, "etiqueta": etiqueta, "blocos": blocos,
            "duracao": v["duration"], "consulta": q,
            "largura": arq["width"], "altura": arq["height"],
            "origem": "pexels", "pexels_id": v["id"],
            "autor": (v.get("user") or {}).get("name", ""),
            "url": v.get("url", ""),
            "licenca": "Pexels License — uso comercial livre, atribuição não obrigatória",
        })

    if not a.listar:
        with open(os.path.join(saida, "acervo.json"), "w", encoding="utf-8") as f:
            json.dump(acervo, f, ensure_ascii=False, indent=2)
    print("─" * 78)
    print("%d takes · %s" % (len(acervo), saida))

    fc = folha_de_contato(saida)
    if fc:
        print()
        print("  OLHE ANTES DE MONTAR: %s" % fc)
        print("  a consulta nao garante o assunto -- ja vieram crucifixo e rugby")
    return 0


if __name__ == "__main__":
    sys.exit(main())
