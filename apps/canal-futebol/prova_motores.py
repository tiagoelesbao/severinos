# -*- coding: utf-8 -*-
"""Banco de provas de locucao — quatro motores, a MESMA frase, medida de volta.

POR QUE MEDIR EM VEZ DE OUVIR PRIMEIRO
  A primeira prova do ChatterBox soou boa e COMEU UMA FRASE INTEIRA. Ouvido nao
  pega isso num audio de doze segundos, quanto mais em treze minutos. O que pega
  e transcrever o audio de volta e comparar com o que foi mandado — a mesma
  tecnica de WER que o banco de vozes do squad ja usa.

  Entao a ordem e: mede, descarta o que corrompe texto, e SO ENTAO o ouvido
  escolhe entre os que sobraram. Ouvido decide estetica; medicao decide se o
  motor esta dizendo o que voce escreveu.

A FRASE DE PROVA NAO E NEUTRA
  Ela carrega de proposito as tres coisas que quebraram na primeira rodada:
    · nome proprio          "Abel Ferreira" virou "Ah, a Belferreira"
    · travessao             suspeito de confundir o tokenizer
    · numero por extenso    "quarenta e oito milhoes e trezentos e trinta mil"
  Motor que passa nesses tres passa no roteiro inteiro.

OS MOTORES QUE FALAM PORTUGUES
  Consultados no /object_info da instalacao, nao presumidos:
    ChatterBoxOfficial23Lang  model_version 'Brazilian Portuguese (ResembleAI)'
    Qwen3TTS                  language Portuguese
    MossTTS                   language Portuguese
    DotsTTS                   language Portuguese
  F5-TTS tem 12 idiomas e nenhum e portugues na lista deste no.

Uso:
    python prova_motores.py                 roda todos
    python prova_motores.py --so chatterbox
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
COMFY_DIR = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio",
                         "assets", "comfyui")
sys.path.insert(0, COMFY_DIR)
SAIDA_COMFY = os.path.join(r"C:" + os.sep, "Users", "Pichau", "Desktop",
                           "ComfyUI_windows_portable", "ComfyUI", "output")
DEST = os.path.join(AQUI, "provas-voz")
API = "http://127.0.0.1:8188"

FRASE = ("Abel Ferreira está fora. O Superior Tribunal de Justiça Desportiva "
         "puniu o técnico do Palmeiras com duas partidas de suspensão — e a "
         "punição saiu por um chute num microfone. A classificação garante ao "
         "clube mais nove milhões de reais, e faz o Palmeiras acumular quarenta "
         "e oito milhões e trezentos e trinta mil reais em premiações.")

# `id` do teste → (classe do no do motor, ajustes). Os defaults do proprio no
# sao mantidos exceto onde ha razao declarada: mexer em tudo de uma vez impede
# saber o que causou o que.
MOTORES = [
    # (id, classe, ajustes do motor, voz de referencia)
    #
    # O `model_variant` e SEMPRE explicito. Deixar o codigo pegar o primeiro item
    # do enum escolheu, no Qwen3, um modelo de CLONAGEM — que sem referencia
    # devolve silencio. Escolher por posicao no enum e escolher por sorte.
    ("chatterbox-v3", "ChatterBoxOfficial23LangEngineNode",
     {"model_version": "v3", "language": "Portuguese"}, "none"),
    ("chatterbox-ptbr", "ChatterBoxOfficial23LangEngineNode",
     {"model_version": "Brazilian Portuguese (ResembleAI)", "language": "Portuguese"}, "none"),

    # Qwen3 tem vozes PRONTAS na variante CustomVoice — sem referencia e sem
    # questao de direito de voz. Ryan e Eric sao as masculinas do conjunto.
    ("qwen3-ryan", "Qwen3TTSEngineNode",
     {"model_variant": "TTS - CustomVoice 1.7B (Presets + Instruction)",
      "voice_preset": "Ryan", "language": "Portuguese"}, "none"),
    ("qwen3-eric", "Qwen3TTSEngineNode",
     {"model_variant": "TTS - CustomVoice 1.7B (Presets + Instruction)",
      "voice_preset": "Eric", "language": "Portuguese"}, "none"),
    # a variante de clonagem, agora COM referencia
    ("qwen3-clone", "Qwen3TTSEngineNode",
     {"model_variant": "TTS - Base 1.7B (Voice Clone)",
      "voice_preset": "None (Zero-shot / Custom)", "language": "Portuguese"},
     "voices_examples/male/male_01.wav"),

    ("moss", "MossTTSEngineNode",
     {"model_variant": "1.7B", "language": "Portuguese"},
     "voices_examples/male/male_01.wav"),
    ("dots", "DotsTTSEngineNode",
     {"model_variant": "dots.tts-base", "language": "Portuguese"},
     "voices_examples/male/male_01.wav"),
]


def _norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]", " ", t).split()


def wer(esperado, dito):
    """Taxa de erro de palavra por distancia de edicao. E a medida do banco de
    vozes do squad, e ela mede FIDELIDADE AO TEXTO — nao sotaque nem estetica."""
    a, b = _norm(esperado), _norm(dito)
    d = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        d[i][0] = i
    for j in range(len(b) + 1):
        d[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1,
                          d[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    return 100.0 * d[len(a)][len(b)] / max(1, len(a))


def _srt(texto):
    return "1\n00:00:00,000 --> 00:00:30,000\n%s\n" % texto


def monta_prompt(classe, ajustes, prefixo, objinfo, narrador="none"):
    """Grafo minimo: motor → UnifiedTTSSRT (concatenate) → SaveAudio.

    Montado a mao, e nao a partir do workflow salvo, porque o workflow tem o
    ramo de voz clonada (LoadAudio + CharacterVoices) que so serve para
    referencia — e nenhum destes testes usa referencia.
    """
    req = objinfo[classe]["input"]["required"]
    motor = {}
    for k, v in req.items():
        if k in ajustes:
            motor[k] = ajustes[k]
        elif isinstance(v[0], list):
            motor[k] = v[0][0]
        elif len(v) > 1 and isinstance(v[1], dict) and "default" in v[1]:
            motor[k] = v[1]["default"]
    return {
        "1": {"class_type": classe, "inputs": motor},
        "2": {"class_type": "UnifiedTTSSRTNode", "inputs": {
            "TTS_engine": ["1", 0], "srt_content": _srt(FRASE),
            "narrator_voice": narrador, "seed": 42, "timing_mode": "concatenate"}},
        "3": {"class_type": "SaveAudio", "inputs": {
            "audio": ["2", 0], "filename_prefix": prefixo}},
    }


def espera(pid, limite_s=900):
    t0 = time.time()
    while time.time() - t0 < limite_s:
        try:
            h = json.load(urllib.request.urlopen("%s/history/%s" % (API, pid), timeout=20))
        except Exception:
            time.sleep(4)
            continue
        if h.get(pid):
            st = h[pid].get("status", {})
            if st.get("completed") or st.get("status_str") == "error":
                return h[pid]
        time.sleep(6)
    return None


def acha_saida(hist):
    for _, s in (hist.get("outputs") or {}).items():
        for _, itens in s.items():
            for it in (itens if isinstance(itens, list) else []):
                if isinstance(it, dict) and it.get("filename", "").endswith((".flac", ".wav", ".mp3")):
                    sub = (it.get("subfolder") or "").replace("\\", os.sep)
                    p = os.path.join(SAIDA_COMFY, sub, it["filename"])
                    if os.path.isfile(p):
                        return p
    return None


def transcreve(mp3, modelo):
    w = mp3 + ".16k.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ac", "1",
                    "-ar", "16000", "-c:a", "pcm_s16le", w], timeout=180)
    segs, _ = modelo.transcribe(w, language="pt", vad_filter=False)
    t = " ".join(s.text.strip() for s in segs)
    os.remove(w)
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so")
    a = ap.parse_args()
    os.makedirs(DEST, exist_ok=True)

    import run_batch as rb
    objinfo = rb.get("/object_info")
    alvo = [m for m in MOTORES if not a.so or a.so in m[0]]
    print("%d motores · %d palavras na frase de prova\n" % (len(alvo), len(FRASE.split())))

    resultados = []
    for nome, classe, ajustes, narrador in alvo:
        if classe not in objinfo:
            print("  %-16s classe ausente nesta instalação" % nome)
            continue
        prefixo = "boradebola/_provas/%s" % nome
        t0 = time.time()
        try:
            r = rb.post("/prompt", {"prompt": monta_prompt(
                classe, ajustes, prefixo, objinfo, narrador)})
        except urllib.error.HTTPError as e:
            d = json.loads(e.read().decode("utf-8", "replace"))
            print("  %-16s recusado: %s" % (nome, str(d.get("node_errors"))[:90]))
            continue
        h = espera(r.get("prompt_id"))
        if not h:
            print("  %-16s estourou o tempo" % nome)
            continue
        if h.get("status", {}).get("status_str") == "error":
            print("  %-16s erro na execução" % nome)
            continue
        p = acha_saida(h)
        if not p:
            print("  %-16s não devolveu áudio" % nome)
            continue
        mp3 = os.path.join(DEST, "%s.mp3" % nome)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p, "-c:a",
                        "libmp3lame", "-b:a", "192k", mp3], timeout=180)
        dur = float(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", mp3], capture_output=True, text=True).stdout.strip() or 0)
        if dur < 2.0:
            # Menos de 2 s para uma frase de 50 palavras nao e "leitura rapida",
            # e audio vazio. Reportar como vazio evita que ele apareca na tabela
            # como se fosse um motor com fidelidade ruim.
            print("  %-16s VAZIO (%.1fs) — modelo provavelmente não carregou"
                  % (nome, dur))
            continue
        resultados.append({"nome": nome, "mp3": mp3, "dur": dur,
                           "gerou_em": time.time() - t0})
        print("  %-16s %5.1fs de áudio · gerado em %.0fs" % (nome, dur, time.time() - t0))

    if not resultados:
        print("\nnenhum motor produziu áudio")
        return 1

    print("\ntranscrevendo de volta para medir fidelidade...")
    from faster_whisper import WhisperModel
    wm = WhisperModel("small", device="cpu", compute_type="int8")
    for r in resultados:
        r["dito"] = transcreve(r["mp3"], wm)
        r["wer"] = wer(FRASE, r["dito"])
        r["ppm"] = len(FRASE.split()) / (r["dur"] / 60.0) if r["dur"] else 0

    print("\n%-16s %7s %8s %9s  %s" % ("MOTOR", "WER", "DURAÇÃO", "P/MIN", "VEREDITO"))
    print("─" * 92)
    for r in sorted(resultados, key=lambda x: x["wer"]):
        v = ("descartar" if r["wer"] > 15 else
             "ouvir" if r["wer"] > 6 else "candidato")
        print("%-16s %6.1f%% %7.1fs %9.1f  %s" % (r["nome"], r["wer"], r["dur"],
                                                  r["ppm"], v))
    print("\ntranscrição de cada um:")
    for r in sorted(resultados, key=lambda x: x["wer"]):
        print("\n  ── %s (WER %.1f%%)" % (r["nome"], r["wer"]))
        print("     %s" % r["dito"][:230])
    print("\náudios em %s" % DEST)
    return 0


if __name__ == "__main__":
    sys.exit(main())
