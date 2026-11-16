# -*- coding: utf-8 -*-
"""Extrai o INSERT EMOCIONAL dos videos modelados e monta um banco reusavel.

O PROBLEMA QUE ISTO RESOLVE
  No formato de placa, o bloco emocional e o motor: um bicho abandonado, magro,
  ferido ou doente, descrito em duas ou tres frases, e logo depois o pedido de
  coracao nos comentarios. E ele que paga o CTA.

  O acervo de banco de imagem NAO TEM ISSO. O Pexels tem cachorro de rua bonito
  em dia de sol; nao tem bicho sofrendo, e nem deveria. Preenchendo aquele bloco
  com o que o banco devolve, sai take aleatorio -- um bisao pastando, uma gaivota
  voando -- exatamente onde a locucao diz "olha so esse aqui" e pede comocao.
  Foi o defeito que o founder apontou, e ele esta certo: sem o bicho, o bloco
  nao existe.

DE ONDE VEM O MATERIAL
  Dos proprios videos modelados. Cada um deles tem um insert de dez a quinze
  segundos, e sao treze videos em disco. Quem fez o canal tambem nao saiu
  filmando bicho ferido: pegou de algum lugar. O founder decidiu a questao de
  direitos e a decisao esta registrada; aqui o trabalho e tecnico.

COMO O TRECHO E ACHADO — pela propria locucao, nao no olho
  A estrutura dos videos e rigida (ver `docs/MODELAGEM-LOTE-08-09.md`): o insert
  comeca depois do CTA e termina quando o payoff comeca. As duas fronteiras sao
  ditas em voz alta, quase sempre nas mesmas palavras:

    inicio   "like and subscribe" / "don't skip"        -> o CTA acabou
    fim      "this sign is" / "back to the video" /      -> o payoff comecou
             "when you see" / "signs like this"

  Transcrevendo e procurando essas fronteiras, o corte sai exato e sem palpite.
  Quando alguma fronteira nao aparece, o script AVISA e pula -- e melhor um
  banco menor do que um corte que pega meia frase de payoff.

O QUE SAI
  `data/inserts-emocionais/{origem}.mp4`, ja sem a legenda queimada do canal
  original (o `limpa_legenda.py` roda em cima de cada corte).

USO
    python banco_insert.py --de "C:\\...\\downloads\\placas"
    python banco_insert.py --de "C:\\...\\downloads" --lista
"""
import argparse
import io
import json
import os
import re
import subprocess
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
BANCO = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio",
                     "data", "inserts-emocionais")
LIMPA = os.path.join(RAIZ, "apps", "video-tools", "limpa_legenda.py")

# As fronteiras faladas. Ordem importa: a primeira que casar vence.
ABRE = ["like and subscribe", "subscribe", "don't skip", "dont skip",
        "i'll tell you", "ill tell you"]
FECHA = ["this sign is", "back to the video", "when you see",
         "signs like this", "this sign was", "the sign is",
         "you should run", "this sign showing"]

# O insert tem entre 6 e 20 s nos treze videos medidos. Fora disso, a fronteira
# casou no lugar errado e o corte nao presta.
MIN_S, MAX_S = 6.0, 22.0


def _slug(t):
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Za-z0-9]+", "-", t).strip("-").lower()[:44]


def transcreve(video, tmp):
    from faster_whisper import WhisperModel
    w = os.path.join(tmp, "_bi.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vn",
                    "-ac", "1", "-ar", "16000", w], check=True)
    m = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(w, language="en", vad_filter=False)
    return [(s.start, s.end, (s.text or "").strip().lower()) for s in segs]


def acha_trecho(segs):
    """(inicio, fim) do insert emocional, ou None com o motivo."""
    ini = fim = None
    for a, b, t in segs:
        if ini is None and any(k in t for k in ABRE):
            ini = b                      # comeca quando a frase do CTA ACABA
        elif ini is not None and any(k in t for k in FECHA):
            fim = a                      # termina quando o payoff COMECA
            break
    if ini is None:
        return None, "nao achou a fronteira de abertura (o CTA)"
    if fim is None:
        return None, "nao achou a fronteira de fechamento (o payoff)"
    d = fim - ini
    if not (MIN_S <= d <= MAX_S):
        return None, "trecho de %.1fs fora da faixa de %g a %g s" % (d, MIN_S, MAX_S)
    return (ini, fim), ""


def extrai(video, ini, fim, saida, limpar=True):
    """Corta o trecho e tira a legenda queimada do canal de origem.

    A FAIXA E MEDIDA NO VIDEO INTEIRO, NAO NO CORTE.
      O detector do `limpa_legenda.py` acha a faixa por PERSISTENCIA: a linha
      que acusa texto em quase todos os quadros. Num corte de quinze segundos
      dominado pela legenda, quase toda linha acusa, o bloco cresce e a
      reconstrucao come o quadro -- a primeira tentativa devolveu sete inserts
      borrados de ponta a ponta.

      No video completo de quarenta segundos existe linha de base limpa: os
      trechos sem legenda dao o contraste que separa a faixa do resto. Medindo
      la e aplicando aqui, o corte sai certo.
    """
    sys.path.insert(0, os.path.dirname(LIMPA))
    bruto = saida + ".bruto.mp4"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", "%.2f" % ini, "-i", video,
         "-t", "%.2f" % (fim - ini), "-an",
         "-c:v", "libx264", "-preset", "slow", "-crf", "18",
         "-pix_fmt", "yuv420p", bruto], check=True)
    if not limpar:
        os.replace(bruto, saida)
        return "sem limpeza"
    try:
        import limpa_legenda as LL
        bandas, (w, h) = LL.faixas(video)          # <- medida no COMPLETO
        if not bandas:
            os.replace(bruto, saida)
            return "sem faixa detectada"

        # CORTAR, NAO RECONSTRUIR.
        #
        # A reconstrucao do LaMa precisa de 26 px de margem em volta da caixa e
        # de 66 px de contexto -- e sobre um quadro de 360x640 isso vira uma
        # tarja larga que atravessa o bicho. No video de ENTREGA vale a pena
        # (nao da para cortar o material do founder); aqui NAO: isto vira take
        # dentro do nosso video, o motor reescala para 1080x1920, e o bicho
        # esta no terco de cima. Jogar o rodape fora nao custa nada e nao deixa
        # vestigio nenhum -- nem de texto, nem de borrao.
        # A FAIXA QUE INTERESSA E A DE BAIXO.
        #
        # O detector devolve TODAS: o cabecalho do canal (y1) e a legenda
        # (y400+). Pegando a menor, o corte ia para o piso de 45% e levava
        # metade do bicho junto -- o defeito que o founder apontou. A legenda
        # de curto mora abaixo do meio; o cabecalho, acima.
        baixas = [b[0] for b in bandas if b[0] > h * 0.40]
        topo = min(baixas) if baixas else min(b[0] for b in bandas)
        # DOIS LIMITES, e os dois vieram da tela:
        #   piso  45% -- nunca cortar mais de 55%, senao vai o bicho junto
        #   teto  76% -- SEMPRE tirar o rodape, mesmo quando o detector so
        #                acusou uma faixa mais baixa. Num dos sete a legenda
        #                tinha duas linhas e so a de baixo foi detectada; a de
        #                cima ("NO ONE LOVES") sobreviveu ao corte.
        corte = max(int(topo) - 8, int(h * 0.45))
        corte = min(corte, int(h * 0.76))
        r = subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", bruto,
             "-vf", "crop=%d:%d:0:0,scale=%d:%d:flags=lanczos"
                    % (w, corte, w, h),
             "-c:v", "libx264", "-preset", "slow", "-crf", "18",
             "-pix_fmt", "yuv420p", saida], capture_output=True, text=True)
        os.remove(bruto)
        if r.returncode != 0 or not os.path.isfile(saida):
            return "corte falhou"
        return "cortado em y%d (faixa comecava em y%d)" % (corte, topo)
    except Exception as e:
        if os.path.isfile(bruto):
            os.replace(bruto, saida)
        return "limpeza falhou (%s)" % str(e)[:40]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--de", required=True, help="pasta com os videos modelados")
    ap.add_argument("--lista", action="store_true",
                    help="so mostra os trechos que achou, nao corta")
    ap.add_argument("--sem-limpeza", action="store_true")
    a = ap.parse_args()

    tmp = os.environ.get("TEMP", ".")
    os.makedirs(BANCO, exist_ok=True)
    vs = [os.path.join(a.de, f) for f in sorted(os.listdir(a.de))
          if f.lower().endswith((".mp4", ".mov", ".mkv"))]
    print("%d video(s) em %s\n" % (len(vs), a.de))

    achados, index = 0, []
    for v in vs:
        nome = os.path.splitext(os.path.basename(v))[0]
        alvo = os.path.join(BANCO, _slug(nome) + ".mp4")
        if os.path.isfile(alvo) and not a.lista:
            print("%-46s ja no banco" % nome[:46])
            achados += 1
            continue
        try:
            segs = transcreve(v, tmp)
        except Exception as e:
            print("%-46s transcricao falhou: %s" % (nome[:46], e))
            continue
        janela, motivo = acha_trecho(segs)
        if not janela:
            print("%-46s PULADO — %s" % (nome[:46], motivo))
            continue
        ini, fim = janela
        # ENTRA 2 s DEPOIS DA FRONTEIRA.
        #
        # Duas razoes para nao cortar na fronteira exata:
        #
        #   1. o botao LIKE/SUBSCRIBE do canal de origem nao some junto com a
        #      frase -- fica mais um ou dois segundos na tela, e e um CTA de
        #      YouTube dentro do nosso video de TikTok;
        #   2. o insert do ORIGINAL as vezes tem corte interno: em um dos sete
        #      ele mostra um gato branco por dois segundos e so depois o bicho
        #      da historia. Entrando aos 4 s, pega-se o plano que interessa.
        ini += 4.0
        # 8 s BASTA. No nosso video o bloco `dependente` ocupa quatro a seis
        # segundos; guardar quinze so encarece a limpeza (0,30 s por quadro) e
        # o que sobra nunca entra. Fica o comeco, que e onde a locucao original
        # apresenta o bicho e o plano e mais fechado.
        fim = min(fim, ini + 8.0)
        if a.lista:
            print("%-46s %5.1f → %5.1f  (%.1fs)" % (nome[:46], ini, fim, fim - ini))
            achados += 1
            continue
        est = extrai(v, ini, fim, alvo, not a.sem_limpeza)
        print("%-46s %5.1f → %5.1f  %s" % (nome[:46], ini, fim, est))
        index.append({"arquivo": os.path.basename(alvo), "origem": nome,
                      "inicio": round(ini, 2), "fim": round(fim, 2),
                      "estado": est})
        achados += 1

    if index:
        ix = os.path.join(BANCO, "index.json")
        antigo = []
        if os.path.isfile(ix):
            antigo = json.load(io.open(ix, encoding="utf-8")).get("inserts", [])
        nomes = {x["arquivo"] for x in index}
        todos = index + [x for x in antigo if x["arquivo"] not in nomes]
        io.open(ix, "w", encoding="utf-8").write(
            json.dumps({"inserts": todos}, ensure_ascii=False, indent=2))
    print("\n%d de %d" % (achados, len(vs)))
    print("banco: %s" % BANCO)
    return 0


if __name__ == "__main__":
    sys.exit(main())
