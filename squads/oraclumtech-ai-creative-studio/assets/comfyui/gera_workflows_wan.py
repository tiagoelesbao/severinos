# -*- coding: utf-8 -*-
"""Gera os presets de I2V do Wan a partir do fluxo validado pelo founder.

O FLUXO BASE E O QUE ELE JA VALIDOU
  Wan 2.2 I2V A14B (dois GGUF Q4) -> VAEDecode -> upscale por modelo -> RIFE VFI
  -> CreateVideo -> SaveVideo. Nao ha nada a inventar aqui; ha o que PARAMETRIZAR.

A CONTA DE MEMORIA, QUE E O QUE DECIDE TUDO
  O pico esta na saida do RIFE: ele segura TODOS os quadros interpolados, ja
  ampliados, na precisao escolhida.

      pico = (frames x multiplicador) x (L x A x fator_upscale^2) x 3 x bytes_dtype

  Com 65 quadros, 4x sobre 960x720 e float32 isso da 17,3 GB — e a maquina tem 16.
  Foi o que travou. Mas `dtype` do RIFE aceita 16 bits, e isso METADE a conta.

  USE `bfloat16`, NAO `float16`. A conta de memoria e identica — 16 bits nos
  dois —, mas o comentario dentro do proprio no diz que bfloat16 e mais seguro
  em GPUs Ampere+ (a nossa e uma RTX 4060 Ti). Em 31/08 o float16 derrubou o
  ComfyUI inteiro com `access violation` na linha 227 do RIFE: crash nativo, nao
  OOM. A tabela abaixo continua valendo para os dois.

  | geracao  | quadros | upscale | dtype   | saida      | pico    |
  |----------|--------:|--------:|---------|------------|--------:|
  | 720x960  |      65 |      4x | float32 | 2880x3840  | 17,3 GB | ESTOURA
  | 720x960  |      65 |      4x | bf16    | 2880x3840  |  8,6 GB | ok
  | 720x960  |      49 |      4x | bf16    | 2880x3840  |  6,4 GB | folgado
  | 832x1120 |      65 |      4x | bf16    | 3328x4480  | 11,6 GB | arriscado
  | 832x1120 |      65 |      2x | bf16    | 1664x2240  |  2,9 GB | folgado

  A troca real e: **pixel de UPSCALE e barato e interpolado; pixel de GERACAO e
  caro e verdadeiro.** O preset `nitido` aposta no segundo.

A REGRA DE FPS
  O Wan 2.2 entrega **16 fps**. O RIFE multiplica os quadros, nao o tempo. Entao:

      fps do CreateVideo = 16 x multiplicador do RIFE

  multiplicador 2 -> 32 fps (o que o founder validou, e esta certo)
  multiplicador 4 -> 64 fps
  Usar 32 fps com multiplicador 4 nao da erro: da CAMERA LENTA pela metade. E uma
  escolha legitima, mas precisa ser escolha.

Uso:  python gera_workflows_wan.py
"""
import copy, io, json, os

AQUI = os.path.dirname(os.path.abspath(__file__))
WF = os.path.join(AQUI, "workflows")
BASE = os.path.join(WF, "wan22-i2v-max.json")

# (nome, fator_upscale, multiplicador_rife, dtype_rife, passos, descricao)
PRESETS = [
    ("wan22-i2v-validado", 4, 2, "bfloat16", 20,
     "O fluxo do founder, com uma correcao: RIFE em bfloat16 em vez de float32. "
     "Mesma saida visual, metade da memoria — e e o que faz 65 quadros caberem."),
    ("wan22-i2v-nitido", 2, 2, "bfloat16", 30,
     "Menos upscale, mais geracao. Roda a 832x1120 com 30 passos: o pixel vem do "
     "modelo e nao da ampliacao, e mais passos e o unico ajuste que melhora "
     "coerencia de movimento. E o preset para take com camera em movimento."),
    ("wan22-i2v-maximo", 4, 2, "bfloat16", 30,
     "QUALIDADE MAXIMA segura. E o `validado` com os 30 passos do `nitido`: "
     "upscale 4x e RIFE x2, mas o dobro de refino no sampler. O pico de memoria "
     "NAO muda -- passos nao entram na formula do pico, que e "
     "(frames x mult) x (L x A x fator^2) x 3 x bytes. Continua nos 8,6 GB "
     "medidos do validado. O que muda e o tempo por take. "
     "Preferido ao `suave`: aquele usa RIFE x4, que DOBRA o pico para ~17 GB e "
     "nao cabe nos 16 da maquina com 65 quadros."),

    ("wan22-i2v-suave", 4, 4, "bfloat16", 20,
     "Interpolacao 4x para 64 fps. Movimento mais liquido; custa o dobro de "
     "memoria no RIFE. So para take curto."),
]


def carrega():
    return json.load(io.open(BASE, encoding="utf-8"))


def gera(nome, fator, mult, dtype, passos, desc):
    d = carrega()
    por_id = {n["id"]: n for n in d["nodes"]}

    # upscale: 4x-UltraSharp para 4x, RealESRGAN_x2plus para 2x
    por_id[137]["widgets_values"] = ["4x-UltraSharp.pth" if fator == 4
                                     else "RealESRGAN_x2plus.pth"]

    # RIFE: [ckpt, clear_cache, multiplier, fast_mode, ensemble, scale_factor,
    #        dtype, torch_compile, batch_size]
    r = por_id[138]["widgets_values"]
    r[2] = mult
    r[6] = dtype
    # cache menor segura menos quadro na memoria de uma vez
    r[1] = 6

    # fps = 16 (nativo do Wan) x multiplicador. Nao e opcional: errar aqui muda a
    # velocidade do video, nao a qualidade.
    por_id[130]["widgets_values"][0] = 16 * mult

    for n in d["nodes"]:
        if n["type"] == "KSamplerAdvanced":
            w = n["widgets_values"]
            w[3] = passos
            corte = max(1, round(passos * 0.3))
            if w[7] == 0:
                w[8] = corte
            else:
                w[7], w[8] = corte, passos

    d["id"] = "oraclum-" + nome
    dest = os.path.join(WF, nome + ".json")
    json.dump(d, io.open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("  %-24s upscale %dx · RIFE x%d %s · %d passos · %d fps"
          % (nome, fator, mult, dtype, passos, 16 * mult))
    return dest


def gera_superres():
    """Super-resolucao FIEL da foto de origem — sem difusao, sem invencao.

    A foto do imovel nao pode ser alterada: peca de hospedagem que mostra um lugar
    que nao existe e propaganda enganosa. Por isso este grafo NAO passa modelo de
    difusao: e so ESRGAN, que amplia e limpa artefato de compressao sem redesenhar.
    RealESRGAN_x2plus e o mais conservador dos dois que temos.
    """
    nodes = [
        {"id": 1, "type": "LoadImage", "pos": [40, 60], "size": [340, 320], "flags": {},
         "order": 0, "mode": 0, "inputs": [],
         "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [1], "slot_index": 0},
                     {"name": "MASK", "type": "MASK", "links": [], "slot_index": 1}],
         "properties": {"Node name for S&R": "LoadImage"},
         "widgets_values": ["{{IMAGEM}}", "image"],
         "title": "1 - Foto original do imovel"},
        {"id": 2, "type": "UpscaleModelLoader", "pos": [40, 420], "size": [340, 60],
         "flags": {}, "order": 1, "mode": 0, "inputs": [],
         "outputs": [{"name": "UPSCALE_MODEL", "type": "UPSCALE_MODEL", "links": [2],
                      "slot_index": 0}],
         "properties": {"Node name for S&R": "UpscaleModelLoader"},
         "widgets_values": ["RealESRGAN_x2plus.pth"],
         "title": "2 - ESRGAN 2x (conservador)"},
        {"id": 3, "type": "ImageUpscaleWithModel", "pos": [430, 60], "size": [300, 60],
         "flags": {}, "order": 2, "mode": 0,
         "inputs": [{"name": "upscale_model", "type": "UPSCALE_MODEL", "link": 2},
                    {"name": "image", "type": "IMAGE", "link": 1}],
         "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [3], "slot_index": 0}],
         "properties": {"Node name for S&R": "ImageUpscaleWithModel"},
         "widgets_values": [],
         "title": "3 - Amplia sem redesenhar"},
        {"id": 4, "type": "SaveImage", "pos": [780, 60], "size": [380, 300], "flags": {},
         "order": 3, "mode": 0,
         "inputs": [{"name": "images", "type": "IMAGE", "link": 3}],
         "outputs": [],
         "properties": {"Node name for S&R": "SaveImage"},
         "widgets_values": ["{{SAIDA}}"],
         "title": "4 - Foto limpa, pronta para o I2V"},
    ]
    links = [[1, 1, 0, 3, 1, "IMAGE"], [2, 2, 0, 3, 0, "UPSCALE_MODEL"],
             [3, 3, 0, 4, 0, "IMAGE"]]
    d = {"id": "oraclum-superres-fiel", "revision": 0, "last_node_id": 4,
         "last_link_id": 3, "nodes": nodes, "links": links, "groups": [],
         "config": {}, "extra": {}, "version": 0.4}
    dest = os.path.join(WF, "imagem-superres-fiel.json")
    json.dump(d, io.open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("  %-24s ESRGAN 2x, sem difusao — fidelidade obrigatoria"
          % "imagem-superres-fiel")


if __name__ == "__main__":
    print("presets de I2V:")
    for p in PRESETS:
        gera(*p)
    print("\nauxiliar:")
    gera_superres()
