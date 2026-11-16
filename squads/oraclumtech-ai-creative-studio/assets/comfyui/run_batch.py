# -*- coding: utf-8 -*-
"""
Runner de lote noturno — enfileira workflows do squad no ComfyUI via API REST.

Converte workflow em formato UI (o que o ComfyUI salva) para formato API
(o que o POST /prompt aceita), lendo os nomes de widget do /object_info em
tempo de execução — então funciona para qualquer workflow, não só um.

Uso:
    python run_batch.py                # roda o lote completo
    python run_batch.py --list         # só lista os jobs
    python run_batch.py --only flux    # roda os jobs cujo id contém "flux"

Regras de operação:
  · Sequencial. A máquina tem 16 GB de RAM; dois modelos grandes juntos derrubam.
  · Falha de um job NÃO interrompe o lote — fica registrada e segue.
  · Tudo logado em _batch-log.json ao lado deste arquivo.
"""
import io, json, os, sys, time, urllib.request, urllib.error

API = "http://127.0.0.1:8188"
HERE = os.path.dirname(os.path.abspath(__file__))
WF_DIR = os.path.join(HERE, "workflows")
LOG = os.path.join(HERE, "_batch-log.json")
COMFY_INPUT = os.path.join(
    r"C:" + os.sep, "Users", "Pichau", "Desktop", "ComfyUI_windows_portable",
    "ComfyUI", "input")

# DIMENSIONADO PELA EVIDENCIA EM DISCO, nao por estimativa.
# Os takes que de fato sairam (27 e 30/08, preset `validado`, 20 passos) levaram
# 53, 55, 59 e 60 min entre geracoes consecutivas. O preset `maximo` tem 30
# passos -- ~50% mais sampling --, o que projeta ~85-90 min por take.
#
# Em 05/09 o teto estava em 75 min e os tres takes da noite foram abortados por
# timeout provavelmente ANTES de terminar. Custo: a noite inteira, zero videos.
# 120 min da folga sobre os ~90 projetados sem virar espera infinita.
TIMEOUT_POR_JOB_S = 60 * 120         # 120 min por job
CONTROLES = {"randomize", "fixed", "increment", "decrement"}
# ATENÇÃO: nesta versão do ComfyUI, combo vem como a STRING "COMBO" (com as opções
# no segundo elemento), não como lista de opções. Tratar só lista deixa passar o
# widget como se fosse link — foi o que quebrou o primeiro lote (HTTP 400).
TIPOS_ESCALARES = {"INT", "FLOAT", "STRING", "BOOLEAN", "COMBO"}
# Nós que só existem na UI: não vão para o formato API.
SO_UI = {"MarkdownNote", "Note", "Reroute", "PrimitiveNode"}


# ── infra ────────────────────────────────────────────────────────────────────
def get(path, timeout=30):
    return json.loads(urllib.request.urlopen(API + path, timeout=timeout).read())


def post(path, payload, timeout=60):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(API + path, data=data,
                                 headers={"Content-Type": "application/json"})
    corpo = urllib.request.urlopen(req, timeout=timeout).read()
    # `/free` responde 200 com CORPO VAZIO. Fazer json.loads("") levantava
    # JSONDecodeError e `liberar_modelos()` caia no except -- sempre devolvendo
    # False. Efeito: a linha [mem] nunca aparecia no log (0 ocorrencias na noite
    # de 05/09, com duas trocas de familia de modelo), e o `time.sleep(3)` que
    # dava tempo da liberacao completar NUNCA rodava. O POST chegava a ser
    # enviado, entao a liberacao acontecia -- mas sem espera e sem confirmacao.
    if not corpo.strip():
        return {}
    return json.loads(corpo)


def liberar_modelos():
    """Descarrega os modelos residentes no ComfyUI.

    POR QUE ISTO EXISTE
      Depois de rodar o Wan (dois GGUF de 14B) e emendar num lote de imagem, a
      RAM livre caiu para 0,6 GB e o lote PAROU de andar — nao com erro, com
      lentidao de paginacao. O `/free` devolveu a VRAM (4,5 -> 7,3 GB) e o lote
      voltou a 25 s por imagem.

      A troca de FAMILIA de modelo e o momento exato em que isso importa: dois
      modelos grandes de familias diferentes nao cabem juntos em 16 GB.
    """
    try:
        post("/free", {"unload_models": True, "free_memory": True}, timeout=30)
        time.sleep(3)
        return True
    except Exception:
        return False


def esperar_api(limite_s=300):
    t0 = time.time()
    while time.time() - t0 < limite_s:
        try:
            get("/system_stats", timeout=5)
            return True
        except Exception:
            time.sleep(3)
    return False


def widgets_do_no(objinfo, class_type):
    """Nomes dos widgets de um node, na ordem em que aparecem em widgets_values."""
    spec = objinfo.get(class_type)
    if not spec:
        return None
    nomes = []
    for grupo in ("required", "optional"):
        for nome, definicao in (spec.get("input", {}).get(grupo) or {}).items():
            tipo = definicao[0] if isinstance(definicao, list) else definicao
            # combo (lista de opções) ou escalar => é widget; o resto é link.
            # `"COMBO" in tipo` cobre os combos DINÂMICOS que o ComfyUI introduziu
            # depois (ex.: COMFY_DYNAMICCOMBO_V3, no `codec` do SaveVideo). Sem isso
            # o campo é tratado como link e sai do prompt em silêncio — o grafo roda
            # a geração inteira e só quebra no último nó, com
            # "SaveVideo.execute() missing 1 required positional argument: 'codec'".
            eh_widget = (isinstance(tipo, list)
                         or tipo in TIPOS_ESCALARES
                         or (isinstance(tipo, str) and "COMBO" in tipo))
            if eh_widget:
                nomes.append(nome)
    return nomes


def para_api(wf, objinfo):
    origem = {lid: [str(on), slot] for lid, on, slot, _tn, _ts, _t in wf["links"]}
    prompt = {}
    for n in wf["nodes"]:
        ct = n["type"]
        if n.get("mode") in (2, 4):          # muted / bypass
            continue
        if ct in SO_UI:                      # nota, reroute — só existem na UI
            continue
        nomes = widgets_do_no(objinfo, ct)
        if nomes is None:
            raise RuntimeError("classe de node ausente no ComfyUI: %s" % ct)

        ligados = {inp["name"] for inp in (n.get("inputs") or [])
                   if inp.get("link") is not None}
        valores = list(n.get("widgets_values") or [])
        n_controles = sum(1 for v in valores
                          if isinstance(v, str) and v in CONTROLES)

        # Duas convenções convivem no mesmo grafo:
        #  · widget que RECEBEU link continua ocupando slot (ex.: UnifiedTTSSRTNode.srt_content)
        #  · input que SÓ existe como link nunca teve slot (ex.: SaveText.text)
        # A contagem decide qual é o caso deste nó.
        pular_ligados = (len(valores) - n_controles) < len(nomes)

        def mapear(pular):
            out, i = {}, 0
            for nome in nomes:
                if pular and nome in ligados:
                    continue
                if i >= len(valores):
                    break
                out[nome] = valores[i]
                i += 1
                # seed e afins carregam um widget extra de controle na UI
                if i < len(valores) and isinstance(valores[i], str) and valores[i] in CONTROLES:
                    i += 1
            return out

        inputs = mapear(pular_ligados)

        for inp in (n.get("inputs") or []):
            if inp.get("link") is not None and inp["link"] in origem:
                inputs[inp["name"]] = origem[inp["link"]]

        prompt[str(n["id"])] = {"class_type": ct, "inputs": inputs}
    return prompt


def aplicar(prompt, overrides):
    """overrides: {"<classe>.<campo>": valor} ou {"<id>.<campo>": valor}"""
    for chave, valor in (overrides or {}).items():
        alvo, campo = chave.rsplit(".", 1)
        for nid, node in prompt.items():
            if nid == alvo or node["class_type"] == alvo:
                if campo in node["inputs"]:
                    node["inputs"][campo] = valor
    return prompt


_ULTIMO_WF = [None]


def rodar(job, objinfo, log):
    caminho = os.path.join(WF_DIR, job["workflow"])
    # troca de workflow costuma ser troca de familia de modelo. Liberar antes evita
    # que o modelo antigo e o novo dividam uma RAM que nao comporta os dois.
    if _ULTIMO_WF[0] is not None and _ULTIMO_WF[0] != job["workflow"]:
        if liberar_modelos():
            print("  [mem] modelos anteriores descarregados (%s -> %s)"
                  % (_ULTIMO_WF[0], job["workflow"]), flush=True)
        else:
            print("  [mem] AVISO: /free falhou na troca %s -> %s; o modelo "
                  "anterior pode ainda estar ocupando RAM"
                  % (_ULTIMO_WF[0], job["workflow"]), flush=True)
    _ULTIMO_WF[0] = job["workflow"]
    reg = {"id": job["id"], "workflow": job["workflow"], "inicio": time.strftime("%H:%M:%S")}
    try:
        wf = json.load(open(caminho, encoding="utf-8"))
        prompt = aplicar(para_api(wf, objinfo), job.get("overrides"))
        r = post("/prompt", {"prompt": prompt})
        pid = r["prompt_id"]
        reg["prompt_id"] = pid
        print("  [%s] enfileirado (%s)" % (job["id"], pid[:8]), flush=True)

        t0 = time.time()
        while time.time() - t0 < TIMEOUT_POR_JOB_S:
            time.sleep(5)
            try:
                h = get("/history/%s" % pid)
            except Exception:
                continue
            if pid in h:
                st = h[pid].get("status", {})
                saidas = []
                for _, o in (h[pid].get("outputs") or {}).items():
                    for tipo in ("images", "audio", "gifs", "video"):
                        for a in (o.get(tipo) or []):
                            saidas.append(a.get("filename"))
                # INTERRUPCAO nao e erro comum: cancelar e sempre intencional, e a
                # fila deve parar. Mas a deteccao tem que ser EXATA.
                #
                # A primeira versao procurava a substring "interrupt" em todas as
                # mensagens — e o traceback de QUALQUER erro do ComfyUI contem
                # `allow_interrupt=True`, que e um parametro interno do executor.
                # Todo erro virava "interrompido" e a fila parava: foi assim que
                # um OOM no primeiro take derrubou uma madrugada inteira, com os
                # outros 11 jobs nunca chegando a rodar.
                #
                # Interrupcao real tem tipo proprio. E so ele que conta.
                tipo_erro = ""
                for m in (st.get("messages") or []):
                    if len(m) > 1 and isinstance(m[1], dict) and m[1].get("exception_type"):
                        tipo_erro = str(m[1]["exception_type"])
                if st.get("status_str") == "error":
                    reg["status"] = ("interrompido"
                                     if "InterruptProcessing" in tipo_erro
                                     else "erro")
                    if tipo_erro:
                        reg["erro"] = tipo_erro
                else:
                    reg["status"] = "ok"
                reg["saidas"] = saidas
                reg["segundos"] = round(time.time() - t0)
                print("  [%s] %s em %ss -> %s" % (job["id"], reg["status"],
                                                  reg["segundos"], saidas or "(sem saida)"), flush=True)
                break
        else:
            reg["status"] = "timeout"
            # DESISTIR DE ESPERAR NAO PARA O JOB NO SERVIDOR. Sem o /interrupt o
            # take continua rodando no ComfyUI enquanto o proximo e enfileirado
            # por cima -- e dois Wan (9 GB x 2 cada) nao cabem juntos em 16 GB.
            # Foi assim que a noite de 05/09 terminou com o ComfyUI derrubado:
            # tres takes abortados pelo cliente, todos ainda vivos no servidor.
            try:
                post("/interrupt", {}, timeout=15)
                liberar_modelos()
                print("  [%s] TIMEOUT -- job interrompido no servidor e memoria "
                      "liberada" % job["id"], flush=True)
            except Exception as e_int:
                print("  [%s] TIMEOUT -- e o /interrupt FALHOU (%s). O job pode "
                      "seguir vivo no ComfyUI; o proximo vai competir por RAM."
                      % (job["id"], str(e_int)[:60]), flush=True)
    except Exception as e:
        reg["status"] = "falha"
        reg["erro"] = str(e)[:300]
        print("  [%s] FALHOU: %s" % (job["id"], reg["erro"]), flush=True)
    log.append(reg)
    json.dump(log, open(LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


# ── o roteiro estoico, escrito como PARTITURA ────────────────────────────────
# Aplica data/oratoria-e-prosodia.yaml. Ver comentário nos jobs de narração.
SRT_ESTOICO = """1
00:00:00,000 --> 00:00:04,200
[exag:0.3] Marco Aurélio governava o maior império do mundo.

2
00:00:04,600 --> 00:00:09,000
[exag:0.4] E escrevia, todas as noites, um diário que nunca pretendeu publicar.

3
00:00:10,200 --> 00:00:12,000
[exag:0.2] Nele, não há ordens.

4
00:00:13,000 --> 00:00:15,200
[exag:0.8] Há dúvidas.

5
00:00:16,400 --> 00:00:21,500
[exag:0.4] O homem mais poderoso de Roma passava as madrugadas tentando convencer a si mesmo a ser melhor no dia seguinte.
"""


# ── o lote ───────────────────────────────────────────────────────────────────
JOBS = [
    {
        "id": "flux-interior-01",
        "workflow": "flux2-klein-t2i.json",
        "nota": "Testa o FLUX em interior arquitetonico — assunto do Teste A (Airbnb)",
        "overrides": {
            "CLIPTextEncode.text": (
                "interior of a modern bright apartment living room, large window with "
                "natural daylight, minimalist furniture, wooden floor, plants, clean "
                "architectural photography, wide angle, photorealistic, high detail"
            ),
            "SaveImage.filename_prefix": "noturno/flux-interior",
        },
    },
    {
        "id": "flux-interior-02",
        "workflow": "flux2-klein-t2i.json",
        "nota": "Segundo assunto: detalhe/textura, onde geracao costuma falhar",
        "overrides": {
            "CLIPTextEncode.text": (
                "close-up detail of a cozy bedroom corner, linen bedding, warm bedside "
                "lamp, wooden nightstand with a book and a ceramic mug, soft morning "
                "light, shallow depth of field, photorealistic interior photography"
            ),
            "SaveImage.filename_prefix": "noturno/flux-detalhe",
        },
    },
    {
        "id": "trilha-hospedagem",
        "workflow": "audio-trilha-sfx.json",
        "nota": "Leito instrumental de 30s para a peca do Teste A (Airbnb)",
        "overrides": {
            "3.text": ("warm minimal ambient instrumental bed, soft piano and airy pads, "
                       "gentle rhythmic pulse, calm optimistic mood, clean modern real "
                       "estate showcase music, no vocals, seamless"),
            "5.seconds_total": 30.0,
            "5.seconds_start": 0.0,
            "6.seconds": 30.0,
            "9.filename_prefix": "noturno/trilha-hospedagem",
        },
    },
    {
        "id": "musica-acestep",
        "workflow": "audio-musica-acestep.json",
        "nota": "Faixa curta — valida o ACE-Step (Teste C)",
        "overrides": {
            "2.tags": ("cinematic, orchestral, stoic, solemn, strings, low brass, "
                       "slow tempo, contemplative, epic, instrumental"),
            "2.lyrics": "[inst]",
            "7.seconds": 45.0,
            "10.filename_prefix": "noturno/musica-acestep",
        },
    },
    # ── NARRAÇÃO ESTOICA ────────────────────────────────────────────────────
    # Duas versões da MESMA narração dirigida, para o founder comparar o registro.
    # O SRT abaixo aplica data/oratoria-e-prosodia.yaml:
    #   · fronteira de cue no meio da frase longa  → respiração
    #   · intervalo de 1,2s antes do cue 3         → pausa dramática
    #   · [exag] 0.3→0.4→0.2→0.8                   → contraste de intensidade
    #   · cue 4 isolado com 2 palavras             → ênfase por isolamento
    {
        "id": "narracao-estoica-generica",
        "workflow": "tts-narracao-srt.json",
        "nota": "VOZ SEGURA para producao: masculina generica, sem pessoa identificavel",
        "overrides": {
            "1.value": SRT_ESTOICO,
            "5.voice_name": "voices_examples/male/male_02.wav",
            "5.reference_text": "",
            "4.audio": "voz_male_02.wav",
            "7.filename_prefix": "noturno/narracao-estoica-generica",
        },
    },
    {
        "id": "narracao-estoica-grave",
        "workflow": "tts-narracao-srt.json",
        "nota": "REFERENCIA DE REGISTRO apenas — voz de pessoa real, NAO usar em publicacao",
        "overrides": {
            "1.value": SRT_ESTOICO,
            "5.voice_name": "voices_examples/Morgan_Freeman CC3.wav",
            "5.reference_text": "",
            "4.audio": "voz_grave_ref.wav",
            "7.filename_prefix": "noturno/narracao-estoica-grave-REFERENCIA",
        },
    },
]


def main():
    if "--list" in sys.argv:
        for j in JOBS:
            print("  %-22s %-26s %s" % (j["id"], j["workflow"], j["nota"]))
        return

    filtros = None
    if "--only" in sys.argv:
        filtros = [x.strip() for x in sys.argv[sys.argv.index("--only") + 1].split(",") if x.strip()]

    print("[batch] aguardando ComfyUI em %s ..." % API, flush=True)
    if not esperar_api():
        print("[batch] ComfyUI nao respondeu. Suba com run_nvidia_gpu.bat e rode de novo.")
        sys.exit(1)

    st = get("/system_stats")
    print("[batch] ComfyUI %s | RAM livre %.1f GB | VRAM livre %.1f GB" % (
        st["system"].get("comfyui_version"),
        st["system"]["ram_free"] / 1024**3,
        st["devices"][0]["vram_free"] / 1024**3), flush=True)

    objinfo = get("/object_info", timeout=120)
    log = []
    alvo = [j for j in JOBS if not filtros or any(f in j["id"] for f in filtros)]
    print("[batch] %d job(s) na fila\n" % len(alvo), flush=True)

    seguidas = 0
    for j in alvo:
        rodar(j, objinfo, log)
        ultimo = log[-1]["status"] if log else "ok"
        if ultimo == "interrompido":
            print("\n[batch] INTERROMPIDO — a fila para aqui.")
            print("[batch] %d job(s) nao chegaram a rodar. Rode de novo com "
                  "--only quando quiser retomar." % (len(alvo) - alvo.index(j) - 1))
            break
        # Falha isolada nao para a fila; falha em sequencia sim — quando tres
        # seguem falhando, a causa e do ambiente e nao do job.
        seguidas = seguidas + 1 if ultimo != "ok" else 0
        if seguidas >= 3:
            causas = [r.get("erro", "?") for r in log[-3:]]
            print("\n[batch] 3 falhas seguidas — parando.")
            print("[batch] causas: %s" % " | ".join(str(c)[:60] for c in causas))
            print("[batch] OutOfMemoryError aqui quase sempre significa outro "
                  "modelo ainda carregado. Rode /free antes de retomar.")
            break

    ok = sum(1 for r in log if r.get("status") == "ok")
    print("\n[batch] concluido: %d/%d ok" % (ok, len(log)))
    print("[batch] log: %s" % LOG)



# ── AIRBNB — takes I2V sobre as fotos REAIS (ver assets/insumos/airbnb/PLANO-DE-TAKES.md)
NEG_FIDELIDADE = "added furniture, added plants, added people, added animals, new buildings, changed wall color, changed water color, changed floor, day to night change, weather change, invented mountains, invented horizon, extra objects, text, watermark, subtitles, logo, camera shake, jitter, morphing scenery, warping architecture, moving background elements, distorted geometry, low quality, blurry"

# ── PREPARO DA FOTO: super-resolucao FIEL antes do I2V ─────────────────────
# Duas das quatro fotos sao 720x960 e sao WEBP — ou seja, ja chegam com artefato
# de compressao. O I2V AMPLIFICA artefato: o que estava borrado na origem vira
# textura instavel no movimento. Uma passada de ESRGAN 2x limpa isso.
#
# SEM DIFUSAO, de proposito. Peca de hospedagem que mostra um lugar que nao existe
# e propaganda enganosa, e o dano cai no dono do imovel. ESRGAN amplia e limpa;
# nao redesenha.
FOTOS_AIRBNB = ["airbnb_01.webp", "airbnb_02.webp", "airbnb_04.png", "airbnb_05.png"]

for _f in FOTOS_AIRBNB:
    _base = _f.rsplit(".", 1)[0]
    JOBS.append({
        "id": "prep-" + _base,
        "workflow": "imagem-superres-fiel.json",
        "nota": "Super-resolucao fiel da foto do imovel — ESRGAN 2x, sem difusao",
        "overrides": {
            "1.image": _f,
            "4.filename_prefix": "airbnb-hq/" + _base + "_hq",
        },
    })


# ── OS TAKES ───────────────────────────────────────────────────────────────
# O preset vem do ambiente para o .bat poder escolher sem editar codigo:
#   set PRESET_WAN=validado   4x upscale, RIFE x2, 32 fps, 20 passos  (padrao)
#   set PRESET_WAN=nitido     2x upscale, 30 passos, gera em resolucao maior
#   set PRESET_WAN=suave      4x upscale, RIFE x4, 64 fps
PRESET_WAN = os.environ.get("PRESET_WAN", "validado").strip().lower()
if PRESET_WAN not in ("validado", "nitido", "suave"):
    PRESET_WAN = "validado"

# A resolucao de GERACAO acompanha o preset, porque e ela que decide se o upscale
# cabe na RAM. Com 4x, gerar acima de 720x960 estoura no RIFE.
RES_POR_PRESET = {
    "validado": {"retrato": (720, 960), "paisagem": (960, 720)},
    "nitido":   {"retrato": (832, 1120), "paisagem": (1120, 832)},
    "suave":    {"retrato": (720, 960), "paisagem": (960, 720)},
}
_RES = RES_POR_PRESET[PRESET_WAN]


def _foto(nome_base, original):
    """Usa a foto LIMPA se o preparo ja rodou; senao cai na original."""
    rel = "airbnb-hq/" + nome_base + "_hq_00001_.png"
    if os.path.isfile(os.path.join(COMFY_INPUT, rel.replace("/", os.sep))):
        return rel
    return original


# (id, base, arquivo original, frames, orientacao, prompt)
AIRBNB = [
    ("t1-estabelecimento", "airbnb_02", "airbnb_02.webp", 65, "retrato",
     "The camera slowly tilts upward from the swimming pool toward the forested "
     "mountains behind the house. Tropical Atlantic-forest hillside, tiled roof, "
     "stone path over grass, bright blue sky with soft clouds. Gentle natural "
     "movement in the vegetation only. Locked tripod tilt, no reframing, the scene "
     "itself stays exactly as photographed."),
    ("t2-deck-ofuro", "airbnb_01", "airbnb_01.webp", 49, "paisagem",
     "A smooth slow dolly-in toward the wooden deck and the hot tub, passing the "
     "bamboo pergola. Warm tropical daylight, black marble pool wall, tropical "
     "plants, palm trees. Only the water surface and leaves move naturally. "
     "The scene itself stays exactly as photographed."),
    ("t3-piscina-noite", "airbnb_05", "airbnb_05.png", 49, "retrato",
     "A slow dolly-in toward the blue-lit swimming pool at night. Palm trees in "
     "silhouette against an overcast night sky, black marble wall with warm light "
     "strip. Only the water surface ripples gently. The scene itself stays exactly "
     "as photographed."),
    ("t4-fogueira", "airbnb_04", "airbnb_04.png", 65, "retrato",
     "A slow dolly-in toward the lit fire pit on the stone patio at night. Teal "
     "painted wall, hanging egg chair, rattan chairs with sheepskin, warm pendant "
     "lanterns. The flames flicker and dance naturally, warm light shifting on the "
     "surrounding stone. Everything else stays exactly as photographed."),
]

# TRES LOTES por take. I2V erra de forma imprevisivel — a mesma entrada e o mesmo
# prompt produzem takes bons e takes deformados dependendo da semente.
SEMENTES_WAN = [101, 4242, 90210]

for _id, _base, _orig, _len, _ori, _pos in AIRBNB:
    _w, _h = _RES[_ori]
    for _si, _seed in enumerate(SEMENTES_WAN, 1):
        JOBS.append({
            "id": "airbnb-%s-s%d" % (_id, _si),
            "workflow": "wan22-i2v-%s.json" % PRESET_WAN,
            "nota": "Take I2V - preset %s - lote %d de 3" % (PRESET_WAN, _si),
            "overrides": {
                "9.image": _foto(_base, _orig),
                "7.text": _pos,
                "8.text": NEG_FIDELIDADE,
                "121.length": _len,
                "121.width": _w,
                "121.height": _h,
                # os dois estagios do Wan tem semente propria; se so uma mudar,
                # o lote nao e de fato diferente
                "124.noise_seed": _seed,
                "125.noise_seed": _seed + 1,
                "131.filename_prefix": "airbnb/%s-%s-s%d" % (PRESET_WAN, _id, _si),
            },
        })


SRT_ESTOICO_V2 = """1
00:00:00,000 --> 00:00:03,400
[exag:0.35] Marco Aurélio governava o maior império do mundo.

2
00:00:03,800 --> 00:00:08,000
[exag:0.4] E escrevia, todas as noites, um diário que nunca pretendeu publicar.

3
00:00:08,600 --> 00:00:10,300
[exag:0.25] Nele, não há ordens.

4
00:00:10,800 --> 00:00:12,300
[exag:0.75] Há dúvidas.

5
00:00:13,000 --> 00:00:19,500
[exag:0.4] O homem mais poderoso de Roma passava as madrugadas tentando convencer a si mesmo a ser melhor no dia seguinte.
"""

VOZES_TESTE = [
    ("male02",       "voices_examples/male/male_02.wav",              "voz_male_02.wav",     "generica masculina - SEGURA para publicar"),
    ("male01",       "voices_examples/male/male_01.wav",              "voz_male_01.wav",     "generica masculina 2 - SEGURA para publicar"),
    ("chadwick",     "voices_examples/higgs_audio/chadwick.wav",      "voz_chadwick.wav",    "personagem generico - SEGURA para publicar"),
    ("enman",        "voices_examples/higgs_audio/en_man.wav",        "voz_enman.wav",       "generica masculina 3 - SEGURA para publicar"),
    ("freeman",      "voices_examples/Morgan_Freeman CC3.wav",        "voz_freeman.wav",     "TESTE APENAS - pessoa real, nao publicar"),
    ("attenborough", "voices_examples/David_Attenborough CC3.wav",    "voz_attenb.wav",      "TESTE APENAS - pessoa real, nao publicar"),
    ("eastwood",     "voices_examples/Clint_Eastwood CC3 (enhanced2).wav", "voz_eastwood.wav", "TESTE APENAS - pessoa real, nao publicar"),
]

for _id, _vn, _file, _nota in VOZES_TESTE:
    JOBS.append({
        "id": "voz-" + _id,
        "workflow": "tts-narracao-srt.json",
        "nota": _nota,
        "overrides": {
            "1.value": SRT_ESTOICO_V2,
            "5.voice_name": _vn,
            "5.reference_text": "",
            "4.audio": _file,
            "7.filename_prefix": "vozes/" + _id,
        },
    })


# ── EXPERIMENTO: clonar a voz do video de referencia (ESTUDO, nao publicar) ──
# Testa se referencia COM trilha de fundo degrada a clonagem. O resultado vale
# para qualquer voz futura, inclusive as de LibriVox com ruido de sala.
for _id, _file, _nota in [
    ("clone-cru",   "ref_video_cru.wav",   "referencia CRUA, com trilha de fundo"),
    ("clone-limpo", "ref_video_limpo.wav", "mesma referencia com filtro de reducao de trilha"),
]:
    JOBS.append({
        "id": "exp-" + _id,
        "workflow": "tts-narracao-srt.json",
        "nota": "ESTUDO — " + _nota + " — NAO PUBLICAR",
        "overrides": {
            "1.value": SRT_ESTOICO_V2,
            "5.voice_name": "none",
            "5.reference_text": "",
            "4.audio": _file,
            "7.filename_prefix": "vozes/exp-" + _id,
        },
    })


# ── EXPERIMENTO 2: video de referencia NOVO, mais limpo + referencia mais longa
for _id, _file, _nota in [
    ("v2-800",   "ref_v2_800.wav",   "video 2, trecho 800s (mais vales de silencio), 20s"),
    ("v2-1200",  "ref_v2_1200.wav",  "video 2, trecho 1200s (mais baixo), 20s"),
    ("v2-longa", "ref_v2_longa.wav", "video 2, referencia de 30s — testa se duracao ajuda"),
]:
    JOBS.append({
        "id": "exp2-" + _id,
        "workflow": "tts-narracao-srt.json",
        "nota": "ESTUDO — " + _nota,
        "overrides": {
            "1.value": SRT_ESTOICO_V2,
            "5.voice_name": "none",
            "5.reference_text": "",
            "4.audio": _file,
            "7.filename_prefix": "vozes/exp2-" + _id,
        },
    })


# ── COMPARACAO: modelo generico 23-lang x modelo PT-BR dedicado ─────────────
PTBR = "Brazilian Portuguese (ResembleAI)"
for _id, _mv, _voz, _file, _nota in [
    ("ptbr-embutida",  PTBR, "none",                                "voz_male_02.wav", "PT-BR dedicado + voz embutida"),
    ("ptbr-male02",    PTBR, "voices_examples/male/male_02.wav",    "voz_male_02.wav", "PT-BR dedicado + ref masculina generica"),
    ("ptbr-clone",     PTBR, "none",                                "ref_v2_1200.wav", "PT-BR dedicado + clone do narrador BR"),
    ("v3-clone",       "v3", "none",                                "ref_v2_1200.wav", "generico 23-lang + mesmo clone (CONTROLE)"),
]:
    JOBS.append({
        "id": "cmp-" + _id,
        "workflow": "tts-narracao-srt.json",
        "nota": _nota,
        "overrides": {
            "1.value": SRT_ESTOICO_V2,
            "2.model_version": _mv,
            "5.voice_name": _voz,
            "5.reference_text": "",
            "4.audio": _file,
            "7.filename_prefix": "vozes/cmp-" + _id,
        },
    })


# ── PACK DE IMAGEM — estatuas para o dark de estoicismo ─────────────────────
# Gramatica extraida do video de referencia (data/dark-estoicismo-playbook.yaml):
# marmore branco isolado em fundo PRETO absoluto, alto contraste, particulas.
ESTOICO_NEG = "text, letters, words, watermark, signature, caption, subtitles, logo, extra fingers, fused fingers, deformed hands, extra limbs, colorful, saturated, bright background, cluttered, busy composition, low quality, blurry, jpeg artifacts, cartoon, 3d render"

ESTATUAS = [
    ("e01-filosofo-sentado",
     "A classical white marble statue of a bearded ancient Greek philosopher seated in "
     "contemplation, draped toga, head slightly lowered, isolated on a pure black "
     "background, dramatic single-source side lighting, sharp marble texture, fine dust "
     "particles floating in the light, cinematic chiaroscuro, museum photography, "
     "monochromatic, high detail"),
    ("e02-busto-perfil",
     "A classical white marble bust of a stoic Roman emperor in three-quarter profile, "
     "carved curls and beard, isolated on a pure black background, single dramatic rim "
     "light from the left, deep shadows, sharp marble grain, floating dust motes, "
     "cinematic chiaroscuro, monochromatic, high detail"),
    ("e03-maos-pergaminho",
     "Close-up of a classical white marble statue hands holding an unrolled scroll, "
     "carved drapery around the wrists, isolated on a pure black background, soft "
     "directional light raking across the marble surface, deep shadow, fine stone "
     "texture, cinematic chiaroscuro, monochromatic, high detail"),
    ("e04-templo-noturno",
     "Ancient Greek temple colonnade at night, weathered marble columns receding into "
     "darkness, faint starfield above, cold moonlight grazing the stone, heavy "
     "atmospheric haze, deep blacks, cinematic wide shot, desaturated, high detail"),
]

for _id, _pos in ESTATUAS:
    JOBS.append({
        "id": "img-" + _id,
        "workflow": "flux2-klein-t2i.json",
        "nota": "Pack de imagem do dark estoico — geracao CRUA (estagio 1)",
        "overrides": {
            "4.text": _pos,
            "5.text": ESTOICO_NEG,
            "6.width": 1024,
            "6.height": 1024,
            "7.width": 1024,
            "7.height": 1024,
            "13.filename_prefix": "pack-estoico/cru/" + _id,
        },
    })


# ── PACK ESTOICO · ESTÁGIOS 2 e 3 (refino + upscale) ────────────────────────
# Roda em cima do PNG cru já gerado, que foi copiado para ComfyUI/input/pack-estoico/.
# O prompt é o MESMO da geração — é isso que faz o Detailer redesenhar coerente
# em vez de inventar outro rosto.
#
# Parâmetros que decidem o resultado (playbook de refino, §Detailer):
#   · FaceDetailer.denoise 0.35 — acima de ~0.45 troca a identidade
#   · UltimateSDUpscale.denoise 0.18 — acima de ~0.25 cada ladrilho inventa detalhe
#     próprio e a costura entre eles aparece

for _id, _pos in ESTATUAS:
    JOBS.append({
        "id": "ref-" + _id,
        "workflow": "flux2-klein-refino-upscale.json",
        "nota": "Pack estoico — ESTAGIO 2 (detailer) + ESTAGIO 3 (upscale 2x)",
        "overrides": {
            "4.text": _pos,
            "5.text": ESTOICO_NEG,
            "6.image": "pack-estoico/" + _id + "_00001_.png",
            "9.filename_prefix": "pack-estoico/refinado/" + _id,
            "12.filename_prefix": "pack-estoico/final/" + _id,
        },
    })




# ── PACK DE TRILHAS, AMBIÊNCIAS E SFX ───────────────────────────────────────
# Catálogo em pecas_audio.py — segmento / tipo / intenção.
# Dois engines, escolhidos pelo que cada um faz melhor:
#   · ACE-Step 3.5B (Apache 2.0)      → música COM estrutura e progressão
#   · Stable Audio Open 1.0           → leito, ambiência e SFX (textura, não melodia)
from pecas_audio import PECAS as _PECAS

for _pid, _pasta, _eng, _dur, _prompt, _intencao in _PECAS:
    if _eng == "ace":
        JOBS.append({
            "id": "aud-" + _pid,
            "workflow": "audio-musica-acestep.json",
            "nota": _intencao,
            "overrides": {
                "2.tags": _prompt,
                "2.lyrics": "[inst]",
                "7.seconds": float(_dur),
                "10.filename_prefix": "pack-audio/" + _pid,
            },
        })
    else:
        JOBS.append({
            "id": "aud-" + _pid,
            "workflow": "audio-trilha-sfx.json",
            "nota": _intencao,
            "overrides": {
                "3.text": _prompt,
                "5.seconds_start": 0.0,
                "5.seconds_total": float(_dur),
                "6.seconds": float(_dur),
                "9.filename_prefix": "pack-audio/" + _pid,
            },
        })


# ATENCAO: este guard fica SEMPRE no fim do arquivo. Toda lista de jobs e
# anexada acima dele. Ja aconteceu duas vezes de um bloco novo entrar depois
# do guard e os jobs simplesmente nao existirem quando main() rodou.


# ── PACK ESTOICO v2 · 16:9 PARA YOUTUBE ─────────────────────────────────────
# Tres mudancas em relacao ao v1, todas motivadas por retorno do founder:
#
#  1. FORMATO. 1344x768 (16:9) em vez de 1024x1024. O destino e video horizontal.
#     Upscale 3x na etapa seguinte -> 4032x2304, que cobre 4K com folga para o
#     editor empurrar zoom e pan sem amolecer a imagem.
#
#  2. AS POEIRINHAS SAIRAM. "floating dust motes" e "fine dust particles" estavam
#     NO PROMPT — o ruido ao redor do rosto que o founder marcou fui eu que pedi.
#
#  3. NEGATIVO ENDURECIDO contra as 4 anomalias reais do v1: perna a mais,
#     cunha escura sob a base do busto, objeto nao-identificavel na mao,
#     coluna extra flutuando na borda.
#
# Tres sementes por cena. O curso e explicito: o metodo e volume + escolha humana,
# nao acerto de primeira. Quem escolhe e o founder, na folha de contato.

ESTOICO_NEG_V2 = (
    "text, letters, words, watermark, signature, caption, subtitles, logo, "
    "extra limbs, third leg, duplicated leg, extra arm, malformed anatomy, "
    "extra fingers, fused fingers, deformed hands, "
    "floating debris, dust specks, particles, noise, grain, speckles, "
    "floating object, unidentifiable object, tube, pipe, hollow cylinder, "
    "cut off column, floating column, duplicated column, column without base, "
    "handwriting, script, calligraphy, inscription, printed page, manuscript text, "
    # rev.2 — saiu mao de PELE em duas imagens. O canal inteiro e de marmore,
    # entao carne e defeito de material em qualquer take.
    "human skin, flesh, skin texture, living hands, real person, photograph of a person, "
    "misaligned architecture, broken pedestal, dark wedge artifact, "
    "colorful, saturated, bright background, cluttered, busy composition, "
    "low quality, blurry, jpeg artifacts, cartoon, 3d render"
)

ESTATUAS_V2 = [
    ("y01-filosofo-sentado",
     "Wide cinematic horizontal composition. A classical white marble statue of a "
     "bearded ancient Greek philosopher seated in contemplation on a plain "
     "rectangular marble plinth, draped toga, head lowered, exactly two legs with "
     "both bare feet resting flat on the plinth, complete and anatomically correct "
     "body, positioned to the right of frame with empty black space to the left, "
     "isolated on a pure black background, dramatic single-source side lighting, "
     "sharp marble texture, clean air, cinematic chiaroscuro, museum photography, "
     "monochromatic, high detail"),

    ("y02-busto-perfil",
     "Wide cinematic horizontal composition. A classical white marble bust of a stoic "
     "Roman emperor in three-quarter profile, carved curls and beard, resting on a "
     "simple solid rectangular marble pedestal fully visible and squarely supporting "
     "the bust, positioned to the left of frame with empty black space to the right, "
     "isolated on a pure black background, single dramatic rim light from the left, "
     "deep shadows, sharp marble grain, clean air, cinematic chiaroscuro, "
     "monochromatic, high detail"),

    # v3 desta cena. A v2 consertou a forma (virou pergaminho de verdade) mas criou
    # um defeito PIOR: eu pedi "showing its written surface" e o modelo escreveu —
    # texto ilegivel de IA, que e a anomalia de prioridade 1 do playbook, porque e a
    # unica que o espectador consegue LER. Pergaminho em BRANCO; se precisar de texto,
    # ele entra depois, como tipografia de verdade.
    ("y03-maos-pergaminho",
     "Wide cinematic horizontal close-up. Two hands carved from white marble, clearly "
     "made of polished stone and not flesh, holding an open papyrus scroll, the scroll "
     "unrolled flat between the hands, its surface completely blank and unmarked aged "
     "papyrus with no writing of any kind, wooden scroll rods at each end, carved "
     "marble drapery around the wrists, isolated on a pure black background, soft "
     "directional light raking across the stone, deep shadow, fine marble texture, "
     "cinematic chiaroscuro, monochromatic, high detail"),

    ("y04-templo-noturno",
     "Wide cinematic horizontal shot. Ancient Greek temple colonnade at night, two "
     "symmetrical rows of complete weathered marble columns receding into darkness, "
     "every column standing on its own base and reaching the entablature above, "
     "faint starfield, cold moonlight grazing the stone, heavy atmospheric haze, "
     "deep blacks, desaturated, high detail"),
]

SEMENTES = [11, 2027, 90210]

for _id, _pos in ESTATUAS_V2:
    for _n, _seed in enumerate(SEMENTES, 1):
        JOBS.append({
            "id": "yt-%s-s%d" % (_id, _n),
            "workflow": "flux2-klein-t2i.json",
            "nota": "Pack YouTube 16:9 — geracao crua, semente %d de 3" % _n,
            "overrides": {
                "4.text": _pos,
                "5.text": ESTOICO_NEG_V2,
                "6.width": 1344, "6.height": 768,
                "7.width": 1344, "7.height": 768,
                "9.noise_seed": _seed,
                "13.filename_prefix": "pack-estoico-yt/cru/%s-s%d" % (_id, _n),
            },
        })




# ── ACABAMENTO DO PACK 16:9 · DUAS RODAS ────────────────────────────────────
# Definidas com o founder em 2026-08-29:
#   LITE  cru -> upscale 2x              -> 2688x1536.  ~1 min.  Volume e prova.
#   PRO   cru -> detailer -> upscale 3x  -> 4032x2304.  ~5 min.  Peca final.
#
# A mesma imagem crua alimenta as duas. Nada e regerado — o que muda e so o
# acabamento, entao a escolha de roda pode acontecer DEPOIS da escolha de semente.
IN_YT = "pack-estoico-yt/"

for _id, _pos in ESTATUAS_V2:
    for _n in (1, 2, 3):
        _img = "%s%s-s%d" % (IN_YT, _id, _n)
        _arq = _img + ("_00002_.png" if _id.startswith("y03") else "_00001_.png")
        for _roda, _wf in (("lite", "flux2-klein-lite-upscale.json"),
                           ("pro", "flux2-klein-pro-refino-upscale.json")):
            _ov = {
                "4.text": _pos,
                "5.text": ESTOICO_NEG_V2,
                "6.image": _arq,
                "12.filename_prefix": "pack-estoico-yt/%s/%s-s%d" % (_roda, _id, _n),
            }
            if _roda == "pro":
                _ov["9.filename_prefix"] = "pack-estoico-yt/pro-refinado/%s-s%d" % (_id, _n)
            JOBS.append({
                "id": "%s-%s-s%d" % (_roda, _id, _n),
                "workflow": _wf,
                "nota": "Roda %s do pack 16:9" % _roda.upper(),
                "overrides": _ov,
            })




# ── PACK VISUAL DAS 6 PECAS DO CANAL ────────────────────────────────────────
# 39 imagens, uma por marcador [img NN] dos roteiros em data/roteiros/estoico/.
# Fluxo combinado com o founder:
#   1. gerar as 39 CRUAS  (~25 s cada, ~16 min no total) — barato
#   2. folha de contato por peca -> INSPECAO E APROVACAO DO FOUNDER
#   3. so as aprovadas recebem acabamento (LITE ~175 s ou PRO ~360 s)
# Gastar 4 h de acabamento antes da inspecao seria gastar no lugar errado.
from pack_visual_estoico import PACK as _PACK, prompt_de as _prompt_de

for _peca, _n, _slug, _corpo in _PACK:
    JOBS.append({
        "id": "cnl-%s-%02d-%s" % (_peca.lower(), _n, _slug),
        "workflow": "flux2-klein-t2i.json",
        "nota": "Pack visual %s img %02d — geracao CRUA" % (_peca, _n),
        "overrides": {
            "4.text": _prompt_de(_corpo),
            "5.text": ESTOICO_NEG_V2,
            "6.width": 1344, "6.height": 768,
            "7.width": 1344, "7.height": 768,
            "9.noise_seed": 7000 + _n,
            "13.filename_prefix": "canal-estoico/%s/cru/%02d-%s" % (_peca, _n, _slug),
        },
    })




# ── REGERACAO rev.2 — as 7 recusadas na inspecao do founder ─────────────────
# A1/07 faixa preta na base · A2/02 e 05 maos de pele · A2/04 papiro pequeno
# demais · B1/01 e 06 abstratos · B2/01 pilar misturado com estatua
# Semente NOVA de proposito: o prompt mudou, a semente antiga so confundiria a
# comparacao. Saida em cru/ com sufixo -r2 para o original nao ser sobrescrito.
RECUSADAS = [("A1", 7), ("A2", 2), ("A2", 4), ("A2", 5), ("B1", 1), ("B1", 6), ("B2", 1)]

for _peca, _n, _slug, _corpo in _PACK:
    if (_peca, _n) not in RECUSADAS:
        continue
    JOBS.append({
        "id": "rg2-%s-%02d-%s" % (_peca.lower(), _n, _slug),
        "workflow": "flux2-klein-t2i.json",
        "nota": "rev.2 de %s img %02d — recusada na inspecao" % (_peca, _n),
        "overrides": {
            "4.text": _prompt_de(_corpo),
            "5.text": ESTOICO_NEG_V2,
            "6.width": 1344, "6.height": 768,
            "7.width": 1344, "7.height": 768,
            "9.noise_seed": 8100 + _n,
            "13.filename_prefix": "canal-estoico/%s/cru/%02d-%s-r2" % (_peca, _n, _slug),
        },
    })




# ── TESTE DE FIDELIDADE — modelar os 10 takes principais da referencia v1 ───
# Nao e copia: mesma ideia, mesma luz, mesma profundidade, imagem diferente.
# O entregavel e a comparacao lado a lado com o frame REAL extraido do video.
# Duas sementes por take, porque uma so nao diz se o prompt acertou ou teve sorte.
from modelagem_takes_v1 import TAKES as _TAKES, variacoes as _var_v1, NEG as _NEG_V1

for _t in _TAKES:
    _tid, _slug = _t[0], _t[1]
    for _nivel, _prompt in _var_v1(_t):
        JOBS.append({
            "id": "fid-t%02d-%s-%s" % (_tid, _nivel[:4], _slug),
            "workflow": "flux2-klein-t2i.json",
            "nota": "Fidelidade · T%02d da v1 · variacao %s" % (_tid, _nivel),
            "overrides": {
                "4.text": _prompt,
                "5.text": _NEG_V1,
                "6.width": 1344, "6.height": 768,
                "7.width": 1344, "7.height": 768,
                # semente FIXA por take: as tres variacoes precisam diferir pelo
                # PROMPT, nao pela semente, senao a comparacao nao diz nada
                "9.noise_seed": 4242 + _tid,
                "13.filename_prefix": "fidelidade-v1/T%02d-%s-%s" % (_tid, _slug, _nivel),
            },
        })




# ── NARRACAO DA PECA DE ESTUDO ──────────────────────────────────────────────
# ATENCAO — LIMITE DE USO
#   A voz clonada (`ref_v2_1200.wav`) esta aprovada pelo founder de OUVIDO, e
#   continua `pode_publicar: nao` no banco de vozes. A restricao e de DIREITO DE
#   VOZ, e ouvido nao resolve direito. Estas narracoes servem para fechar a
#   composicao de ESTUDO no video-studio — nao vao ao ar.
#
# O SRT vem de data/roteiros/estoico/*.srt, escrito por conta_roteiros.py: cue
# colado a duracao natural da fala, intervalo aberto so onde a pausa significa algo.
import os as _os

_DIR_ROT = _os.path.normpath(_os.path.join(
    _os.path.dirname(_os.path.abspath(__file__)), "..", "..", "data", "roteiros", "estoico"))

# (roteiro, voz de referencia, texto da referencia, nota)
NARRACOES = [
    ("A1-ordem", "ref_v2_1200.wav", "",
     "ESTUDO — voz clonada da referencia. Nao publicar."),
    ("A1-ordem", "voz_male_02.wav", "",
     "PUBLICAVEL — 03-male-02, validada pelo founder"),
]

for _rot, _voz, _reftxt, _nota in NARRACOES:
    _srt = _os.path.join(_DIR_ROT, _rot + ".srt")
    if not _os.path.isfile(_srt):
        continue
    _tag = "clone" if _voz.startswith("ref_") else "male02"
    JOBS.append({
        "id": "nar-%s-%s" % (_rot.lower(), _tag),
        "workflow": "tts-narracao-srt.json",
        "nota": _nota,
        "overrides": {
            "1.value": io.open(_srt, encoding="utf-8").read(),
            "4.audio": _voz,
            "5.voice_name": "none",
            "5.reference_text": _reftxt,
            "6.timing_mode": "smart_natural",
            "7.filename_prefix": "narracao/%s-%s" % (_rot, _tag),
            "8.filename_prefix": "narracao/%s-%s-adjusted" % (_rot, _tag),
        },
    })




# ── FIDELIDADE v2 — os 10 takes principais da referencia de REFLEXOES ───────
# Mesmo metodo da v1: tres variacoes por take, SEMENTE FIXA entre elas para a
# diferenca vir do prompt e nao do acaso.
from modelagem_takes_v2 import TAKES as _TAKES2, variacoes as _var_v2, NEG as _NEG_V2

for _t in _TAKES2:
    _tid, _slug = _t[0], _t[1]
    for _nivel, _prompt in _var_v2(_t):
        JOBS.append({
            "id": "fv2-t%02d-%s-%s" % (_tid, _nivel[:4], _slug),
            "workflow": "flux2-klein-t2i.json",
            "nota": "Fidelidade v2 - T%02d - variacao %s" % (_tid, _nivel),
            "overrides": {
                "4.text": _prompt,
                "5.text": _NEG_V2,
                "6.width": 1344, "6.height": 768,
                "7.width": 1344, "7.height": 768,
                "9.noise_seed": 7700 + _tid,
                "13.filename_prefix": "fidelidade-v2/T%02d-%s-%s" % (_tid, _slug, _nivel),
            },
        })


# ── PACK VISUAL DO LOTE A LONGO — 3 pecas x 11 marcadores ───────────────────
# Gramatica visual da coluna FIEL da v1 (colunata creme contra vazio teal, corte
# descentrado, particula e vinheta), e nao o fundo preto do pack antigo.
# Semente por peca: as tres dividem o catalogo, nao o quadro.
from pack_visual_lote_a import (MARCADORES as _MK_A, PECAS as _PECAS_A,
                                prompt_de as _prompt_a, semente as _seed_a,
                                NEG as _NEG_A)

for _peca in _PECAS_A:
    for _n, _slug, _corpo in _MK_A:
        JOBS.append({
            "id": "la-%s-%02d-%s" % (_peca.split("-")[0].lower(), _n, _slug),
            "workflow": "flux2-klein-t2i.json",
            "nota": "Pack lote A · %s img %02d — geracao CRUA" % (_peca, _n),
            "overrides": {
                "4.text": _prompt_a(_corpo),
                "5.text": _NEG_A,
                "6.width": 1344, "6.height": 768,
                "7.width": 1344, "7.height": 768,
                "9.noise_seed": _seed_a(_peca, _n),
                "13.filename_prefix": "canal-estoico/%s/cru/%02d-%s" % (_peca, _n, _slug),
            },
        })


# ── NARRACAO PRO DOS 3 LONGOS DO LOTE A ─────────────────────────────────────
# Rota PRO: o motor recebe PARAGRAFOS, nao cues finos. Ver `narracao_pro.py`
# para o porque — dentro do paragrafo a prosodia e continua porque foi gerada
# de uma vez, e prosodia continua nao se reconstroi depois de cortada.
#
# `timing_mode: concatenate` de proposito: ele descarta o timing de entrada,
# emenda o audio natural e devolve o SRT com os tempos REAIS. O timing que
# entra e so ordem. (`stretch_to_fit` continua proibido: 1,29x a 1,61x de
# esticamento, WER de 0% para 15,8%.)
#
# DUAS VOZES, o mesmo texto. O founder ouviu as duas e prefere a CLONE — as
# pecas saem nas duas para ele escolher no editor, trocando so a faixa de audio.
#
#   male02  `voz_male_02.wav`   PUBLICAVEL. Voz generica validada.
#   clone   `ref_v2_1200.wav`   ESTUDO. Clonada da referencia; continua
#           `pode_publicar: nao` no banco de vozes. A restricao e de DIREITO DE
#           VOZ, e gostar do resultado nao resolve direito. Serve para fechar a
#           composicao e para comparar; publicar exige uma voz licenciada.
#
# UMA POR VEZ. Sao ~20 min de audio cada; rodar em paralelo disputa a mesma RAM.
# Os SEIS longos. Lote A modela a referencia v1 (praticas, estrutura A); lote B
# modela a v2 (reflexoes, estrutura B) — outra gramatica de texto e outra
# identidade visual, mas o mesmo caminho de producao.
LONGOS_LOTE_A = [
    "LA1-disciplina", "LA2-ansiedade", "LA3-tempo",
    "LB1-aceitar", "LB2-paz-interior", "LB3-primeiros-minutos",
]

# CADA LOTE TEM O CLONE DO VIDEO QUE ELE MODELA. Errar isto foi facil e o erro e
# invisivel no arquivo: o nome `ref_v2_1200.wav` parece dizer "versao 2 da
# referencia", mas o `v2` ali e VIDEO 2 — a peca de reflexoes, que e a origem do
# lote B. Usei essa voz no lote A, que modela o video 1.
#
#   lote A  <- video 1 (10 praticas)    `ref_video_limpo.wav`   14 s
#   lote B  <- video 2 (10 reflexoes)   `ref_v2_1200.wav`       20 s
#
# `limpo` e nao `cru`: a versao crua carrega a trilha do video por baixo da fala,
# e o clone aprende a trilha junto com a voz.
#
# O `male02` e o mesmo nos dois: e a voz PUBLICAVEL, e nao depende de referencia.
CLONE_DO_LOTE = {"LA": "ref_video_limpo.wav", "LB": "ref_v2_1200.wav"}


def _vozes_de(rot):
    """(tag, arquivo) das duas vozes de uma peca — a publicavel e o clone do lote."""
    return [
        ("male02", "voz_male_02.wav"),
        ("clone", CLONE_DO_LOTE[rot[:2].upper()]),
    ]


for _rot in LONGOS_LOTE_A:
    _srt_blocos = _os.path.join(_DIR_ROT, _rot + ".blocos.srt")
    if not _os.path.isfile(_srt_blocos):
        continue
    _texto_blocos = io.open(_srt_blocos, encoding="utf-8").read()
    for _tag, _voz in _vozes_de(_rot):
        JOBS.append({
            "id": "narpro-%s-%s" % (_rot.lower(), _tag),
            "workflow": "tts-narracao-srt.json",
            "nota": "Narracao PRO por paragrafo — %s / %s" % (_rot, _tag),
            "overrides": {
                "1.value": _texto_blocos,
                "4.audio": _voz,
                "5.voice_name": "none",
                "5.reference_text": "",
                "6.timing_mode": "concatenate",
                "7.filename_prefix": "narracao/%s-%s" % (_rot, _tag),
                "8.filename_prefix": "narracao/%s-%s-adjusted" % (_rot, _tag),
            },
        })


# ── PACK VISUAL DO LOTE B LONGO — 3 pecas x 11 marcadores ───────────────────
# Identidade `estoico-bronze-carmesim`: bronze quase preto, ornamento dourado,
# ruina com arco, planos diurnos largos. Os prompts vem da coluna FIEL da
# modelagem v2 — a mesma que o founder escolheu no storyboard —, importados e
# nao copiados: duas versoes do mesmo prompt divergiriam na primeira correcao.
from pack_visual_lote_b import (MARCADORES as _MK_B, PECAS as _PECAS_B,
                                semente as _seed_b, NEG as _NEG_B)

for _peca in _PECAS_B:
    for _n, _slug, _prompt in _MK_B:
        JOBS.append({
            "id": "lb-%s-%02d-%s" % (_peca.split("-")[0].lower(), _n, _slug),
            "workflow": "flux2-klein-t2i.json",
            "nota": "Pack lote B · %s img %02d — geracao CRUA" % (_peca, _n),
            "overrides": {
                "4.text": _prompt,
                "5.text": _NEG_B,
                "6.width": 1344, "6.height": 768,
                "7.width": 1344, "7.height": 768,
                "9.noise_seed": _seed_b(_peca, _n),
                "13.filename_prefix": "canal-estoico/%s/cru/%02d-%s" % (_peca, _n, _slug),
            },
        })


# ── FUNDOS DA LIVE DE FUTEBOL ───────────────────────────────────────────────
# Ambiente para a live rodar por cima: escuros, desfocados, sem estrutura no
# centro (onde ficam placar e minicampo). Sao IMAGENS e nao video: o fundo fica
# sob um veu escuro e um movimento de camera lento aplicado no overlay entrega
# o mesmo em tela, por 20 s de geracao em vez de 20 min de Wan.
from live_fundos import FUNDOS as _FUNDOS_LIVE, ACABAMENTO as _ACAB_LIVE, NEG as _NEG_LIVE

for _n, _slug, _corpo in _FUNDOS_LIVE:
    JOBS.append({
        "id": "live-fundo-%02d-%s" % (_n, _slug),
        "workflow": "flux2-klein-t2i.json",
        "nota": "Fundo da live de futebol — %s" % _slug,
        "overrides": {
            "4.text": _corpo + ", " + _ACAB_LIVE,
            "5.text": _NEG_LIVE,
            "6.width": 1920, "6.height": 1088,
            "7.width": 1920, "7.height": 1088,
            "9.noise_seed": 4200 + _n,
            "13.filename_prefix": "live-futebol/fundos/%02d-%s" % (_n, _slug),
        },
    })


# ── TORCIDA DA LIVE DE FUTEBOL ──────────────────────────────────────────────
# Quatro pecas: uma cama continua e tres reacoes de uso pontual.
#
# ARMADILHA JA CONHECIDA: o Stable Audio compoe uma PECA, com inicio,
# desenvolvimento e fade — nao uma cama. Para ambiente continuo, gera-se longo e
# recorta-se o miolo com `faz_loops.py`. As reacoes sao curtas e usadas como
# one-shot, entao ai o fade nao atrapalha.
from live_fundos import AUDIOS as _AUDIOS_LIVE

for _nome_a, _dur_a, _prompt_a in _AUDIOS_LIVE:
    JOBS.append({
        "id": "live-audio-%s" % _nome_a,
        "workflow": "audio-trilha-sfx.json",
        "nota": "Torcida da live — %s (%ds)" % (_nome_a, _dur_a),
        "overrides": {
            "3.text": _prompt_a,
            "5.seconds_total": float(_dur_a),
            "6.seconds": float(_dur_a),
            "9.filename_prefix": "live-futebol/torcida/%s" % _nome_a,
        },
    })



# ═══════════════════════════════════════════════════════════════════════════
# CURTOS VERTICAIS 9:16 — lote de validacao (fatia vertical)
# Criado 2026-09-05. Metodo: docs/DERIVACAO-CURTOS.md
#
# Este e o PRIMEIRO lote vertical do canal. Serve para validar a cadeia inteira
# com UM curto (LA1 > Pratica 1, 60s) antes de gastar madrugada nos outros seis.
#
# DUAS DIFERENCAS em relacao ao pack `yt-` (16:9), e as duas sao deliberadas:
#
#   1. RESOLUCAO 768x1344 em vez de 1344x768. E a 9:16 registrada no
#      MEMORY-ESSENCIAL. Nunca foi rodada em producao: se o klein degradar nessa
#      proporcao, aparece aqui e o lote grande nao chega a ser enfileirado.
#
#   2. AMBIENTE, nao fundo preto. O pack `yt-` pede "isolated on a pure black
#      background" — isso vem da leitura ANTIGA da referencia. A rev.3 de
#      `identidades-visuais.yaml` mediu os 99 takes e corrigiu: fundo preto
#      absoluto e MINORIA no genero, e o pack isolado "ficou tecnicamente correto
#      e visualmente estranho". Aqui vai colunata, templo e ruina.
#      Como consequencia, o negativo tambem muda — ver ESTOICO_NEG_VERT abaixo.
#
# COMPOSICAO VERTICAL: os 430/1920 inferiores (~22%) sao a zona da legenda no
# 9:16 (safeZones.ts > SAFE_CAPTION_BOTTOM). Por isso todo prompt empurra o
# sujeito para o terco central/superior e deixa o rodape com ambiente, nao com
# informacao. Enquadrar como no 16:9 poe o rosto debaixo da legenda.
# ═══════════════════════════════════════════════════════════════════════════

# Difere do V2 em UM ponto: saem as particulas do negativo.
# O V2 proibia "floating debris, dust specks, particles, noise, grain, speckles"
# porque a queixa do founder era sobre CLOSE EM FUNDO PRETO, onde a particula
# vira sujeira depois do codec. Em PLANO ABERTO com ambiente — que e o caso aqui
# — a rev.3 registra o oposto: "faisca branca dispersa e risco de pelicula em
# quase todo take; a particula e o acabamento do genero, nao sujeira".
# Manter o V2 aqui removeria justamente o que faz parecer o original.
ESTOICO_NEG_VERT = (
    "text, letters, words, watermark, signature, caption, subtitles, logo, "
    "extra limbs, third leg, duplicated leg, extra arm, malformed anatomy, "
    "extra fingers, fused fingers, deformed hands, "
    "floating object, unidentifiable object, tube, pipe, hollow cylinder, "
    "cut off column, floating column, duplicated column, column without base, "
    "handwriting, script, calligraphy, inscription, printed page, manuscript text, "
    "human skin, flesh, skin texture, living hands, real person, photograph of a person, "
    "misaligned architecture, broken pedestal, dark wedge artifact, "
    "colorful, saturated, cluttered, busy composition, "
    "horizontal composition, letterboxed, wide shot cropped, "
    "ceiling light, spotlight fixture, lamp, recessed light, modern lighting, "
    "circular vignette, fisheye, lens distortion, rounded corners, "
    "low quality, blurry, jpeg artifacts, cartoon, 3d render"
)

# Cauda comum: paleta e acabamento da rev.3. Fica fora de cada prompt para nao
# divergir entre eles — divergencia de cauda foi o que produziu lotes com
# temperatura diferente em 2026-08-30.
_VERT_CAUDA = (
    "desaturated muted palette, cool grey marble, amber rim light, "
    "cool blue-green shadows in the recesses, volumetric mist between the columns, "
    "shallow depth of field with softly blurred background bokeh, "
    # rev.2: "heavy vignette with crushed black corners" produziu vinheta
    # CIRCULAR de lente, com cantos arredondados visiveis. Suavizado.
    "subtle vignette darkening only the extreme corners, fine film grain, "
    "slight low angle looking up at the figure, "
    "cinematic still, high detail, no plastic sheen"
)

# (id, prompt) — 4 planos do curto LA1-P1. A ordem e a do roteiro.
CURTO_LA1P1 = [
    ("c01-busto-perfil",
     "Vertical 9:16 composition, tall frame. A classical white marble bust of a "
     "bearded stoic in sharp profile, resting on a solid rectangular marble pedestal "
     "fully in frame, placed in the upper third of the tall frame, a colonnade "
     "receding out of focus behind it, each column standing on its own visible base, "
     "warm amber light grazing the face from the side, the lower third of the frame "
     "is empty temple floor in shadow"),

    ("c02-sentado-cotovelo",
     "Vertical 9:16 composition, tall frame. A classical white marble statue of a "
     "bearded philosopher seated on a plain rectangular marble plinth, elbow resting "
     "on the knee and head lowered in thought, draped toga, exactly two legs with both "
     "bare feet flat on the plinth, complete and anatomically correct body, the figure "
     "occupying the middle of the tall frame with a temple interior and tall columns "
     "rising above it, floor in deep shadow at the bottom"),

    # rev.2 (06/09): "a single shaft of light from high above" produziu na s3 um
    # SPOT EMBUTIDO no teto, com halo -- luminaria moderna dentro de um templo
    # antigo. A luz agora entra por abertura de arquitetura, que e o que existe
    # no periodo, e o negativo passa a barrar luminaria explicitamente.
    ("c03-de-pe-templo",
     "Vertical 9:16 composition, tall frame. A classical white marble statue of a "
     "standing draped bearded figure in three-quarter view, complete and anatomically "
     "correct body standing on a plain stone base, positioned slightly left of centre, "
     "inside a temple interior with tall weathered columns rising the full height of "
     "the frame, thick volumetric mist between the columns, warm daylight entering "
     "sideways through a gap between the stone columns, no ceiling fixture"),

    # rev.2 (06/09): "low in the frame" punha a figura EXATAMENTE onde a legenda
    # entra (os 22% inferiores). Agora ela sobe para o terco medio e o rodape
    # fica com chao vazio, que a legenda pode cobrir sem perder nada.
    ("c04-ruina-ceu",
     "Vertical 9:16 composition, tall frame. Ancient marble ruins under a heavy "
     "night sky, weathered columns standing on their bases, a small distant draped "
     "marble figure standing at the MIDDLE height of the frame for scale, well above "
     "the bottom edge, the upper half filled with clouded sky and faint starlight, "
     "the bottom of the frame is empty stone pavement in shadow, "
     "cold moonlight from above, sparse white specks of dust drifting in the air"),
]

# Tres sementes por plano: a escolha e do founder, o squad nao escolhe por ele.
# 12 imagens cruas. O upscale so roda DEPOIS da escolha — gastar acabamento antes
# da inspecao estrutural e jogar fora o tempo mais caro do pipeline.
# -- NARRACAO DO CURTO ------------------------------------------------------
# Lido do disco, nao colado aqui: a fonte e o roteiro do curto, e SRT copiado
# vira SRT divergente na primeira correcao de texto.
# As tags [exag:N] sao direcao de prosodia por cue -- o hook em 0.50, a citacao
# de Marco Aurelio em 0.30. Sem isso o motor le os 57 s no mesmo tom, que e a
# queixa registrada em MEMORY 3 (9 de 10 observacoes do founder sao de
# prosodia, nao de timbre).
#
# HERE aponta para assets/comfyui; o repo esta quatro niveis acima.
_REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
_DIR_CURTOS = os.path.join(
    _REPO, "workspaces", "businesses", "virals", "creative-studio", "canais",
    "canal-estoico", "curtos")

# VARRE A PASTA em vez de listar os curtos aqui.
#
# Ate 06/09 esta secao apontava para UM curto pelo caminho completo. Escrever o
# segundo exigiria copiar o bloco inteiro, e o setimo teria sete copias que
# divergem na primeira correcao. O gatilho e o disco: curto que tem
# `01-roteiro/narracao.srt` e ainda nao tem `02-narracao/vo.mp3` entra na fila.
# Curto ja narrado fica de fora sozinho -- entao rodar o lote de novo nao
# refaz o que ja existe nem gasta a madrugada com ele.
#
# O CLONE sai de CLONE_DO_LOTE, nunca digitado: o slug comeca com o lote (LA1
# -> lote A -> ref_video_limpo.wav). Ja houve o erro de usar a ref do video 2
# no lote A (o "v2" do nome e VIDEO 2, nao versao 2), e foi o founder que pegou
# antes de custar seis narracoes.
#
# RESTRICAO CONHECIDA: o banco marca 07-narrador-estoico-clonado como
# pode_publicar: nao (clonada de video de terceiro). O founder decidiu usar nos
# curtos em 2026-09-05. A medicao da v1 -- 2 pausas em 34 min, variacao de 8
# wpm -- indica TTS e nao locutor humano, o que afasta o risco de direito de
# personalidade. Ver data/voice-packs/_INDEX.yaml, ficha 07.
_VOZES_CURTO = (("clone-v1", CLONE_DO_LOTE["LA"]),)

_pendentes = []
if os.path.isdir(_DIR_CURTOS):
    for _slug in sorted(os.listdir(_DIR_CURTOS)):
        _srt = os.path.join(_DIR_CURTOS, _slug, "01-roteiro", "narracao.srt")
        _mp3 = os.path.join(_DIR_CURTOS, _slug, "02-narracao", "vo.mp3")
        if not os.path.isfile(_srt) or os.path.isfile(_mp3):
            continue
        _pendentes.append(_slug)
        _texto = io.open(_srt, encoding="utf-8").read()
        # `LA1-p2-dificil-primeiro-60s` -> `la1-p2` (prefixo de saida no ComfyUI)
        _curto_id = "-".join(_slug.split("-")[:2]).lower()
        for _tag, _voz in _VOZES_CURTO:
            _ovr = {
                "1.value": _texto,
                "4.audio": _voz,
                "5.reference_text": "",
                "7.filename_prefix": "curtos/%s/narracao-%s" % (_curto_id, _tag),
                # clone aponta o audio de referencia e ZERA o voice_name; a voz
                # de banco faz o contrario. Trocar isso faz o no ignorar a
                # referencia em silencio -- sai audio, com a voz errada.
                "5.voice_name": ("none" if _tag.startswith("clone")
                                 else "voices_examples/male/male_02.wav"),
            }
            JOBS.append({
                "id": "curto-%s-narracao-%s" % (_curto_id, _tag),
                "workflow": "tts-narracao-srt.json",
                "nota": "Narracao 9:16 %s -- %s" % (_slug, _tag),
                "overrides": _ovr,
            })

if _pendentes:
    print("[batch] curtos sem narracao na fila: %s" % ", ".join(_pendentes))


SEMENTES_VERT = [11, 2027, 90210]

for _id, _pos in CURTO_LA1P1:
    for _n, _seed in enumerate(SEMENTES_VERT, 1):
        JOBS.append({
            "id": "curto-la1p1-%s-s%d" % (_id, _n),
            "workflow": "flux2-klein-t2i.json",
            "nota": "Curto 9:16 LA1-P1 — cru, semente %d de 3" % _n,
            "overrides": {
                "4.text": _pos + ", " + _VERT_CAUDA,
                "5.text": ESTOICO_NEG_VERT,
                "6.width": 768, "6.height": 1344,
                "7.width": 768, "7.height": 1344,
                "9.noise_seed": _seed,
                "13.filename_prefix": "curtos/la1-p1/cru/%s-s%d" % (_id, _n),
            },
        })



# ===========================================================================
# UPSCALE DAS IMAGENS DO CURTO
#
# NAO alimenta o I2V. A regra medida do squad: o quadro que entra no Wan NAO e
# o upscalado -- ele trabalha por volta de 1280x704 e joga fora o resto, entao
# upscalar antes e gastar tempo a toa. Isto aqui e FALLBACK: se um take de
# video sair deformado, o plano ainda tem uma imagem estatica em alta para o
# editor empurrar zoom.
#
# So a semente 1 de cada plano roda ANTES dos videos -- 4 imagens, ~12 min,
# garante fallback para os quatro planos. As sementes 2 e 3 vao para o FIM da
# fila: sao alternativa de alternativa, e nao valem o lugar de um take de video
# numa janela de 9h50.
# ===========================================================================

for _id_up, _pos_up in CURTO_LA1P1:
    JOBS.append({
        "id": "curto-la1p1-upscale-s1-" + _id_up,
        "workflow": "flux2-klein-lite-upscale.json",
        "nota": "Upscale LITE (fallback estatico) -- %s semente 1" % _id_up,
        "overrides": {
            "4.text": _pos_up + ", " + _VERT_CAUDA,
            "5.text": ESTOICO_NEG_VERT,
            "6.image": "curtos-la1p1/%s-s1.png" % _id_up,
            "12.filename_prefix": "curtos/la1-p1/hq/%s-s1" % _id_up,
        },
    })

# ===========================================================================
# TAKES I2V DO CURTO 9:16 -- fila da madrugada de 2026-09-05
#
# PRESET: `maximo` (4x upscale, RIFE x2 -> 32 fps, 30 passos). E o `validado`
# com o dobro de refino no sampler. NAO usar `suave`: RIFE x4 dobra o pico para
# ~17 GB e a maquina tem 16.
#
# A ORDEM E POR RODADA, NAO POR PLANO. Rodada 1 = uma semente de CADA plano.
# A janela e de ~9h50 e o timeout por job e 45 min, entao a fila pode nao
# terminar. Ordenada assim, parar no meio ainda deixa o curto montavel; ordenada
# por plano, a noite acabaria com tres versoes do plano 1 e nenhuma do resto.
#
# A IMAGEM VEM DO INPUT, copiada la pelo `copia_para_input.py` entre as duas
# fases -- o SaveImage grava em output/ e o LoadImage so le input/.
#
# CAMERA QUASE PARADA de proposito: movimento de camera e o que mais deforma no
# I2V, e em take de apoio de 4 s o ganho nao paga o risco. O que se move e a
# atmosfera (neblina, particula, luz), nao o enquadramento.
# ===========================================================================

PRESET_CURTO = os.environ.get("PRESET_CURTO", "maximo").strip().lower()

# 720x960 e o retrato MEDIDO (8,6 GB com 65 quadros). Nao e 9:16 exato: o
# studio compoe o 1080x1920 em cima. Gerar direto em 720x1280 nunca foi medido
# e uma fila noturna nao e lugar de descobrir que o pico estourou.
_W_CURTO, _H_CURTO = 720, 960
_LEN_CURTO = 65          # 65 quadros a 16 fps = ~4 s de take

NEG_CURTO_I2V = (
    "camera shake, jitter, morphing, warping architecture, melting stone, "
    "moving background elements, distorted geometry, changing face, "
    "text, watermark, subtitles, logo, extra limbs, deformed hands, "
    "human skin, flesh, real person, "
    "low quality, blurry, flicker"
)

# (plano, movimento) -- um por plano do roteiro. O movimento descreve o que a
# ATMOSFERA faz; a camera fica.
TAKES_CURTO = [
    ("c01-busto-perfil",
     "Static locked camera. The marble bust stays perfectly still. Only the "
     "amber light slowly shifts across the carved face and thin mist drifts "
     "between the out-of-focus columns behind it. No camera movement."),
    ("c02-sentado-cotovelo",
     "Static locked camera. The seated marble philosopher stays completely "
     "still, carved stone that does not move. Only faint dust particles drift "
     "in the shaft of light and the shadows deepen slowly. No camera movement."),
    ("c03-de-pe-templo",
     "Static locked camera. The standing marble figure remains motionless. "
     "Thick volumetric mist rolls slowly between the tall columns and the "
     "amber shaft of light breathes gently. No camera movement."),
    ("c04-ruina-ceu",
     "Static locked camera. The marble ruins stay fixed. Heavy clouds drift "
     "slowly across the night sky above and faint starlight flickers. The "
     "stone does not move at all. No camera movement."),
]

# Rodada externa, plano interno -- e isso que garante cobertura se a noite acabar.
# INTERCALADO POR PLANO, para comparacao pareada (pedido do founder 06/09).
#
# A rodada 1 alterna `maximo` e `validado` ENTRE OS PLANOS, e a rodada 2 inverte.
# Assim cada plano sai nos dois presets, e a comparacao e no MESMO conteudo --
# que e a unica forma de saber se os 30 passos valem os ~30 min a mais. Comparar
# preset A no plano 1 contra preset B no plano 2 mistura preset com assunto.
#
#   rodada 1:  c01 maximo | c02 validado | c03 maximo | c04 validado
#   rodada 2:  c01 validado | c02 maximo | c03 validado | c04 maximo
#   rodada 3:  tudo validado (cobertura, so se sobrar noite)
#
# Custo: 4 takes `maximo` (~90 min) + 4 `validado` (~57 min) = ~9h48 nas duas
# primeiras rodadas. A rodada 3 quase certamente nao entra, e tudo bem: ela e
# bonus, e a ordem garante que o que importa saia primeiro.
def _preset_do(rodada, indice_plano):
    if rodada == 3:
        return "validado"
    par = (indice_plano % 2 == 0)
    if rodada == 1:
        return PRESET_CURTO if par else "validado"
    return "validado" if par else PRESET_CURTO

for _rodada in (1, 2, 3):
    for _ip, (_plano, _mov) in enumerate(TAKES_CURTO):
        _preset_r = _preset_do(_rodada, _ip)
        JOBS.append({
            "id": "curto-la1p1-i2v-r%d-%s" % (_rodada, _plano),
            "workflow": "wan22-i2v-%s.json" % _preset_r,
            "nota": "I2V 9:16 %s -- rodada %d de 3 (preset %s)" % (
                _plano, _rodada, _preset_r),
            "overrides": {
                "9.image": "curtos-la1p1/%s-s%d.png" % (_plano, _rodada),
                "7.text": _mov,
                "8.text": NEG_CURTO_I2V,
                "121.length": _LEN_CURTO,
                "121.width": _W_CURTO,
                "121.height": _H_CURTO,
                "13.filename_prefix": "curtos/la1-p1/takes/%s-r%d" % (_plano, _rodada),
            },
        })


# Sementes 2 e 3 -- FIM da fila, so se a noite sobrar tempo.
for _n_up in (2, 3):
    for _id_up, _pos_up in CURTO_LA1P1:
        JOBS.append({
            "id": "curto-la1p1-upscale-s%d-%s" % (_n_up, _id_up),
            "workflow": "flux2-klein-lite-upscale.json",
            "nota": "Upscale LITE -- %s semente %d (bonus)" % (_id_up, _n_up),
            "overrides": {
                "4.text": _pos_up + ", " + _VERT_CAUDA,
                "5.text": ESTOICO_NEG_VERT,
                "6.image": "curtos-la1p1/%s-s%d.png" % (_id_up, _n_up),
                "12.filename_prefix": "curtos/la1-p1/hq/%s-s%d" % (_id_up, _n_up),
            },
        })

if __name__ == "__main__":
    main()
