# -*- coding: utf-8 -*-
"""
Smoke test do stack de áudio local — Stable Audio Open + ACE-Step.

POR QUE ESTE ARQUIVO EXISTE
Os dois modelos foram baixados e os dois workflows foram validados estruturalmente
contra o /object_info real, mas NENHUMA amostra foi gerada: no momento da instalação
a máquina tinha 5,68 GiB de RAM livre e o Stable Audio Open sozinho pede ~5,7 GiB
(checkpoint 4,52 GiB + encoder T5 0,83 GiB) antes de subir para a placa. Rodar ali
seria medir errado. Este script é o teste que ficou pendente, pronto para a janela
de render noturno — que é o modo de operação padrão desta casa.

O QUE ELE FAZ
  (a) leito instrumental de ~30s para peça publicitária de hospedagem  -> Teste A
  (b) trecho musical curto com letra e vocal                           -> Teste C
Salva em assets/comfyui/samples/ seguindo o padrão NN-engine-descricao.

COMO RODAR
  1. Feche tudo. Suba o ComfyUI:
     C:\\Users\\Pichau\\Desktop\\ComfyUI_windows_portable\\run_nvidia_gpu.bat
  2. C:\\...\\python_embeded\\python.exe smoke-test-audio.py

O script ABORTA sozinho se houver menos de 6 GiB de RAM livre. Isso é proposital:
com sessão concorrente aberta ele atropela a outra frente e mede errado.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

COMFY = "http://127.0.0.1:8188"
HERE = os.path.dirname(os.path.abspath(__file__))
WF_DIR = os.path.join(HERE, "workflows")
SAMPLES = os.path.join(HERE, "samples")
RAM_MINIMA_GIB = 6.0

# Pasta output do ComfyUI (de onde colhemos o arquivo gerado)
COMFY_OUTPUT = r"C:/Users/Pichau/Desktop/ComfyUI_windows_portable/ComfyUI/output"

# ---------------------------------------------------------------------------
# Os dois jobs
# ---------------------------------------------------------------------------
JOBS = [
    {
        "nome": "09-stableaudio-leito-hospedagem-30s",
        "workflow": "audio-trilha-sfx.json",
        "subs": {
            "{{PROMPT_AUDIO}}": (
                "warm acoustic guitar and soft felt piano, gentle uplifting advertising "
                "bed, light brushed percussion, airy pads, welcoming and hopeful, "
                "spacious reverb, 95 bpm, instrumental, no vocals"
            ),
            "{{DURACAO_S}}": 30.0,
            "{{JOB}}": "smoke-audio",
            "{{PECA}}": "leito-hospedagem",
        },
        "espera": "leito instrumental de 30s, peça de hospedagem (Teste A)",
    },
    {
        "nome": "10-acestep-trecho-dark-ptbr",
        "workflow": "audio-musica-acestep.json",
        "subs": {
            "{{ESTILO}}": (
                "dark cinematic, deep male vocals, slow tempo, cello, sub bass, "
                "atmospheric pads, melancholic, stoic, sparse drums, minor key"
            ),
            "{{LETRA}}": (
                "[verse]\n"
                "O que resiste ao tempo nao faz ruido,\n"
                "some no escuro e volta inteiro.\n"
                "[chorus]\n"
                "Fica de pe, fica de pe,\n"
                "o que te queima e o que te faz."
            ),
            "{{DURACAO_S}}": 30.0,
            "{{JOB}}": "smoke-audio",
            "{{FAIXA}}": "trecho-dark",
        },
        "espera": "trecho musical curto com vocal, nicho dark (Teste C)",
    },
]


# ---------------------------------------------------------------------------
# Guardas
# ---------------------------------------------------------------------------
def ram_livre_gib():
    import ctypes

    class MS(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
            ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]

    st = MS()
    st.dwLength = ctypes.sizeof(MS)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(st))
    return st.ullAvailPhys / 2 ** 30


def get(path):
    with urllib.request.urlopen(COMFY + path, timeout=15) as r:
        return json.load(r)


def guardas():
    ram = ram_livre_gib()
    print(f"RAM livre: {ram:.2f} GiB (minimo exigido: {RAM_MINIMA_GIB:.1f} GiB)")
    if ram < RAM_MINIMA_GIB:
        sys.exit(
            f"ABORTADO: {ram:.2f} GiB livres. O Stable Audio Open pede ~5,7 GiB so para\n"
            "carregar checkpoint + encoder. Feche a sessao concorrente e rode na janela noturna."
        )
    try:
        st = get("/system_stats")
    except Exception as e:
        sys.exit(f"ABORTADO: ComfyUI nao responde em {COMFY} ({e}). Suba com run_nvidia_gpu.bat.")
    dev = st["devices"][0]
    print(f"ComfyUI {st['system']['comfyui_version']} | torch {st['system']['pytorch_version']}")
    print(f"VRAM livre: {dev['vram_free'] / 2 ** 30:.2f} GiB de {dev['vram_total'] / 2 ** 30:.2f} GiB")

    # trava do ambiente: um downgrade aqui quebra o Wan que ja funciona
    import numpy
    import torch
    assert numpy.__version__.startswith("2.2."), f"numpy {numpy.__version__} != 2.2.x"
    assert torch.__version__.startswith("2.13.0+cu126"), f"torch {torch.__version__} inesperado"
    print(f"travas OK: numpy {numpy.__version__} | torch {torch.__version__}")


# ---------------------------------------------------------------------------
# Conversao do formato UI (grafo salvo) para o formato API (/prompt)
# ---------------------------------------------------------------------------
WIDGET_SCALARS = {"INT", "FLOAT", "STRING", "BOOLEAN", "COMBO"}


def widget_names(cls, oi):
    """Nomes de widget na ordem em que o frontend os serializa."""
    nomes = []
    for section in ("required", "optional"):
        for name, spec in oi[cls]["input"].get(section, {}).items():
            if not isinstance(spec, list) or not spec:
                continue
            t = spec[0]
            if isinstance(t, list) or t in WIDGET_SCALARS:
                nomes.append(name)
                opts = spec[1] if len(spec) > 1 and isinstance(spec[1], dict) else {}
                if opts.get("control_after_generate"):
                    nomes.append(None)  # placeholder: nao vai para a API
    return nomes


def ui_para_api(wf, oi):
    prompt = {}
    links = {l[0]: l for l in wf["links"]}
    for n in wf["nodes"]:
        cls = n["type"]
        inputs = {}
        for name, val in zip(widget_names(cls, oi), n.get("widgets_values", [])):
            if name is not None:
                inputs[name] = val
        for inp in n.get("inputs", []):
            lk = inp.get("link")
            if lk is not None:
                _, onode, oslot, _, _, _ = links[lk]
                inputs[inp["name"]] = [str(onode), oslot]
        prompt[str(n["id"])] = {"class_type": cls, "inputs": inputs}
    return prompt


def substituir(obj, subs):
    if isinstance(obj, str):
        for k, v in subs.items():
            if obj == k:
                return v            # substituicao total preserva o tipo (float)
            obj = obj.replace(k, str(v))
        return obj
    if isinstance(obj, list):
        return [substituir(x, subs) for x in obj]
    if isinstance(obj, dict):
        return {k: substituir(v, subs) for k, v in obj.items()}
    return obj


# ---------------------------------------------------------------------------
def enfileirar(prompt):
    data = json.dumps({"prompt": prompt}).encode()
    req = urllib.request.Request(
        COMFY + "/prompt", data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)["prompt_id"]
    except urllib.error.HTTPError as e:
        sys.exit("ComfyUI RECUSOU o grafo:\n" + e.read().decode(errors="replace"))


def aguardar(pid, timeout=3600):
    t0 = time.time()
    while time.time() - t0 < timeout:
        h = get(f"/history/{pid}")
        if pid in h:
            st = h[pid]["status"]
            if st.get("status_str") == "error" or not st.get("completed", True):
                if st.get("status_str") == "error":
                    print(json.dumps(st, indent=2)[:2000])
                    sys.exit("ERRO na execucao")
            return h[pid], time.time() - t0
        time.sleep(3)
    sys.exit("TIMEOUT")


def main():
    guardas()
    os.makedirs(SAMPLES, exist_ok=True)
    oi = get("/object_info")
    print()

    for job in JOBS:
        print("=" * 70)
        print(f"{job['nome']} -> {job['espera']}")
        wf = json.load(open(os.path.join(WF_DIR, job["workflow"]), encoding="utf-8"))
        prompt = substituir(ui_para_api(wf, oi), job["subs"])

        pid = enfileirar(prompt)
        print(f"  enfileirado: {pid} — aguardando (pode levar minutos)...")
        hist, seg = aguardar(pid)
        print(f"  concluido em {seg:.0f}s")

        for out in hist["outputs"].values():
            for a in out.get("audio", []):
                src = os.path.join(COMFY_OUTPUT, a.get("subfolder", ""), a["filename"])
                ext = os.path.splitext(a["filename"])[1]
                dst = os.path.join(SAMPLES, job["nome"] + ext)
                with open(src, "rb") as fi, open(dst, "wb") as fo:
                    fo.write(fi.read())
                print(f"  salvo: {dst} ({os.path.getsize(dst)} bytes)")

    print("\nPronto. Ouvir as amostras e, se aproveitaveis em job real,")
    print("promover o status de 'instalado' para 'validado' no local-generation-stack.yaml.")


if __name__ == "__main__":
    main()
