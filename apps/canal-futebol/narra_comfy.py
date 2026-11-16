# -*- coding: utf-8 -*-
"""Narracao do video longo pelo ComfyUI — a rota que o canal estoico validou.

POR QUE TROCAR O MOTOR
  A primeira tentativa usou Piper com `length_scale 1.35` para descer de 166 para
  135 palavras por minuto. O numero bateu e o audio ficou ruim, e a razao e
  estrutural: `length_scale` nao deixa a fala mais CALMA, deixa mais ARRASTADA.
  Ele estica cada fonema pelo mesmo fator — inclusive as vogais que deveriam
  passar rapido — em vez de abrir pausa entre as frases, que e o que um locutor
  faz quando desacelera.

  Ritmo lento de verdade nao se obtem esticando: obtem-se com um modelo que ja
  fala assim. O ChatterBox faz isso, e foi o que o canal estoico validou.

A DIVISAO QUE FICA
  live  Piper, em memoria, 0,2 s por frase. Latencia e o requisito, e o
        ChatterBox leva ~10 s para 4 s de fala — inviavel ao vivo.
  vod   ChatterBox PT-BR. Geracao offline, entao lento nao e problema, e a
        qualidade e o requisito.

  Mesma decisao que ja tinha sido tomada no pack de voz da live, so que ao
  contrario: la o rapido ganhou porque o custo era latencia; aqui o lento ganha
  porque o custo e so tempo de maquina.

A VOZ
  `01-voz-casa-ptbr` do banco do squad: ChatterBox PT-BR da ResembleAI, WER de
  4,4%, `pode_publicar: sim`. E EMBUTIDA — nao depende de audio de referencia,
  entao nao ha questao de direito de voz. O indice do banco a marca como
  "CANDIDATA PRINCIPAL para canal PT-BR".

POR PARAGRAFO, NAO POR FRASE
  Mesma licao de `narracao_pro.py`: o `UnifiedTTSSRTNode` em `concatenate`
  ignora o timing de entrada, gera cada cue inteiro e devolve o SRT com os
  tempos reais. Alimentado com um SRT de PARAGRAFOS, a prosodia atravessa o
  paragrafo — e prosodia continua nao se reconstroi depois de cortada.

Uso:
    python narra_comfy.py 2026-09-04-abel-stjd --srt      # so prepara o SRT
    python narra_comfy.py 2026-09-04-abel-stjd            # prepara e enfileira
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
SQUAD = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio")
COMFY_DIR = os.path.join(SQUAD, "assets", "comfyui")
sys.path.insert(0, COMFY_DIR)
CANAL = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                     "creative-studio", "canais", "bora-de-bola")
API = "http://127.0.0.1:8188"
SAIDA_COMFY = os.path.join(r"C:" + os.sep, "Users", "Pichau", "Desktop",
                           "ComfyUI_windows_portable", "ComfyUI", "output")

# Acima disto, uma geracao degrada ou trunca no fim. O corte e sempre em
# FRONTEIRA DE FRASE — cortar no meio produz entoacao de ponto final onde nao
# havia ponto, que e justamente o defeito que a rota por paragrafo evita.
LIMITE_PALAVRAS = 55
MODELO = "v3"        # troque para 'Brazilian Portuguese (ResembleAI)' se preferir o timbre


# ═══════════════════════════════════════════════════════════════════════════
# PRONUNCIA — o texto que vai para o TTS nao e o texto que o humano le
#
# POR QUE ISTO EXISTE
#   O founder ouviu o episodio de 06/09 e apontou nome falado errado. A
#   auditoria de WER NAO pega isso: o Whisper NORMALIZA a saida -- ele transcreve
#   "Hulk" tanto para a grafia certa quanto para a errada, e o WER fica em zero
#   com o audio errado. Pronuncia so se mede com ouvido humano; o que da para
#   automatizar e a SUBSTITUICAO, uma vez que a grafia certa for conhecida.
#
# A REGRA
#   Chave = o que se escreve no roteiro (legivel para quem revisa).
#   Valor = o que se manda ao motor (fonetico, as vezes feio).
#   A troca acontece SO no caminho do TTS. O roteiro em disco continua legivel,
#   e o `claim-ledger` continua conferivel contra ele.
# ═══════════════════════════════════════════════════════════════════════════
PRONUNCIA = {
    # ORDINAIS. "26ª" saia como "vinte e seis A" -- o motor le o "ª" como
    # sufixo solto em vez de ordinal. Escrever por extenso remove a ambiguidade.
    "1ª": "primeira", "2ª": "segunda", "3ª": "terceira", "4ª": "quarta",
    "5ª": "quinta", "6ª": "sexta", "7ª": "sétima", "8ª": "oitava",
    "9ª": "nona", "10ª": "décima",
    "11ª": "décima primeira", "12ª": "décima segunda", "13ª": "décima terceira",
    "14ª": "décima quarta", "15ª": "décima quinta", "16ª": "décima sexta",
    "17ª": "décima sétima", "18ª": "décima oitava", "19ª": "décima nona",
    "20ª": "vigésima", "21ª": "vigésima primeira", "22ª": "vigésima segunda",
    "23ª": "vigésima terceira", "24ª": "vigésima quarta", "25ª": "vigésima quinta",
    "26ª": "vigésima sexta", "27ª": "vigésima sétima", "28ª": "vigésima oitava",
    "29ª": "vigésima nona", "30ª": "trigésima",
    "1º": "primeiro", "2º": "segundo", "3º": "terceiro", "4º": "quarto",
    "5º": "quinto", "6º": "sexto", "7º": "sétimo", "8º": "oitavo",
    "9º": "nono", "10º": "décimo",

    # NOMES com grafia estrangeira. O "bb" italiano faz o motor duplicar a
    # consoante; a grafia em portugues devolve a pronuncia que o locutor usaria.
    "Canobbio": "Canóbio",
    "Soteldo": "Sotéldo",
    "Lucho Acosta": "Lucho Acósta",
    # ── acrescentado 2026-09-07, episodio do penalti do Cruzeiro ──
    # A regra que se repete: o motor le a grafia, nao o nome. Toda vez que a
    # grafia nao e a portuguesa, ele erra -- e o WER NAO pega, porque o Whisper
    # normaliza a saida. Quem pega e o ouvido do founder, depois de publicado.
    # Entao o dicionario cresce por episodio, com os nomes daquele episodio.
    "Mycael": "Maicael",
    "Ziyech": "Ziech",
    "Hakim": "Ráquim",
    "Memphis": "Mêmfis",
    "Athletico": "Atlético",
    "Athletico-PR": "Atlético Paranaense",
    "Tigres": "Tígres",

    # SIGLAS que o motor tentaria ler como palavra.
    "STJD": "S T J D",
    "VAR": "V A R",
    "CBF": "C B F",
}


def aplica_pronuncia(texto):
    """Troca a grafia legivel pela grafia falavel, so no caminho do TTS."""
    for de, para in sorted(PRONUNCIA.items(), key=lambda kv: -len(kv[0])):
        texto = texto.replace(de, para)
    return texto


def blocos_do_roteiro(caminho, so_secao=None):
    """[(nome, texto)] — a locucao limpa, sem markdown e sem ancora.

    `so_secao` restringe a leitura a UMA secao do arquivo. O roteiro do EPISODIO
    e todo fala; o roteiro do CURTO tem notas de metodo antes ("o que muda em
    relacao ao longo", "contagem") e a fala vive sob `## ROTEIRO`.

    Sem isso o motor narra as notas. Medido em 07/09: o primeiro curto saiu com
    297 palavras e 1 min 32 s no lugar de 213 e ~65 s -- um terco do audio era a
    justificativa editorial do proprio roteiro, lida em voz alta.
    """
    txt = open(caminho, encoding="utf-8").read()
    if so_secao:
        m = re.search(r"^## +%s *$" % re.escape(so_secao), txt, flags=re.M)
        if not m:
            raise SystemExit("nao achei a secao '## %s' em %s"
                             % (so_secao, os.path.basename(caminho)))
        resto = txt[m.end():]
        prox = re.search(r"^## ", resto, flags=re.M)
        txt = "## %s\n%s" % (so_secao, resto[:prox.start()] if prox else resto)
    saida = []
    for p in re.split(r"^## ", txt, flags=re.M)[1:]:
        cab, _, corpo = p.partition("\n")
        if cab.startswith("Marcação"):
            break
        m = re.match(r"([\d:]+)\s*—\s*(.+)", cab)
        nome = (m.group(2) if m else cab).split("·")[0].strip()
        # O NOME DO BLOCO E O IDENTIFICADOR, e ele nao pode carregar subtitulo.
        #
        # `## BLOCO 1 — O primeiro penalti` e melhor de LER que `## BLOCO 1`, e
        # foi assim que escrevi o roteiro de 07/09. So que este nome e a CHAVE
        # que o `monta.FOTOS_POR_EPISODIO` e o `cartelas.py` usam: com o
        # subtitulo junto, 8 dos 13 blocos casaram com nada e teriam ido ao ar
        # sem uma foto e sem uma cartela.
        #
        # Cortar aqui, e nao em cada consumidor, e o que mantem os tres lados
        # falando do mesmo bloco -- e deixa o roteiro livre para ter subtitulo.
        nome = re.split(r"\s+[—–-]\s+", nome)[0].strip()
        # PARAGRAFO TERMINA EM LINHA EM BRANCO, nao em quebra de linha. O
        # markdown quebra por volta de 80 colunas, no meio da frase — tratar
        # linha como paragrafo produzia geracoes de meia frase, com entoacao de
        # ponto final onde nao havia ponto.
        atual = []
        for l in corpo.split("\n"):
            crua = l.rstrip()
            l = crua.strip()
            if l.startswith((">", "|", "#", "---")):
                continue
            if not l:                       # fim de paragrafo
                if atual:
                    saida.append((nome, " ".join(atual)))
                    atual = []
                continue
            l = re.sub(r"`\[F\d+\]`", "", l)
            l = re.sub(r"\*\*|\*|`", "", l)
            l = l.strip()
            # MARCADOR NAO E FALA. Linha que e so um bloco entre colchetes --
            # [img 03 - cartela], [vinheta do canal] -- e direcao de imagem, nao
            # texto narrado. Sem este filtro ela vira uma cue, o no de TTS recebe
            # algo sem fala e sintetiza o PLACEHOLDER DELE em ingles ("you need to
            # add some text for me to talk"), que entra no mp3 final.
            # Aconteceu em 06/09: 11 cues de lixo no episodio de futebol, achadas
            # so pela auditoria de WER. O canal de futebol nao usa marcador no
            # roteiro (a marcacao de b-roll vive em monta.py e cartelas.py), mas o
            # canal estoico usa -- e roteiro escrito no formato do outro canal e
            # exatamente o erro que este filtro cobre.
            if re.fullmatch(r"\[.*\]", l):
                continue
            if l:
                atual.append(l)
        if atual:
            saida.append((nome, " ".join(atual)))
    return saida


def corta(texto, limite=LIMITE_PALAVRAS):
    frases = [f for f in re.split(r"(?<=[.!?])\s+", texto.strip()) if f]
    pedacos, atual, n = [], [], 0
    for f in frases:
        p = len(f.split())
        if atual and n + p > limite:
            pedacos.append(" ".join(atual))
            atual, n = [f], p
        else:
            atual.append(f)
            n += p
    if atual:
        pedacos.append(" ".join(atual))
    return pedacos


def _hhmmss(ms):
    h, ms = divmod(int(ms), 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return "%02d:%02d:%02d,%03d" % (h, m, s, ms)


def monta_srt(pares, wpm=135.0):
    """SRT de paragrafos. O timing e so ORDEM — o `concatenate` o ignora e
    devolve os tempos reais depois de gerar."""
    linhas, t = [], 0
    n = 0
    for _, texto in pares:
        for pedaco in corta(texto):
            n += 1
            # A troca acontece AQUI, no ultimo ponto antes do motor. O roteiro
            # em disco fica legivel; o SRT que vai ao TTS leva a grafia falavel.
            pedaco = aplica_pronuncia(pedaco)
            dur = max(1200, int(len(pedaco.split()) / wpm * 60000))
            linhas.append("%d\n%s --> %s\n%s\n"
                          % (n, _hhmmss(t), _hhmmss(t + dur), pedaco))
            t += dur + 200
    return "\n".join(linhas), n


# ─────────────────────────────────────────────────────────────────────────────
def enfileira(srt_txt, prefixo, voz_ref=None):
    """Submete ao ComfyUI reusando a conversao UI->API do run_batch.

    `voz_ref` e o NOME DO ARQUIVO dentro de `ComfyUI/input/`. Quando vem, o ramo
    de clonagem do workflow e mantido e apontado para ele; quando nao vem, o
    ramo e removido e a voz embutida do modelo e usada.
    """
    import run_batch as rb

    wf = json.load(open(os.path.join(COMFY_DIR, "workflows",
                                     "tts-narracao-srt.json"), encoding="utf-8"))
    objinfo = rb.get("/object_info")
    prompt = rb.para_api(wf, objinfo)

    # RAMO DE VOZ CLONADA — mantido so quando ha referencia de verdade.
    #
    # O workflow salvo tem `LoadAudio` com o marcador `{{VOZ_REFERENCIA}}`
    # alimentando `CharacterVoicesNode`. Com o marcador no lugar de um arquivo,
    # o ComfyUI reprova o prompt INTEIRO (400) -- por isso, sem `voz_ref`, o
    # ramo sai fora e a voz embutida do modelo assume.
    #
    # Apontar o `LoadAudio` para um wav qualquer passaria na validacao e
    # trocaria a voz sem ninguem perceber. Por isso o arquivo e conferido antes:
    # se o nome nao existir em `ComfyUI/input/`, falha aqui e nao no timbre.
    clonagem = [k for k, v in prompt.items()
                if v.get("class_type") in ("LoadAudio", "CharacterVoicesNode")]
    if voz_ref:
        caminho = os.path.join(os.path.dirname(SAIDA_COMFY), "input", voz_ref)
        if not os.path.isfile(caminho):
            raise SystemExit(
                "voz de referencia nao esta em ComfyUI/input: %s\n"
                "copie o wav para la antes de narrar com --voz-ref" % voz_ref)
        for k in clonagem:
            i = prompt[k].get("inputs", {})
            if prompt[k]["class_type"] == "LoadAudio":
                i["audio"] = voz_ref
            else:
                # o no de voz precisa de `none` para OBEDECER a referencia; com
                # um nome de voz de banco ali, ele ignora o audio em silencio
                if "voice_name" in i:
                    i["voice_name"] = "none"
                if "reference_text" in i:
                    i["reference_text"] = ""
    else:
        for v in prompt.values():
            for ent, val in list(v.get("inputs", {}).items()):
                if isinstance(val, list) and val and str(val[0]) in clonagem:
                    del v["inputs"][ent]
        for k in clonagem:
            prompt.pop(k, None)

    # A conversao devolve o prompt por id de no; achar os nos por CLASSE, e nao
    # por id, porque id muda se o workflow for reeditado na interface.
    def por_classe(alvo):
        return [k for k, v in prompt.items() if v.get("class_type") == alvo]

    for k in por_classe("PrimitiveStringMultiline"):
        prompt[k]["inputs"]["value"] = srt_txt
    for k in por_classe("ChatterBoxOfficial23LangEngineNode"):
        i = prompt[k]["inputs"]
        #  e nao o dedicado: no banco de provas o v3 mediu 21,4% de WER
        # contra 41,1% do 'Brazilian Portuguese (ResembleAI)'. O timbre dos dois
        # foi aprovado de ouvido; a fidelidade e que desempata.
        i["model_version"] = MODELO
        i["language"] = "Portuguese"
        # exaggeration baixo: plantao de futebol nao e drama. O default 0.5 ja
        # e comedido; 0.4 tira o resto do teatro sem virar leitura de bula.
        i["exaggeration"] = 0.4
        i["temperature"] = 0.75      # menos variacao = leitura mais firme
    for k in por_classe("UnifiedTTSSRTNode"):
        # `concatenate` é o modo que ignora o timing de entrada e emenda a fala
        # natural. Sem ele, o motor ESTICA ou CORTA para caber no tempo do cue —
        # que é exatamente o defeito do Piper acelerado, só que pior.
        prompt[k]["inputs"]["timing_mode"] = "concatenate"
        prompt[k]["inputs"]["narrator_voice"] = "none"
    for k in por_classe("SaveAudio"):
        prompt[k]["inputs"]["filename_prefix"] = prefixo
    for k in por_classe("SaveText"):
        prompt[k]["inputs"]["filename_prefix"] = prefixo + "-srt"

    r = rb.post("/prompt", {"prompt": prompt})
    return r.get("prompt_id"), prompt


def acompanha(pid, limite_s=3600):
    t0 = time.time()
    ultimo = -1
    while time.time() - t0 < limite_s:
        try:
            h = json.load(urllib.request.urlopen("%s/history/%s" % (API, pid), timeout=20))
        except Exception:
            time.sleep(5)
            continue
        if h.get(pid):
            st = h[pid].get("status", {})
            if st.get("completed"):
                return h[pid]
            if st.get("status_str") == "error":
                return h[pid]
        try:
            q = json.load(urllib.request.urlopen(API + "/queue", timeout=15))
            n = len(q.get("queue_running", [])) + len(q.get("queue_pending", []))
        except Exception:
            n = -1
        if n != ultimo:
            print("  fila: %d · %.0fs" % (n, time.time() - t0), flush=True)
            ultimo = n
        time.sleep(10)
    return None


def _hash(txt, voz_ref=None):
    """Chave do cache: o TEXTO E A VOZ.

    Chaveando so pelo texto, trocar a referencia de clonagem devolvia o audio
    antigo com a etiqueta "(mantido)" -- sem erro, sem aviso, e sem a voz nova.
    Foi assim que a primeira tentativa de trocar a voz do canal de curiosidades
    nao trocou nada. A voz e entrada da geracao; tem de estar na chave.
    """
    import hashlib
    semente = " ".join(txt.split()) + "|" + (voz_ref or "voz-embutida")
    return hashlib.sha1(semente.encode("utf-8")).hexdigest()[:16]


def _hash_arq(p):
    import hashlib
    h = hashlib.sha1()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(65536), b""):
            h.update(b)
    return h.hexdigest()


def _dur(p):
    import subprocess
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "csv=p=0", p],
                       capture_output=True, text=True)
    try:
        return float((r.stdout or "0").strip())
    except ValueError:
        return 0.0


def main():
    import shutil
    import subprocess
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--srt", action="store_true", help="só prepara, não enfileira")
    ap.add_argument("--tudo", action="store_true",
                    help="ignora o cache e regera todos os blocos")
    # O MESMO MOTOR NARRA O LONGO E O CURTO.
    #
    # O curto do canal tem de sair na MESMA VOZ do episodio -- e o que faz o
    # espectador reconhecer o canal quando o corte aparece no feed sem ele
    # procurar. Duplicar o narrador para a pasta de curtos seria a forma mais
    # rapida de a voz divergir na primeira troca de preset.
    #
    # A unica diferenca e a arvore: o episodio mora em `episodios/{slug}` com
    # o roteiro em `02-roteiro` e o audio em `03-narracao`; o curto mora em
    # `curtos/{slug}` com `01-roteiro` e `02-narracao`.
    ap.add_argument("--curto", action="store_true",
                    help="o pack esta em curtos/, com 01-roteiro e 02-narracao")
    # O narrador atende QUALQUER canal do estudio, nao so o Bora de Bola: e a
    # mesma voz da casa e o mesmo motor. Passar o diretorio do canal evita
    # copiar este arquivo para cada canal novo -- que e como a voz diverge.
    ap.add_argument("--canal-dir",
                    help="pasta do canal (default: bora-de-bola)")
    ap.add_argument("--voz-ref",
                    help="nome do wav em ComfyUI/input/ para clonar o timbre")
    a = ap.parse_args()

    raiz_canal = (os.path.join(os.path.dirname(CANAL), a.canal_dir)
                  if a.canal_dir else CANAL)
    if a.curto:
        pack = os.path.join(raiz_canal, "curtos", a.slug)
        roteiro = os.path.join(pack, "01-roteiro", "roteiro.md")
        saida = os.path.join(pack, "02-narracao")
    else:
        pack = os.path.join(raiz_canal, "episodios", a.slug)
        roteiro = os.path.join(pack, "02-roteiro", "roteiro.md")
        saida = os.path.join(pack, "03-narracao")
    brutos = os.path.join(saida, "_blocos")
    cache = os.path.join(brutos, "cache")
    os.makedirs(cache, exist_ok=True)
    if not os.path.isfile(roteiro):
        print("não achei o roteiro: %s" % roteiro)
        return 1

    # No curto, so a secao `## ROTEIRO` e fala.
    pares = blocos_do_roteiro(roteiro, "ROTEIRO" if a.curto else None)
    # Agrupa os paragrafos pelo BLOCO do roteiro (gancho, CTA, bloco 1...), que
    # e a unidade que o b-roll usa.
    grupos, ordem = {}, []
    for nome, texto in pares:
        if nome not in grupos:
            grupos[nome] = []
            ordem.append(nome)
        grupos[nome].append(texto)

    srt_txt, n = monta_srt(pares)
    open(os.path.join(saida, "roteiro.blocos.srt"), "w", encoding="utf-8").write(srt_txt)
    palavras = sum(len(t.split()) for _, t in pares)
    print("%d blocos · %d parágrafos · %d gerações · %d palavras\n"
          % (len(ordem), len(pares), n, palavras))
    if a.srt:
        return 0

    print("%-3s %-30s %8s %8s %8s" % ("#", "BLOCO", "PALAVRAS", "ÁUDIO", "P/MIN"))
    print("─" * 66)
    partes, total = [], 0.0
    for i, nome in enumerate(ordem, 1):
        mp3 = os.path.join(brutos, "%02d.mp3" % i)
        texto = " ".join(grupos[nome])
        pal = len(texto.split())
        guardado = os.path.join(cache, "%s.mp3" % _hash(texto, a.voz_ref))
        if not a.tudo and os.path.isfile(guardado):
            if not os.path.isfile(mp3) or _hash_arq(mp3) != _hash_arq(guardado):
                shutil.copyfile(guardado, mp3)
            d = _dur(mp3)
            partes.append(mp3)
            total += d
            print("%-3d %-30s %8d %7.1fs %8.1f  (mantido)"
                  % (i, nome[:30], pal, d, pal / (d / 60) if d else 0))
            continue

        srt_bloco, _ = monta_srt([(nome, t) for t in grupos[nome]])
        pid, _ = enfileira(srt_bloco, "boradebola/%s/b%02d" % (a.slug, i),
                           a.voz_ref)
        if not pid:
            print("%-3d %-30s  o ComfyUI não aceitou" % (i, nome[:30]))
            continue
        h = acompanha(pid, limite_s=1800)
        p = None
        for _, sa in ((h or {}).get("outputs") or {}).items():
            for _, itens in sa.items():
                for it in (itens if isinstance(itens, list) else []):
                    if isinstance(it, dict) and it.get("filename", "").endswith((".flac", ".wav")):
                        cam = os.path.join(SAIDA_COMFY,
                                           (it.get("subfolder") or "").replace("\\", os.sep),
                                           it["filename"])
                        if os.path.isfile(cam):
                            p = cam
        if not p:
            print("%-3d %-30s  não devolveu áudio" % (i, nome[:30]))
            continue
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p, "-c:a",
                        "libmp3lame", "-b:a", "192k", mp3], timeout=300)
        d = _dur(mp3)
        # So entra no cache o que passou pela regra de suspeita abaixo; audio
        # truncado no cache seria um defeito que se reaproveita sozinho.
        ppm = pal / (d / 60) if d else 0
        # Menos de 2 s, ou acima de 260 p/min, e truncamento — nao leitura rapida.
        marca = "  ← SUSPEITO" if (d < 2 or ppm > 260) else ""
        if not marca:
            shutil.copyfile(mp3, guardado)
        partes.append(mp3)
        total += d
        print("%-3d %-30s %8d %7.1fs %8.1f%s" % (i, nome[:30], pal, d, ppm, marca))

    if not partes:
        print("\nnenhum bloco gerado")
        return 1

    # 0,6 s entre blocos: a pausa que um locutor faz ao mudar de assunto.
    # A taxa do silêncio é LIDA do primeiro bloco, não escrita à mão: o concat
    # abaixo usa `-c copy`, que cola pacotes sem reamostrar — silêncio numa taxa
    # diferente da dos blocos toca na velocidade errada e desalinha o b-roll.
    lista = os.path.join(brutos, "_lista.txt")
    sil = os.path.join(brutos, "_silencio.mp3")
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0",
                        "-show_entries", "stream=sample_rate", "-of", "csv=p=0",
                        partes[0]], capture_output=True, text=True)
    taxa = (r.stdout or "").strip() or "24000"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi",
                    "-i", "anullsrc=r=%s:cl=mono" % taxa, "-t", "0.6",
                    "-c:a", "libmp3lame", "-b:a", "192k", sil], timeout=60)
    with open(lista, "w", encoding="utf-8") as f:
        for i, p in enumerate(partes):
            f.write("file '%s'\n" % p.replace("\\", "/"))
            if i < len(partes) - 1:
                f.write("file '%s'\n" % sil.replace("\\", "/"))
    final = os.path.join(saida, "vo.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
                    "-i", lista, "-c", "copy", final], timeout=600)
    d = _dur(final)
    print("─" * 66)
    print("%-34s %8d %7.1fs %8.1f" % ("TOTAL", palavras, d, palavras / (d / 60) if d else 0))
    print("\nvo.mp3 · %d min %02d s" % (int(d // 60), int(d % 60)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
