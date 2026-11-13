# -*- coding: utf-8 -*-
"""Gera a fala de um take com a voz CLONADA, pelo ChatterBox.

POR QUE CLONAR E NAO USAR O AUDIO DO LTX
  O LTX gera audio junto com o video, mas inventa a voz: a amostra do Bruno
  entra so como referencia de TIMBRE, e o `LTXVReferenceAudio` que a usaria
  vive no pipeline de dois estagios, que nao roda nesta placa. O que sai e
  uma voz plausivel e alheia.

  O ChatterBox clona de verdade a partir de um wav de 4 segundos, e ja foi
  validado aqui em outro canal: `narra_comfy.py` documenta a comparacao que
  descartou o Piper.

A CADEIA, QUE E CURTA
  LoadAudio(amostra)  ->  CharacterVoicesNode  ->  opt_narrator
  ChatterBoxEngine    ->  UnifiedTTSTextNode   ->  SaveAudio

  `voice_name` PRECISA ficar em `none`. Com um nome de banco ali, o no ignora
  o audio de referencia em silencio -- e a voz sai perfeita, so que de outra
  pessoa.

OS PARAMETROS QUE IMPORTAM
  exaggeration   quanto de teatro. 0.5 e o default; 0.4 e o que o canal de
                 futebol usa para plantao. Para um hook de peca com pausa
                 dramatica, 0.45 segura a intencao sem virar locucao de bula.
  temperature    variacao entre execucoes. Menor = leitura mais firme e mais
                 repetivel, que e o que se quer quando o take ja existe e o
                 audio precisa CABER nele.
  cfg_weight     adesao ao texto e ao timbre de referencia.

USO
    python voz_do_take.py --projeto imperio --take 1
    python voz_do_take.py --projeto imperio --todos
    python voz_do_take.py --texto "Esse ano... vai ser diferente." --saida hook
"""
import argparse
import json
import os
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

COMFY = "http://127.0.0.1:8188"
ENTRADA = r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\input"


def http(rota, dados=None):
    url = COMFY + rota
    if dados is None:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.loads(r.read())
    corpo = json.dumps(dados).encode()
    req = urllib.request.Request(url, data=corpo,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        # O ComfyUI devolve 400 com o motivo NO CORPO. Sem ler o corpo, o
        # traceback so diz "Bad Request" e esconde qual entrada ele recusou.
        det = e.read().decode("utf-8", "replace")
        try:
            d = json.loads(det)
            erro = d.get("error") or {}
            print("ComfyUI recusou o prompt: %s" % erro.get("message", "")[:120])
            if erro.get("details"):
                print("   %s" % str(erro["details"])[:200])
            for no, info in (d.get("node_errors") or {}).items():
                for x in info.get("errors", []):
                    print("   no %s: %s -- %s" % (no, x.get("message"),
                                                  str(x.get("details"))[:90]))
        except Exception:
            print(det[:400])
        raise SystemExit(1)


def monta(texto, amostra, prefixo, a):
    """O prompt da API, no formato que o /prompt espera."""
    return {
        "1": {"class_type": "LoadAudio",
              "inputs": {"audio": amostra}},
        "2": {"class_type": "CharacterVoicesNode",
              "inputs": {
                  # `none` e obrigatorio: com um nome de banco aqui, o no
                  # ignora `opt_audio_input` sem reclamar e devolve outra voz
                  "voice_name": "none",
                  "reference_text": "",
                  "trim_start": 0.0, "trim_end": 0.0,
                  "customized": False,
                  "opt_audio_input": ["1", 0]}},
        "3": {"class_type": "ChatterBoxOfficial23LangEngineNode",
              "inputs": {
                  "model_version": a.modelo,
                  "language": "Portuguese",
                  "device": "auto",
                  "exaggeration": a.exaggeration,
                  "temperature": a.temperature,
                  "cfg_weight": a.cfg,
                  "repetition_penalty": 1.2,
                  # os defaults do proprio no; o ComfyUI exige TODOS os
                  # campos obrigatorios no prompt da API, mesmo os que a
                  # interface preenche sozinha
                  "min_p": 0.05,
                  "top_p": 1.0}},
        "4": {"class_type": "UnifiedTTSTextNode",
              "inputs": {
                  "TTS_engine": ["3", 0],
                  "text": texto,
                  "narrator_voice": "none",
                  "seed": a.seed,
                  "opt_narrator": ["2", 0],
                  # uma frase curta nao deve ser fatiada: chunk quebra a
                  # prosodia no meio, e prosodia cortada nao se remenda
                  "enable_chunking": False}},
        "5": {"class_type": "SaveAudio",
              "inputs": {"audio": ["4", 0], "filename_prefix": prefixo}},
    }


def espera(pid, limite=900):
    t0 = time.time()
    while time.time() - t0 < limite:
        h = http("/history/%s" % pid)
        if pid in h:
            st = h[pid].get("status", {})
            if st.get("completed"):
                return h[pid]
            if st.get("status_str") == "error":
                for m in st.get("messages", []):
                    if m[0] == "execution_error":
                        raise SystemExit("erro: %s"
                                         % str(m[1].get("exception_message"))[:180])
                raise SystemExit("erro na execucao")
        time.sleep(3)
    raise SystemExit("passou de %d s sem terminar" % limite)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--projeto", default="imperio")
    ap.add_argument("--take", type=int, default=None)
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--texto", default=None, help="ignora o projeto")
    ap.add_argument("--saida", default=None)
    ap.add_argument("--amostra", default=None,
                    help="wav de referencia em input/ (padrao: o do projeto)")
    ap.add_argument("--exaggeration", type=float, default=0.45)
    ap.add_argument("--temperature", type=float, default=0.7)
    ap.add_argument("--cfg", type=float, default=0.5)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--modelo", default="v3")
    a = ap.parse_args()

    try:
        http("/queue")
    except Exception:
        raise SystemExit("ComfyUI nao responde em %s" % COMFY)

    if a.texto:
        tarefas = [(0, a.texto, a.saida or "voz/avulsa")]
        amostra = a.amostra or "voz-ref-04.wav"
    else:
        from projeto import carrega
        pr = carrega(a.projeto)
        amostra = a.amostra or pr.voz
        falas = [(n, f) for n, _, _, _, _, f, _ in pr.takes if str(f).strip()]
        if a.take is not None:
            falas = [(n, f) for n, f in falas if n == a.take]
            if not falas:
                raise SystemExit("take %d nao tem fala" % a.take)
        elif not a.todos:
            raise SystemExit("informe --take N, --todos ou --texto")
        tarefas = [(n, f, "voz/%s-take%02d" % (pr.nome, n)) for n, f in falas]

    if not os.path.isfile(os.path.join(ENTRADA, amostra)):
        raise SystemExit("amostra nao esta em input/: %s" % amostra)

    print("voz de referencia: %s" % amostra)
    print("modelo %s · exaggeration %.2f · temperature %.2f · cfg %.2f\n"
          % (a.modelo, a.exaggeration, a.temperature, a.cfg))

    for n, texto, prefixo in tarefas:
        print("take %s: %r" % (n or "-", texto[:56]))
        r = http("/prompt", {"prompt": monta(texto, amostra, prefixo, a)})
        pid = r.get("prompt_id")
        if not pid:
            print("   nao enfileirou: %s" % str(r)[:120])
            continue
        t0 = time.time()
        hist = espera(pid)
        arqs = []
        for saida in hist.get("outputs", {}).values():
            for k in ("audio", "audios"):
                for it in saida.get(k, []) or []:
                    arqs.append(it.get("filename"))
        print("   %s  (%.0f s)" % (", ".join(arqs) or "sem arquivo",
                                   time.time() - t0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
