# -*- coding: utf-8 -*-
"""Ponte roteiro -> `apps/video-studio`: emite `timeline.json` e `fx-plan.json`.

O QUE ESTA PONTE RESOLVE
  O `ingest.ts` do studio monta timeline para o modelo do FARMING — vertical
  1080x1920, papeis de hook/skill/cta, insert de captura de tela ancorado na fala.
  O dark e outro modelo: HORIZONTAL, imagem parada, narracao como espinha, sem
  talking-head. Este emissor nao toca o ingest existente; escreve o mesmo formato.

A VANTAGEM QUE O DARK TEM E O FARMING NAO
  No farming a legenda vem de TRANSCREVER o audio depois. Aqui o SRT foi escrito
  ANTES — ele e a partitura que dirigiu a narracao. A legenda ja existe, e a
  sincronia e por construcao. Nao precisamos escolher modelo de transcricao.

O QUE SAI, em outputs/{cliente}/video-plans/{roteiro}/
  Materiais Brutos/  os arquivos COPIADOS — o studio serve tudo daqui, por
                     /api/media/{cliente}/{criativo}/{arquivo}, e o endpoint de
                     timeline devolve 404 se esta pasta nao existir
  studio-edit.json   O ARQUIVO AUTORITATIVO. Quando ele existe, o studio usa ele
                     e PULA a ingestao fresca — que e do modelo de farming e
                     destruiria esta montagem
  timeline.json      a mesma timeline, solta, para inspecao e diff
  fx-plan.json       marca, tema de legenda e as legendas em nivel de PALAVRA

Uso:
  python gera_timeline_dark.py A1-ordem [--voz clone|male02] [--identidade estoico-marmore-templo]
"""
import argparse, glob, io, json, os, re, shutil, subprocess, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
SQUAD = os.path.normpath(os.path.join(AQUI, "..", ".."))
REPO = os.path.normpath(os.path.join(SQUAD, "..", ".."))
ROTEIROS = os.path.join(SQUAD, "data", "roteiros", "estoico")
OVERLAYS = os.path.join(SQUAD, "assets", "overlays")
TRILHAS = os.path.join(SQUAD, "data", "trilhas-and-sfx")
COMFY_OUT = os.path.join(
    "C:" + os.sep, "Users", "Pichau", "Desktop", "ComfyUI_windows_portable",
    "ComfyUI", "output")

FPS = 30
W, H = 1920, 1080

# Tempo maximo de UMA imagem em tela antes de trocar.
# Medido na referencia: media de 18,9 s por take na v1 e 27,6 s na v2. Acima de
# ~22 s a imagem parada comeca a pesar mesmo com Ken Burns. Quando a janela do
# bloco e maior que isso, ela e dividida e o RODIZIO entra — que e exatamente o
# que a referencia faz: ela recicla a partir de 8:44.
MAX_EM_TELA_S = 22.0

# Movimento por PAPEL do bloco no roteiro, e nao por sorteio. O 4032x2304 do
# acabamento PRO existe exatamente para isto: numa linha de tempo 1080p da para
# empurrar quase 2x sem amolecer.
# Movimento e emenda por PAPEL do bloco. Vocabulario do catalogo do studio
# (`src/lib/fxCatalog.ts`), e nao mais um numero solto de "kenBurns":
#   camera  -> tipo + peso; o peso calibra amplitude sem tocar em numero magico
#   transicao -> id do catalogo; "corte" e o corte seco (era "none")
#
# A virada de bloco entra em CORTE de proposito: e o unico ponto da peca onde a
# quebra tem que ser sentida. Todo o resto dissolve, que e o que a extracao de
# takes mediu na referencia — ela nao corta em lugar nenhum, so dissolve.
MOVIMENTO = {
    "abertura":    {"camera": ("zoom-in", "medio"),   "transicao": "dissolve",   "peso": "calmo"},
    "sustentacao": {"camera": ("zoom-in", "calmo"),   "transicao": "dissolve",   "peso": "medio"},
    "virada":      {"camera": ("push-diagonal", "agressivo"), "transicao": "corte", "peso": "medio"},
    "fecho":       {"camera": ("zoom-out", "medio"),  "transicao": "fade-preto", "peso": "calmo"},
}

# Duracao da transicao a 30 fps, por peso. Espelha DURACAO_POR_PESO do catalogo.
FATOR_PESO = {"calmo": 1.6, "medio": 1.0, "agressivo": 0.55}
FRAMES_TRANSICAO = {"corte": 0, "dissolve": 12, "fade-preto": 20}


def hhmmss_para_ms(t):
    h, m, resto = t.split(":")
    s, ms = resto.split(",")
    return ((int(h) * 60 + int(m)) * 60 + int(s)) * 1000 + int(ms)


def le_srt(caminho):
    cues = []
    bloco = []
    for linha in io.open(caminho, encoding="utf-8").read().split("\n"):
        if linha.strip() == "":
            if len(bloco) >= 3:
                ini, fim = bloco[1].split(" --> ")
                cues.append({"ini": hhmmss_para_ms(ini.strip()),
                             "fim": hhmmss_para_ms(fim.strip()),
                             "texto": " ".join(bloco[2:]).strip()})
            bloco = []
        else:
            bloco.append(linha)
    if len(bloco) >= 3:
        ini, fim = bloco[1].split(" --> ")
        cues.append({"ini": hhmmss_para_ms(ini.strip()),
                     "fim": hhmmss_para_ms(fim.strip()),
                     "texto": " ".join(bloco[2:]).strip()})
    return cues


def marcadores_de_imagem(md):
    """Em que ponto do CORPO NARRADO cada [img NN] aparece.

    Devolve [(n, palavras_antes)] — a contagem de palavras e a chave para casar
    com os cues, porque foi ela que gerou os cues em `conta_roteiros.py`.
    """
    txt = io.open(md, encoding="utf-8").read()
    # Corta no primeiro `## `: frontmatter, titulo e a nota de cabecalho (que e
    # um blockquote, igual as citacoes narradas) ficam de fora. A contagem de
    # palavras daqui e a chave que casa `[img NN]` com o cue certo — contar a
    # nota deslocaria todas as imagens da peca.
    m_sec = re.search(r"^## ", txt, re.M)
    txt = txt[m_sec.start():] if m_sec else txt
    marcas, palavras = [], 0
    for linha in txt.split("\n"):
        s = linha.strip()
        if not s:
            continue
        m = re.match(r"\*\*\[img (\d+) — (.+?)\]\*\*", s)
        if m:
            marcas.append({"n": int(m.group(1)), "desc": m.group(2),
                           "palavras_antes": palavras})
            continue
        # `>` fora do filtro: a citacao em blockquote da estrutura B e narrada,
        # e esta contagem e a chave que casa `[img NN]` com o cue certo.
        if s.startswith(("#", "---")):
            continue
        s = re.sub(r"\*\(.*?\)\*", "", s)
        s = re.sub(r"\*\*(.*?)\*\*", r"\1", s)
        s = re.sub(r"\*(.*?)\*", r"\1", s)
        s = s.lstrip(">").strip()
        s = s.replace("‖", "").strip()
        if s:
            palavras += len(s.split())
    return marcas


def _transicao(mv):
    """Transicao no vocabulario do catalogo do studio, com a duracao pelo peso.

    Grava `durationInFrames` explicito de proposito: o studio respeita o valor
    quando ele existe, e assim a peca abre no editor exatamente como foi
    montada aqui — sem depender de os dois lados terem a mesma tabela.
    """
    tid = mv["transicao"]
    base = FRAMES_TRANSICAO.get(tid, 12)
    peso = mv.get("peso", "medio")
    return {"type": tid, "peso": peso,
            "durationInFrames": 0 if tid == "corte" else max(1, round(base * FATOR_PESO[peso]))}


def _captions_do_audio(roteiro, voz):
    """Caminho do `.captions.json` da narracao, se ele existir."""
    for nome in ("%s-%s.mp3" % (roteiro, voz), "%s-%s.wav" % (roteiro, voz),
                 "%s-%s_00001.flac" % (roteiro, voz)):
        cand = os.path.join(COMFY_OUT, "narracao", os.path.splitext(nome)[0] + ".captions.json")
        if os.path.isfile(cand):
            return cand
    return None


def _cues_das_legendas(caminho, n_alvo):
    """Agrupa as legendas por palavra em cues do mesmo tamanho medio do SRT.

    O que precisa ser preservado e a CONTAGEM DE PALAVRAS por cue, porque e ela
    que casa com `palavras_antes` dos marcadores de imagem. O tempo passa a ser
    o do audio; o numero de palavras continua o mesmo do roteiro.
    """
    caps = json.load(io.open(caminho, encoding="utf-8"))
    if not caps:
        return None
    por_cue = max(1, round(len(caps) / max(1, n_alvo)))
    out = []
    for i in range(0, len(caps), por_cue):
        bloco = caps[i:i + por_cue]
        out.append({"ini": bloco[0]["startMs"], "fim": bloco[-1]["endMs"],
                    "texto": " ".join(c["text"] for c in bloco)})
    return out


def repete_para_cobrir(base, arquivo, total_frames, prefixo):
    """Repete um clipe curto ate cobrir a janela inteira.

    POR QUE ISTO EXISTE
      As duas camadas — leito e atmosfera — eram declaradas como UM clipe com a
      duracao da peca. O nome do rotulo dizia "(loop)", mas nada fazia o loop:
      um clipe de 1193 s apontando para um arquivo de 10 s toca 10 s e some.
      Numa peca de 5 min isso ja estava errado; numa de 20 min a atmosfera
      desaparecia nos primeiros 0,8% do video.

      A composicao nao repete midia sozinha, e nem deveria — repetir e uma
      decisao de montagem. Entao a repeticao e explicita aqui, um clipe por
      volta, exatamente como o editor faz quando se insere um efeito.

    Os arquivos sao gerados em LOOP PERFEITO (movimento periodico, ultimo quadro
    encostando no primeiro), entao a emenda nao aparece.
    """
    dur = duracao_de(arquivo)
    if dur <= 0:
        return [dict(base, id="%s-1" % prefixo, startFrame=0,
                     durationInFrames=total_frames)]
    passo = max(1, round(dur * FPS))
    clipes, f, i = [], 0, 1
    while f < total_frames:
        clipes.append(dict(base, id="%s-%d" % (prefixo, i), startFrame=f,
                           durationInFrames=min(passo, total_frames - f)))
        f += passo
        i += 1
    return clipes


def papel_do_bloco(i, total):
    if i == 0:
        return "abertura"
    if i == total - 1:
        return "fecho"
    if i == total // 2:
        return "virada"
    return "sustentacao"


def duracao_de(caminho):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "csv=p=0", caminho],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def legendas_por_palavra(cues):
    """Distribui as palavras do cue no tempo dele, proporcional ao tamanho.

    E aproximacao, e assumida: o cue e authored e a sincronia dele com o audio e
    exata; dentro do cue, o reparto por comprimento de palavra e o melhor palpite
    sem alinhamento forcado. Para karaoke em narracao lenta, basta.
    """
    caps = []
    for c in cues:
        palavras = c["texto"].split()
        if not palavras:
            continue
        pesos = [len(p) + 1 for p in palavras]
        soma = sum(pesos)
        t = c["ini"]
        for p, w in zip(palavras, pesos):
            dur = (c["fim"] - c["ini"]) * w / soma
            caps.append({"text": p, "startMs": round(t),
                         "endMs": round(t + dur),
                         "timestampMs": round(t + dur / 2),
                         "confidence": 1})
            t += dur
    return caps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roteiro")
    ap.add_argument("--voz", default="male02")
    # O canal e o CLIENTE no studio: os clientes sao descobertos por diretorio em
    # outputs/<slug>/video-plans, e o nome de exibicao sai do slug em title-case.
    # Separar por canal mantem os episodios juntos e longe dos criativos da Oraclum.
    ap.add_argument("--cliente", default="canal-estoico")
    ap.add_argument("--destaque", default="#7B3FF2",
                    help="cor do destaque da legenda (violeta na v1, carmesim na v2)")
    a = ap.parse_args()

    md = os.path.join(ROTEIROS, a.roteiro + ".md")
    srt = os.path.join(ROTEIROS, a.roteiro + ".srt")
    for f in (md, srt):
        if not os.path.isfile(f):
            print("FALTANDO:", f)
            return 1

    # ── DE ONDE VEM O TEMPO ─────────────────────────────────────────────────
    # O SRT escrito e uma PREVISAO (palavras / wpm). O audio gerado e o fato, e
    # os dois divergem: o motor tem ritmo proprio e insere pausa nas emendas.
    #
    # As legendas ja foram corrigidas para vir do audio (`legendas_do_audio.py`);
    # a JANELA DAS IMAGENS continuava vindo do SRT, o que e a mesma dessincronia
    # com outro nome — e apareceu na hora em que o wpm de previsao foi corrigido:
    # o A1 acusou 76,5 s de descompasso entre visual e narracao.
    #
    # Quando existe `.captions.json`, os cues sao RECONSTRUIDOS a partir dele.
    # A contagem de palavras continua sendo a chave (e ela que casa com os
    # marcadores `[img NN]`), so que agora com o tempo real de cada palavra.
    cues = le_srt(srt)
    marcas = marcadores_de_imagem(md)
    caps_arq = _captions_do_audio(a.roteiro, a.voz)
    if caps_arq:
        reais = _cues_das_legendas(caps_arq, len(cues))
        if reais:
            print("  cues reconstruidos do AUDIO (%d -> %d, %.1f s -> %.1f s)"
                  % (len(cues), len(reais), cues[-1]["fim"] / 1000, reais[-1]["fim"] / 1000))
            cues = reais
    dur_ms = cues[-1]["fim"]
    print("roteiro %s — %d cues, %d imagens, %.1f s de narracao"
          % (a.roteiro, len(cues), len(marcas), dur_ms / 1000))

    # ── janela de cada imagem, em palavras -> em cues -> em frames ───────────
    acum, limites = 0, []
    for c in cues:
        acum += len(c["texto"].split())
        limites.append(acum)

    def cue_da_palavra(n):
        for i, lim in enumerate(limites):
            if n < lim:
                return i
        return len(cues) - 1

    # DUAS CONVENCOES DE PASTA, e as duas valem.
    #
    # As pecas curtas usam o PREFIXO do roteiro: `A1-ordem` -> pasta `A1`. As
    # longas usam o nome INTEIRO: `LA1-disciplina` -> pasta `LA1-disciplina`,
    # porque com tres lotes o prefixo sozinho deixou de identificar a peca.
    #
    # Procurar so pelo prefixo fazia as 11 imagens do lote A aparecerem como
    # FALTANDO com o pack inteiro no disco — e o unico sinal era a lista de
    # faltantes no fim da execucao, que e facil de ler como "ainda nao gerei".
    nome_completo = os.path.basename(a.roteiro)
    candidatas = [nome_completo, nome_completo.split("-")[0].upper()]
    dir_img = next(
        (d for d in (os.path.join(COMFY_OUT, "canal-estoico", c) for c in candidatas)
         if os.path.isdir(d)),
        os.path.join(COMFY_OUT, "canal-estoico", candidatas[0]),
    )
    peca = os.path.basename(dir_img)

    # acervo da peca: numero da imagem -> melhor arquivo disponivel
    acervo = {}
    for mk in marcas:
        for estagio in ("pro", "lite", "cru"):
            p = glob.glob(os.path.join(dir_img, estagio, "%02d-*" % mk["n"]))
            if p:
                # A MAIS RECENTE, nao a primeira em ordem alfabetica. O ComfyUI
                # nao sobrescreve (regeracao vira `_00002_`) e um marcador pode
                # trocar de slug — nos dois casos `sorted(...)[0]` devolve a
                # versao velha, que e justamente a que se acabou de corrigir.
                acervo[mk["n"]] = max(p, key=os.path.getmtime)
                break

    video, faltando, vistos_faltando = [], [], set()
    ultima = [None]          # numero da ultima imagem usada
    for i, mk in enumerate(marcas):
        ini_cue = cue_da_palavra(mk["palavras_antes"])
        fim_cue = (cue_da_palavra(marcas[i + 1]["palavras_antes"]) - 1
                   if i + 1 < len(marcas) else len(cues) - 1)
        fim_cue = max(fim_cue, ini_cue)
        ini_ms, fim_ms = cues[ini_cue]["ini"], cues[fim_cue]["fim"]

        papel = papel_do_bloco(i, len(marcas))
        mv = MOVIMENTO[papel]
        ini_f = round(ini_ms / 1000 * FPS)
        dur_f = max(FPS, round((fim_ms - ini_ms) / 1000 * FPS))

        # divide a janela quando ela passa do tempo maximo em tela
        max_f = round(MAX_EM_TELA_S * FPS)
        n_fatias = max(1, -(-dur_f // max_f))
        base_f = dur_f // n_fatias

        for k in range(n_fatias):
            # RODIZIO: a fatia extra pega a proxima imagem do acervo da peca, e
            # inverte o sentido do Ken Burns. Repetir a mesma imagem com o MESMO
            # movimento e o que denuncia a reciclagem; com o movimento invertido,
            # nao.
            idx = (i + k) % max(1, len(marcas))
            n_img = marcas[idx]["n"]
            # A MESMA imagem duas vezes seguidas, com dissolvencia entre elas, le
            # como falha de montagem — nao como reciclagem. Se a escolha repetir a
            # anterior, anda uma posicao.
            tentativas = 0
            while video and n_img == ultima[0] and tentativas < len(marcas):
                idx = (idx + 1) % len(marcas)
                n_img = marcas[idx]["n"]
                tentativas += 1
            ultima[0] = n_img
            achado = acervo.get(n_img)
            # SENTIDO ALTERNADO no rodizio. Repetir a mesma imagem com o MESMO
            # movimento e o que denuncia a reciclagem; com o sentido invertido,
            # nao. `zoom-in` vira `zoom-out` na fatia impar, e assim por diante.
            _tipo, _peso = mv["camera"]
            _oposto = {"zoom-in": "zoom-out", "zoom-out": "zoom-in",
                       "pan-esq": "pan-dir", "pan-dir": "pan-esq",
                       "tilt-cima": "tilt-baixo", "tilt-baixo": "tilt-cima"}
            cam = {"tipo": _tipo if k % 2 == 0 else _oposto.get(_tipo, _tipo),
                   "peso": _peso}
            # O inicio vem do FIM do clipe anterior, nao da conta do bloco.
            # Arredondar cada janela em separado deixava buracos de 1 frame nas
            # viradas de bloco — 33 ms de preto que o olho pega como piscada.
            f_ini = (video[-1]["startFrame"] + video[-1]["durationInFrames"]
                     if video else ini_f + k * base_f)
            f_fim = (ini_f + (k + 1) * base_f if k < n_fatias - 1 else ini_f + dur_f)
            f_dur = max(1, f_fim - f_ini)
            if achado is None and n_img not in vistos_faltando:
                vistos_faltando.add(n_img)
                faltando.append("%s img %02d" % (peca, n_img))
            video.append({
                "file": os.path.basename(achado) if achado else "FALTANDO-%02d.png" % n_img,
                "absPath": achado or "",
                "role": papel if k == 0 else "sustentacao",
                "durationSeconds": round(f_dur / FPS, 3),
                "durationInFrames": f_dur,
                "nativeDurationInFrames": f_dur,
                "playbackRate": 1,
                "width": W, "height": H,
                "startFrame": f_ini,
                "audioEnabled": False,
                "frameMode": "cover",
                "camera": cam,
                "gap": achado is None,
                # A transicao do bloco vale para a PRIMEIRA fatia; as fatias
                # internas do rodizio dissolvem sempre. Uma virada em corte seco
                # repetida a cada 22 s viraria tique, e nao acento.
                **({"transitionIn": _transicao(mv if k == 0 else MOVIMENTO["sustentacao"])}
                   if (i > 0 or k > 0) else {}),
            })

    total_f = round(dur_ms / 1000 * FPS)

    # ── narracao ────────────────────────────────────────────────────────────
    # A busca e por nome EXATO, em ordem de preferencia. O glob solto pegava o
    # trecho de abertura de 62 s em vez da narracao inteira — e so o
    # `rhythmGapSeconds` denunciou (-225 s). Preferencia: wav normalizado, depois
    # mp3, e so entao o flac cru que sai do ComfyUI.
    nar = None
    # MP3 PRIMEIRO, de proposito. O WAV de 290 s tem ~51 MB e o Player engasga ao
    # buscar dentro dele; o export re-codifica de qualquer forma, entao a perda do
    # 192k nao chega ao master. Se o WAV for mesmo necessario, e so apaga o mp3.
    for nome in ("%s-%s.mp3" % (a.roteiro, a.voz),
                 "%s-%s.wav" % (a.roteiro, a.voz),
                 "%s-%s_00001.flac" % (a.roteiro, a.voz)):
        cand = os.path.join(COMFY_OUT, "narracao", nome)
        if os.path.isfile(cand):
            nar = cand
            break
    audio_track = None
    if nar:
        d = duracao_de(nar)
        audio_track = {
            "file": os.path.basename(nar), "absPath": nar,
            "durationSeconds": round(d, 3),
            "durationInFrames": round(d * FPS),
            "startFrame": 0, "windowFrames": round(d * FPS),
        }
    else:
        faltando.append("narracao %s/%s" % (a.roteiro, a.voz))

    # legenda alinhada ao audio, quando existir
    caps_do_audio = None
    if nar:
        cand = os.path.splitext(nar)[0] + ".captions.json"
        if os.path.isfile(cand):
            caps_do_audio = cand

    # ── camadas extras: leito continuo + overlay de atmosfera ───────────────
    extras = []
    leito = os.path.join(TRILHAS, "02-leitos", "contemplativo",
                         "le-contemplativo-mistico.mp3")
    if not os.path.isfile(leito):
        leito = os.path.join(TRILHAS, "02-leitos", "contemplativo",
                             "le-contemplativo-mistico-LOOP.wav")
    if os.path.isfile(leito):
        base_leito = {
            "type": "media-audio",
            "src": leito.replace("\\", "/"),
            "label": "le-contemplativo-mistico (loop)",
            # 12 a 15 dB abaixo da narracao e a regra do pack de audio
            "volume": 0.22, "ducking": True,
        }
        clipes_leito = repete_para_cobrir(base_leito, leito, total_f, "leito")
        # Fade so nas PONTAS da camada, nunca em cada volta do loop: uma rampa
        # por volta produziria um pulso audivel a cada 45 s.
        clipes_leito[0]["fadeIn"] = FPS * 2
        clipes_leito[-1]["fadeOut"] = FPS * 3
        extras.append({
            "id": "leito", "kind": "audio", "name": "Leito contínuo",
            "clips": clipes_leito,
        })
    ov = os.path.join(OVERLAYS, "particulas-lentas.mp4")
    if os.path.isfile(ov):
        base_atm = {
            "type": "media-video",
            "src": ov.replace("\\", "/"),
            "label": "particulas-lentas (loop, screen)",
            # SEM `blend`, o overlay nao aparece: composto normalmente, o preto
            # do fundo dele so escurece a imagem em vez de sumir. `screen` e o
            # que faz a particula existir e o preto desaparecer.
            "blend": "screen",
            "fit": "cover",
            # acima de 0.5 o overlay deixa de ser atmosfera e vira assunto
            "opacity": 0.45,
            # o overlay nao traz audio para a mixagem
            "volume": 0,
        }
        extras.append({
            "id": "atmosfera", "kind": "video", "name": "Atmosfera (partículas)",
            "clips": repete_para_cobrir(base_atm, ov, total_f, "atm"),
        })

    timeline = {
        "fps": FPS, "width": W, "height": H,
        "durationInFrames": total_f,
        "videoTrack": video,
        "audioTrack": audio_track,
        "captionTrack": [],
        "extraLayers": extras,
        "markers": [{"frame": c["startFrame"], "label": c["role"]}
                    for c in video if c["role"] in ("virada", "fecho")],
        "meta": {
            "client": a.cliente, "creative": a.roteiro,
            "videoSeconds": round(total_f / FPS, 2),
            "audioSeconds": audio_track["durationSeconds"] if audio_track else 0,
            "rhythmGapSeconds": (round(audio_track["durationSeconds"] - total_f / FPS, 2)
                                 if audio_track else None),
            "gaps": faltando,
        },
    }

    # O FxPlan tem campos OBRIGATORIOS que a composicao acessa sem checar:
    # `fxPlan.motionRenderers.includes(...)` estoura se o campo faltar, e o Player
    # cai no errorFallback ("Midia incompativel neste clipe") ANTES de montar
    # qualquer midia — foi por isso que nenhum PNG chegou a ser requisitado.
    # Escrever um fx-plan parcial nao e opcional: e quebrar a composicao.
    #
    # Escolhas para o dark:
    #   hard-cut    nao ha hook de talking-head; o corte seco e o neutro
    #   clean       legenda de uma linha, sem pop — a referencia nao usa karaoke
    #               agressivo, usa destaque de cor sobre uma palavra
    #   []          sem lower-third nem barra de progresso: o genero nao usa
    fx = {
        "hookRenderer": "hard-cut",
        "captionRenderer": "clean",
        "motionRenderers": [],
        "brand": {
            "accent": a.destaque, "primary": "#FFFFFF",
            "displayName": "Dark · Estoicismo",
            "fontFamily": "Montserrat",
        },
        # PREFERE a legenda alinhada ao AUDIO. A derivada do SRT so entra quando a
        # transcricao ainda nao foi feita — e ela ACUMULA desvio: medido +0,01 s no
        # primeiro cue e +14,20 s no ultimo. Ver `legendas_do_audio.py`.
        "captions": (json.load(io.open(caps_do_audio, encoding="utf-8"))
                     if caps_do_audio else legendas_por_palavra(cues)),
        # Agrupamento de cue para 16:9. O padrao do studio e 18 caracteres por
        # linha, que e o que cabe em caixa-alta grande num quadro de 1080 de
        # LARGURA (9:16). Aqui a largura e 1920, e a referencia usa ~38.
        "captionStyle": {"maxWords": 10, "maxLines": 2,
                         "maxCharsPerLine": 38, "maxCueMs": 5000},
        "captionTheme": {
            # observado na referencia: caixa alta, uma linha, destaque colorido
            # sobre UMA palavra por cue
            "uppercase": True, "boxed": True, "highlight": True,
            "activeColor": a.destaque, "baseColor": "#FFFFFF",
            "fontSize": 48,
            # Medido nos frames da referencia: a legenda fica perto do MEIO do
            # quadro, nao no terco inferior. O default do studio (0,224) e a zona
            # segura do social VERTICAL e nao vale numa peca 16:9.
            "bottomPct": 0.42,
        },
    }

    dest = os.path.join(REPO, "outputs", a.cliente, "video-plans", a.roteiro)
    brutos = os.path.join(dest, "Materiais Brutos")
    os.makedirs(brutos, exist_ok=True)

    # O player roda no navegador e nao le o disco: TODO arquivo referenciado tem
    # que estar em "Materiais Brutos" e ser citado pelo nome puro.
    def publica(caminho):
        if not caminho or not os.path.isfile(caminho):
            return None
        nome = os.path.basename(caminho)
        alvo = os.path.join(brutos, nome)
        if not os.path.isfile(alvo) or os.path.getmtime(caminho) > os.path.getmtime(alvo):
            shutil.copy2(caminho, alvo)
        return nome

    for c in timeline["videoTrack"]:
        nome = publica(c["absPath"])
        if nome:
            c["file"] = nome
    if timeline["audioTrack"]:
        nome = publica(timeline["audioTrack"]["absPath"])
        if nome:
            timeline["audioTrack"]["file"] = nome
    for camada in timeline["extraLayers"]:
        for cl in camada["clips"]:
            nome = publica(cl.pop("src", None))
            if nome:
                cl["file"] = nome

    json.dump(timeline, io.open(os.path.join(dest, "timeline.json"), "w",
                                encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump(fx, io.open(os.path.join(dest, "fx-plan.json"), "w",
                          encoding="utf-8"), ensure_ascii=False, indent=2)
    # o autoritativo — sem ele o studio reingere pelo modelo de farming
    json.dump({"timeline": timeline, "fxPlan": fx, "captionSource": "script",
               "savedAt": ""},
              io.open(os.path.join(dest, "studio-edit.json"), "w",
                      encoding="utf-8"), ensure_ascii=False)

    print("  %d clipes de imagem · %d frames (%.1f s) · %d legendas (%s)"
          % (len(video), total_f, total_f / FPS, len(fx["captions"]),
             "alinhadas ao AUDIO" if caps_do_audio else "derivadas do SRT — vao desalinhar"))
    print("  escrito em %s" % dest)
    print("  abra: http://localhost:3000/studio?client=%s&creative=%s"
          % (a.cliente, a.roteiro))
    if faltando:
        print("  FALTANDO: %s" % ", ".join(faltando))
    desc = timeline["meta"]["rhythmGapSeconds"]
    if desc is not None and abs(desc) > 3:
        print("  ATENCAO: narracao e visual estao %+.1f s fora de sincronia. "
              "Acima de 3 s isso nao e deriva de TTS — e arquivo errado ou "
              "roteiro desatualizado." % desc)
    return 0


if __name__ == "__main__":
    sys.exit(main())
