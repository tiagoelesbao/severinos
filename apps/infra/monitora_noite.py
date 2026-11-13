# -*- coding: utf-8 -*-
"""Fica acordado enquanto o ComfyUI trabalha e anota o que aconteceu.

PARA QUE SERVE
  A duvida desta noite nao e estetica, e de capacidade: o LTX 22B roda numa
  4060 Ti de 8 GB com 16 GB de RAM? A conta dos pesos diz que nao. A conta pode
  estar errada -- e a unica forma de saber e deixar rodar e MEDIR.

  Sem medida, de manha so se sabe "deu" ou "nao deu". Com medida sabe-se QUANTO
  faltou, que e o que decide entre comprar pente de RAM e alugar GPU.

O QUE ELE ANOTA
  a cada 20 s   VRAM livre, RAM livre, o que esta na fila, o que esta rodando
  quando muda   entrada nova no log (nao repete linha igual -- log de 8 horas
                com 1.400 linhas iguais nao se le)
  arquivos      conta o que apareceu em output/ desde o inicio
  no fim        um resumo: pico de uso, quanto durou cada item, o que saiu

COMO SABER SE ESTOUROU
  Se o ComfyUI morrer, o endereco para de responder -- e isso fica no log com
  hora. Se ele sobreviver mas a geracao falhar, a fila esvazia sem arquivo novo.
  Os dois casos sao distinguiveis de manha.

USO
    python monitora_noite.py
    python monitora_noite.py --intervalo 30 --horas 10
"""
import argparse
import io
import json
import os
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

COMFY = "http://127.0.0.1:8188"
SAIDA = r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\output"
GB = float(2 ** 30)


def _pega(rota, tempo=8):
    try:
        with urllib.request.urlopen(COMFY + rota, timeout=tempo) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        return {"_erro": str(e)[:70]}


def conta_arquivos():
    n, recentes = 0, []
    for raiz, _, arqs in os.walk(SAIDA):
        for a in arqs:
            p = os.path.join(raiz, a)
            n += 1
            try:
                recentes.append((os.path.getmtime(p), os.path.relpath(p, SAIDA)))
            except OSError:
                pass
    recentes.sort(reverse=True)
    return n, recentes[:6]


# Os pesos do LTX estao sendo copiados do HD para o SSD enquanto isto roda. Nao
# basta o arquivo existir: o ComfyUI so oferece o modelo depois de reler a pasta.
# Entao o monitor confere as DUAS coisas e anota a hora -- de manha isso responde
# "os modelos estao prontos?" sem ninguem ter de conferir a mao.
MODELOS_D = r"D:\ComfyUI_Models"
ESPERADOS = [
    (os.path.join(MODELOS_D, "diffusion_models",
                  "ltx-2.3-22b-dev_transformer_only_fp8_scaled.safetensors"), 21_860_000_000),
    (os.path.join(MODELOS_D, "text_encoders",
                  "gemma_3_12B_it_fp8_scaled.safetensors"), 12_300_000_000),
    (os.path.join(MODELOS_D, "loras",
                  "ltx-2.3-22b-distilled-lora-384-1.1.safetensors"), 7_080_000_000),
    (os.path.join(MODELOS_D, "vae", "LTX23_video_vae_bf16.safetensors"), 1_350_000_000),
    (os.path.join(MODELOS_D, "vae", "LTX23_audio_vae_bf16.safetensors"), 340_000_000),
]


def copia_pronta():
    """(quantos prontos, total, GB que faltam)."""
    ok = falta = 0
    for caminho, tamanho in ESPERADOS:
        try:
            tem = os.path.getsize(caminho)
        except OSError:
            tem = 0
        if tem >= tamanho * 0.99:
            ok += 1
        else:
            falta += tamanho - tem
    return ok, len(ESPERADOS), falta / GB


def comfy_enxerga():
    """O modelo ja aparece na lista do UNETLoader?"""
    d = _pega("/object_info/UNETLoader", 20)
    try:
        opcoes = d["UNETLoader"]["input"]["required"]["unet_name"][0]
        if isinstance(opcoes, dict):
            opcoes = opcoes.get("options", [])
        return any("ltx-2.3-22b" in str(o) for o in opcoes)
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--intervalo", type=int, default=20)
    ap.add_argument("--horas", type=float, default=10.0)
    ap.add_argument("--log", default=os.path.join(
        os.environ.get("TEMP", "."), "noite-comfyui.log"))
    a = ap.parse_args()

    f = io.open(a.log, "a", encoding="utf-8")

    def anota(txt):
        linha = "%s  %s" % (time.strftime("%H:%M:%S"), txt)
        print(linha, flush=True)
        f.write(linha + "\n")
        f.flush()

    anota("=" * 66)
    anota("MONITOR ligado · intervalo %ds · teto %.1f h" % (a.intervalo, a.horas))
    base_n, _ = conta_arquivos()
    anota("output/ comeca com %d arquivo(s)" % base_n)

    t0 = time.time()
    fim = t0 + a.horas * 3600
    ultimo, pico_vram, pico_ram = None, 0.0, 0.0
    vazio_desde, caiu_em, copia_ok = None, None, False

    while time.time() < fim:
        st = _pega("/system_stats")
        q = _pega("/queue")

        if "_erro" in st:
            if caiu_em is None:
                caiu_em = time.time()
                anota("!! SEM RESPOSTA do ComfyUI (%s)" % st["_erro"])
                anota("   -- se nao voltar, foi queda: provavel falta de memoria")
            time.sleep(a.intervalo)
            continue
        if caiu_em is not None:
            anota("++ ComfyUI respondendo de novo apos %.0f s"
                  % (time.time() - caiu_em))
            caiu_em = None

        dev = (st.get("devices") or [{}])[0]
        vram_l = dev.get("vram_free", 0) / GB
        vram_t = dev.get("vram_total", 0) / GB
        sis = st.get("system", {})
        ram_l = sis.get("ram_free", 0) / GB
        ram_t = sis.get("ram_total", 0) / GB
        pico_vram = max(pico_vram, vram_t - vram_l)
        pico_ram = max(pico_ram, ram_t - ram_l)

        rodando = len(q.get("queue_running") or [])
        na_fila = len(q.get("queue_pending") or [])
        agora_n, recentes = conta_arquivos()
        novos = agora_n - base_n

        estado = ("rodando %d · fila %d · novos %d · VRAM %.1f/%.1f · RAM %.1f/%.1f"
                  % (rodando, na_fila, novos, vram_t - vram_l, vram_t,
                     ram_t - ram_l, ram_t))
        if estado != ultimo:
            anota(estado)
            ultimo = estado

        if not copia_ok:
            n_ok, n_tot, falta_gb = copia_pronta()
            if n_ok >= n_tot:
                copia_ok = True
                anota("== COPIA DOS MODELOS LTX COMPLETA (%d/%d)" % (n_ok, n_tot))
                anota("   ComfyUI ja enxerga o 22B: %s"
                      % ("SIM" if comfy_enxerga() else
                         "ainda nao — aperte R na aba do ComfyUI de manha"))
            elif int(time.time() - t0) % 300 < a.intervalo:
                anota("copia: %d/%d prontos · faltam %.1f GB" % (n_ok, n_tot, falta_gb))

        if rodando == 0 and na_fila == 0:
            if vazio_desde is None:
                vazio_desde = time.time()
                anota("fila VAZIA — %d arquivo(s) novo(s) ate aqui" % novos)
                for _, r in recentes[:4]:
                    anota("   %s" % r)
            elif time.time() - vazio_desde > 600:
                anota("fila vazia ha 10 min — encerrando o monitor")
                break
        else:
            vazio_desde = None
        time.sleep(a.intervalo)

    agora_n, recentes = conta_arquivos()
    anota("-" * 66)
    anota("FIM · %.1f h de vigilia" % ((time.time() - t0) / 3600))
    anota("pico de VRAM %.1f GB · pico de RAM %.1f GB" % (pico_vram, pico_ram))
    anota("%d arquivo(s) novo(s) em output/" % (agora_n - base_n))
    for _, r in recentes:
        anota("   %s" % r)
    f.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
