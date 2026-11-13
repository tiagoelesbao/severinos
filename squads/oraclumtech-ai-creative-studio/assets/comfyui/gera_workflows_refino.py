# -*- coding: utf-8 -*-
"""Gera os workflows UI-format das DUAS RODAS de acabamento do squad.

  LITE  cru -> upscale 2x                Volume, teste, thumbnail, prova de conceito.
  PRO   cru -> detailer -> upscale 3x    Peca final. Maxima qualidade.

Por que a LITE nao tem detailer: ele so dispara em ROSTO, e so em rosto de gente
ou de estatua — nunca em mao de marmore nem em arquitetura. Para cena sem rosto as
duas rodas produziriam exatamente o mesmo estagio 2, entao a LITE nao paga por ele.

Uso:  python gera_workflows_refino.py lite
      python gera_workflows_refino.py pro
"""
import json, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

WF_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workflows")

RODA = sys.argv[1] if len(sys.argv) > 1 else "pro"
assert RODA in ("lite", "pro"), "roda deve ser lite ou pro"
COM_DETAILER = (RODA == "pro")
FATOR_UPSCALE = 3.0 if RODA == "pro" else 2.0
DEST = os.path.join(WF_DIR, "flux2-klein-%s-%s.json" % (
    RODA, "refino-upscale" if COM_DETAILER else "upscale"))

nodes, links = [], []
_lid = [0]


def no(nid, tipo, pos, size, widgets=None, entradas=None, saidas=None, titulo=None):
    n = {"id": nid, "type": tipo, "pos": pos, "size": size, "flags": {},
         "order": len(nodes), "mode": 0,
         "inputs": entradas or [], "outputs": saidas or [],
         "properties": {"Node name for S&R": tipo},
         "widgets_values": widgets if widgets is not None else []}
    if titulo:
        n["title"] = titulo
    nodes.append(n)
    return n


def sai(nome, tipo, slot):
    return {"name": nome, "type": tipo, "links": [], "slot_index": slot}


def ent(nome, tipo):
    return {"name": nome, "type": tipo, "link": None}


def liga(orig_id, orig_slot, dest_id, dest_nome, tipo):
    _lid[0] += 1
    lid = _lid[0]
    links.append([lid, orig_id, orig_slot, dest_id, 0, tipo])
    for n in nodes:
        if n["id"] == orig_id:
            n["outputs"][orig_slot]["links"].append(lid)
    for n in nodes:
        if n["id"] == dest_id:
            for i, inp in enumerate(n["inputs"]):
                if inp["name"] == dest_nome:
                    inp["link"] = lid
                    links[-1][4] = i
    return lid


# -- carregadores ------------------------------------------------------------
no(1, "UnetLoaderGGUF", [40, 60], [330, 60],
   ["flux-2-klein-4b-Q8_0.gguf"],
   saidas=[sai("MODEL", "MODEL", 0)], titulo="1 - Modelo (FLUX.2 klein Q8)")
no(2, "CLIPLoader", [40, 170], [330, 110],
   ["qwen_3_4b.safetensors", "flux2", "default"],
   saidas=[sai("CLIP", "CLIP", 0)], titulo="2 - Text encoder")
no(3, "VAELoader", [40, 330], [330, 60],
   ["flux2-vae.safetensors"],
   saidas=[sai("VAE", "VAE", 0)], titulo="3 - VAE")
no(10, "UpscaleModelLoader", [40, 440], [330, 60],
   ["4x-UltraSharp.pth"],
   saidas=[sai("UPSCALE_MODEL", "UPSCALE_MODEL", 0)], titulo="10 - Upscaler (ESRGAN)")
no(7, "UltralyticsDetectorProvider", [40, 550], [330, 80],
   ["bbox/face_yolov8m.pt"],
   saidas=[sai("BBOX_DETECTOR", "BBOX_DETECTOR", 0),
           sai("SEGM_DETECTOR", "SEGM_DETECTOR", 1)],
   titulo="7 - Detector de rosto (YOLO)")

# -- prompts -----------------------------------------------------------------
no(4, "CLIPTextEncode", [420, 60], [420, 150],
   ["{{PROMPT_POSITIVO}}"],
   entradas=[ent("clip", "CLIP")],
   saidas=[sai("CONDITIONING", "CONDITIONING", 0)],
   titulo="4 - Prompt positivo (o MESMO da geracao)")
no(5, "CLIPTextEncode", [420, 250], [420, 150],
   ["{{PROMPT_NEGATIVO}}"],
   entradas=[ent("clip", "CLIP")],
   saidas=[sai("CONDITIONING", "CONDITIONING", 0)],
   titulo="5 - Prompt negativo")

# -- imagem de entrada -------------------------------------------------------
no(6, "LoadImage", [420, 450], [420, 320],
   ["{{IMAGEM}}", "image"],
   saidas=[sai("IMAGE", "IMAGE", 0), sai("MASK", "MASK", 1)],
   titulo="6 - Imagem crua (estagio 1)")

# -- estagio 2 - refino ------------------------------------------------------
FD_WIDGETS = [
    512,          # guide_size
    True,         # guide_size_for (bbox)
    1024,         # max_size
    0, "fixed",   # seed + controle
    8,            # steps
    1.0,          # cfg  (klein e destilado - cfg 1.0 sempre)
    "euler",      # sampler_name
    "simple",     # scheduler
    0.35,         # denoise  <- acima disso troca a identidade do rosto
    24,           # feather  <- 5 deixava degrau medivel na borda da mascara
    True,         # noise_mask
    True,         # force_inpaint
    0.50,         # bbox_threshold
    10,           # bbox_dilation
    3.0,          # bbox_crop_factor
    "center-1",   # sam_detection_hint
    0,            # sam_dilation
    0.93,         # sam_threshold
    0,            # sam_bbox_expansion
    0.70,         # sam_mask_hint_threshold
    "False",      # sam_mask_hint_use_negative
    10,           # drop_size
    "",           # wildcard
    1,            # cycle
    False,        # inpaint_model
    20,           # noise_mask_feather
    False,        # tiled_encode
    False,        # tiled_decode
]
no(8, "FaceDetailer", [900, 60], [420, 720], FD_WIDGETS,
   entradas=[ent("image", "IMAGE"), ent("model", "MODEL"), ent("clip", "CLIP"),
             ent("vae", "VAE"), ent("positive", "CONDITIONING"),
             ent("negative", "CONDITIONING"), ent("bbox_detector", "BBOX_DETECTOR"),
             ent("sam_model_opt", "SAM_MODEL"), ent("segm_detector_opt", "SEGM_DETECTOR"),
             ent("detailer_hook", "DETAILER_HOOK"),
             ent("scheduler_func_opt", "SCHEDULER_FUNC")],
   saidas=[sai("image", "IMAGE", 0), sai("cropped_refined", "IMAGE", 1),
           sai("cropped_enhanced_alpha", "IMAGE", 2), sai("mask", "MASK", 3),
           sai("detailer_pipe", "DETAILER_PIPE", 4), sai("cnet_images", "IMAGE", 5)],
   titulo="8 - ESTAGIO 2 - refino de rosto (Detailer)")

no(9, "SaveImage", [1380, 60], [380, 300],
   ["image/oraclum/{{JOB}}/refinado/{{TAKE}}"],
   entradas=[ent("images", "IMAGE")],
   titulo="9 - Salva o ESTAGIO 2")

# -- estagio 3 - upscale -----------------------------------------------------
US_WIDGETS = [
    FATOR_UPSCALE,  # PRO 3x (1344x768 -> 4032x2304) · LITE 2x
    0, "fixed",   # seed + controle
    8,            # steps
    1.0,          # cfg
    "euler",      # sampler_name
    "simple",     # scheduler
    0.10,         # denoise  <- MEDIDO: em 0.18 o ladrilho inventa rachadura e lasca no marmore
    "Linear",     # mode_type
    1024,         # tile_width  (resolucao nativa do klein)
    1024,         # tile_height
    8,            # mask_blur
    32,           # tile_padding
    "Half Tile",  # seam_fix_mode
    1.0,          # seam_fix_denoise
    64,           # seam_fix_width
    8,            # seam_fix_mask_blur
    16,           # seam_fix_padding
    True,         # force_uniform_tiles
    False,        # tiled_decode
    1,            # batch_size
]
no(11, "UltimateSDUpscale", [1380, 400], [400, 620], US_WIDGETS,
   entradas=[ent("image", "IMAGE"), ent("model", "MODEL"),
             ent("positive", "CONDITIONING"), ent("negative", "CONDITIONING"),
             ent("vae", "VAE"), ent("upscale_model", "UPSCALE_MODEL")],
   saidas=[sai("IMAGE", "IMAGE", 0)],
   titulo="11 - ESTAGIO 3 - upscale por ladrilho 2x")

no(12, "SaveImage", [1830, 400], [400, 320],
   ["image/oraclum/{{JOB}}/final/{{TAKE}}"],
   entradas=[ent("images", "IMAGE")],
   titulo="12 - Salva o ESTAGIO 3 (entregavel)")

# -- ligacoes ----------------------------------------------------------------
liga(2, 0, 4, "clip", "CLIP")
liga(2, 0, 5, "clip", "CLIP")
if COM_DETAILER:
    liga(6, 0, 8, "image", "IMAGE")
    liga(1, 0, 8, "model", "MODEL")
    liga(2, 0, 8, "clip", "CLIP")
    liga(3, 0, 8, "vae", "VAE")
    liga(4, 0, 8, "positive", "CONDITIONING")
    liga(5, 0, 8, "negative", "CONDITIONING")
    liga(7, 0, 8, "bbox_detector", "BBOX_DETECTOR")
    liga(8, 0, 9, "images", "IMAGE")
    liga(8, 0, 11, "image", "IMAGE")
else:
    liga(6, 0, 11, "image", "IMAGE")
liga(1, 0, 11, "model", "MODEL")
liga(4, 0, 11, "positive", "CONDITIONING")
liga(5, 0, 11, "negative", "CONDITIONING")
liga(3, 0, 11, "vae", "VAE")
liga(10, 0, 11, "upscale_model", "UPSCALE_MODEL")
liga(11, 0, 12, "images", "IMAGE")

if not COM_DETAILER:
    fora = {7, 8, 9}
    nodes[:] = [n for n in nodes if n["id"] not in fora]
    links[:] = [l for l in links if l[1] not in fora and l[3] not in fora]

wf = {"id": "oraclum-%s" % RODA, "revision": 0,
      "last_node_id": 12, "last_link_id": _lid[0],
      "nodes": nodes, "links": links, "groups": [],
      "config": {}, "extra": {}, "version": 0.4}

os.makedirs(os.path.dirname(DEST), exist_ok=True)
json.dump(wf, open(DEST, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("escrito:", DEST, "| nos:", len(nodes), "| links:", len(links))
