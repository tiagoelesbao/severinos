# -*- coding: utf-8 -*-
"""Monta o workflow de ambiente 360 -- a etapa paga da aula do Movie Builder.

O QUE ELE RESOLVE
  Quando a camera vira num dialogo, o fundo tem de continuar sendo o mesmo
  lugar. Gerando cada plano do zero isso nunca acontece: a rua muda de casa, de
  poste e de hora do dia entre o campo e o contracampo. A saida e gerar o lugar
  UMA vez, em 360, e recortar dele o pedaco que fica atras de cada camera.

O QUE JA EXISTIA, E O QUE FOI PRECISO DESCOBRIR
  Os nove nos `Mickmumpitz/Panorama` vieram no pacote GRATUITO -- o warp, a
  rolagem da emenda, a mascara dos polos e o casamento de cor por Poisson estao
  todos prontos. Nada de Blender, nada de 3D: e imagem 2D equirretangular.

  O que faltava era o modelo. O `PanoKrea2Reference` denuncia que ele montou
  aquilo em volta do Krea 2. Mas ha no acervo uma
  `flux-2-klein-9B-360-erp-outpaint-lora` -- uma LoRA que ensina o NOSSO Flux 2
  Klein a completar equirretangular. Com ela nao e preciso acordar o Krea 2
  (13 GB) nem manter dois modelos vivos numa placa de 8 GB.

A ESTEIRA

    placa (foto ou gerada)
      |
    PanoWarp .............. joga a placa numa tela 2:1 e devolve a mascara do
      |                     que falta (360 menos os ~70 graus da placa)
    OUTPAINT .............. Klein + LoRA 360 preenchem o resto
      |
    PanoSeamRoll .......... a emenda entre 180 e -180 nao existe na imagem;
    OUTPAINT              rolar meia largura traz a emenda para o centro, onde
    RollHorizontal        ela pode ser pintada. Depois volta.
      |
    PanoUnfilledMask ...... o que sobrou preto (polos) ganha uma 3a passada
    OUTPAINT
      |
    HarmonizeBoundary ..... Poisson: o gerado passa a ter a cor da placa, sem
      |                     degrau visivel na juncao
    RECORTES .............. um por angulo de camera, ja em SetNode

POR QUE 1408x704, E NAO 4K
  E o padrao do proprio no, e e 2:1 exato -- a proporcao que equirretangular
  exige. Numa 4060 Ti de 8 GB, com o Klein 9B, tres passadas de geracao em
  4K nao terminam. O panorama e REFERENCIA de fundo, nao entregavel: quem
  redesenha a cena em resolucao final e o plano.

USO
    python monta_ambiente_360.py
    python monta_ambiente_360.py --largura 2048 --angulos 0,90,180,270
"""
import argparse
import io
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
WF = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio", "assets",
                  "comfyui", "workflows")

MODELO = "flux-2-klein-9b-fp8.safetensors"
LORA_360 = "flux-2-klein-9B-360-erp-outpaint-lora_V1.safetensors"
CLIP = "qwen_3_8b_fp8mixed.safetensors"
VAE = "flux2-vae.safetensors"

# O prompt da placa e o do panorama sao DIFERENTES de proposito: a placa e uma
# foto normal com lente normal; o panorama e a continuacao dela em projecao
# equirretangular, e a LoRA espera ouvir isso.
PROMPT_PLACA = (
    "A narrow street in a brazilian favela community at golden hour, simple "
    "brick houses on both sides, power lines crossing overhead, warm late "
    "afternoon sunlight raking down the street, documentary photography, "
    "wide angle shot on a 20mm lens, natural colors, no people")
PROMPT_360 = (
    "equirectangular 360 panorama, seamless spherical projection of the same "
    "brazilian favela street at golden hour, brick houses continuing all the "
    "way around, power lines overhead, warm sunlight, ground below, sky above, "
    "consistent lighting, documentary photography, no people")
# Placa de reserva: so existe para a validacao passar. O switch em GERADA
# ignora esta imagem.
PLACA_PADRAO = "bruno-body.png"
NEGATIVO = ("people, person, text, watermark, logo, seam, duplicated buildings, "
            "black bars, blurry, distorted")

PASSOS, CFG, GUIA = 20, 1.0, 3.5


def _e(nome, tipo, widget=None, opcional=False):
    d = {"name": nome, "type": tipo, "link": None}
    if widget:
        d["widget"] = {"name": widget}
    if opcional:
        d["shape"] = 7
    return d


def _s(nome, tipo):
    return {"name": nome, "type": tipo, "links": []}


class G(object):
    """Tres primitivas. Todo o resto monta topologia sem tocar em numero."""

    def __init__(self):
        self.w = {"id": "ambiente-360", "revision": 0, "last_node_id": 0,
                  "last_link_id": 0, "nodes": [], "links": [], "groups": [],
                  "config": {}, "extra": {}, "version": 0.4}
        self.ns = {}
        self.ni = 0
        self.li = 0

    def no(self, tipo, pos, size, wv=None, ent=(), sai=(), titulo=None, cor=None):
        self.ni += 1
        n = {"id": self.ni, "type": tipo, "pos": list(pos), "size": list(size),
             "flags": {}, "order": 0, "mode": 0,
             "inputs": [dict(x) for x in ent], "outputs": [dict(x) for x in sai],
             "properties": {"Node name for S&R": tipo}}
        if wv is not None:
            n["widgets_values"] = wv
        if titulo:
            n["title"] = titulo
        if cor:
            n["color"], n["bgcolor"] = cor
        self.w["nodes"].append(n)
        self.ns[self.ni] = n
        return self.ni

    def liga(self, o, so, d, sd, tipo):
        self.li += 1
        self.w["links"].append([self.li, o, so, d, sd, tipo])
        s = self.ns[o]["outputs"][so]
        s["links"] = list(s.get("links") or []) + [self.li]
        self.ns[d]["inputs"][sd]["link"] = self.li
        return self.li

    def grupo(self, titulo, caixa, cor="#3f789e"):
        self.w["groups"].append({"id": len(self.w["groups"]) + 1,
                                 "title": titulo, "bounding": list(caixa),
                                 "color": cor, "flags": {}})

    def fecha(self):
        self.w["last_node_id"] = self.ni
        self.w["last_link_id"] = self.li
        return self.w


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--largura", type=int, default=1408)
    ap.add_argument("--fov", type=float, default=90.0)
    ap.add_argument("--angulos", default="0,90,180,270",
                    help="graus de camera a recortar")
    ap.add_argument("--saida", default="AMBIENTE-360.json")
    ap.add_argument("--placa", default=None, help="sobrescreve o prompt da placa")
    ap.add_argument("--pano", default=None, help="sobrescreve o prompt do 360")
    a = ap.parse_args()
    global PROMPT_PLACA, PROMPT_360
    if a.placa:
        PROMPT_PLACA = a.placa
    if a.pano:
        PROMPT_360 = a.pano
    W = a.largura
    H = W // 2                      # equirretangular e 2:1, sempre
    angulos = [float(x) for x in a.angulos.split(",") if x.strip()]

    g = G()
    Y = 0

    # ── MODELOS ────────────────────────────────────────────────────────────
    unet = g.no("UNETLoader", (40, Y), (380, 82), [MODELO, "default"],
                sai=[_s("MODEL", "MODEL")], titulo="1 · Flux 2 Klein 9B")
    lora = g.no("LoraLoaderModelOnly", (40, Y + 120), (380, 82),
                [LORA_360, 1.0], ent=[_e("model", "MODEL")],
                sai=[_s("MODEL", "MODEL")],
                titulo="1 · LoRA 360 ERP outpaint  ← o que ensina equirretangular")
    clip = g.no("CLIPLoader", (40, Y + 240), (380, 106), [CLIP, "flux2", "default"],
                sai=[_s("CLIP", "CLIP")], titulo="1 · text encoder")
    vae = g.no("VAELoader", (40, Y + 380), (380, 58), [VAE],
               sai=[_s("VAE", "VAE")], titulo="1 · VAE")
    g.liga(unet, 0, lora, 0, "MODEL")
    g.grupo("1 · MODELOS", [20, Y - 60, 420, 520], "#355")

    neg = g.no("CLIPTextEncode", (40, Y + 470), (380, 110), [NEGATIVO],
               ent=[_e("clip", "CLIP")], sai=[_s("CONDITIONING", "CONDITIONING")],
               titulo="negativo (vale para as tres passadas)")
    g.liga(clip, 0, neg, 0, "CLIP")

    # ── PLACA: gerada ou carregada ─────────────────────────────────────────
    X = 500
    p_placa = g.no("CLIPTextEncode", (X, Y), (420, 150), [PROMPT_PLACA],
                   ent=[_e("clip", "CLIP")],
                   sai=[_s("CONDITIONING", "CONDITIONING")],
                   titulo="2 · PROMPT da placa (foto normal do lugar)")
    g.liga(clip, 0, p_placa, 0, "CLIP")
    lat0 = g.no("EmptyFlux2LatentImage", (X, Y + 180), (300, 106),
                [1024, 1024, 1], sai=[_s("LATENT", "LATENT")],
                titulo="2 · tela da placa")
    ks0 = g.no("KSampler", (X, Y + 320), (320, 262),
               [0, "fixed", PASSOS, CFG, "euler", "simple", 1.0],
               ent=[_e("model", "MODEL"), _e("positive", "CONDITIONING"),
                    _e("negative", "CONDITIONING"), _e("latent_image", "LATENT")],
               sai=[_s("LATENT", "LATENT")], titulo="2 · gera a placa")
    dec0 = g.no("VAEDecode", (X, Y + 610), (210, 46), [],
                ent=[_e("samples", "LATENT"), _e("vae", "VAE")],
                sai=[_s("IMAGE", "IMAGE")])
    g.liga(lora, 0, ks0, 0, "MODEL")
    g.liga(p_placa, 0, ks0, 1, "CONDITIONING")
    g.liga(neg, 0, ks0, 2, "CONDITIONING")
    g.liga(lat0, 0, ks0, 3, "LATENT")
    g.liga(ks0, 0, dec0, 0, "LATENT")
    g.liga(vae, 0, dec0, 1, "VAE")

    # O ComfyUI valida TODOS os nos antes de executar, inclusive o ramo que o
    # StageSwitch vai descartar. Um nome inexistente aqui derruba a rodada
    # inteira com "entrada de midia ausente" -- mesmo com o switch em GERADA.
    # Entao o padrao aponta para um arquivo que EXISTE, e a instrucao de trocar
    # fica no titulo do no, onde nao quebra nada.
    ld = g.no("LoadImage", (X, Y + 700), (380, 400),
              [PLACA_PADRAO, "image"],
              sai=[_s("IMAGE", "IMAGE"), _s("MASK", "MASK")],
              titulo="2 · OU carregue uma foto do lugar (troque aqui)")
    sw = g.no("MickmumpitzPanoStageSwitch", (X, Y + 1140), (360, 82), [True],
              ent=[_e("on_image", "IMAGE"), _e("off_image", "IMAGE")],
              sai=[_s("IMAGE", "IMAGE")],
              titulo="2 · ligado = usa a GERADA · desligado = usa a FOTO")
    g.liga(dec0, 0, sw, 0, "IMAGE")
    g.liga(ld, 0, sw, 1, "IMAGE")
    g.grupo("2 · PLACA DO LUGAR", [480, Y - 60, 460, 1300], "#353")

    # ── WARP ───────────────────────────────────────────────────────────────
    X = 1000
    warp = g.no("MickmumpitzPanoWarp", (X, Y), (380, 290),
                [W, H, 1, a.fov, 0.0, 0.0, 0, 2.0, 10, 0.55, "#000000"],
                ent=[_e("image", "IMAGE")],
                sai=[_s("control_video", "IMAGE"), _s("control_mask", "IMAGE"),
                     _s("inpaint_mask", "MASK"), _s("erp_guide", "IMAGE")],
                titulo="3 · WARP — a placa vira tela %dx%d + mascara do que falta" % (W, H))
    g.liga(sw, 0, warp, 0, "IMAGE")
    prev_w = g.no("PreviewImage", (X, Y + 330), (380, 240), [],
                  ent=[_e("images", "IMAGE")],
                  titulo="a carta de grade (guia geometrico)")
    g.liga(warp, 3, prev_w, 0, "IMAGE")
    g.grupo("3 · WARP", [980, Y - 60, 420, 640], "#535")

    # ── as tres passadas de outpaint ───────────────────────────────────────
    p360 = g.no("CLIPTextEncode", (1460, Y), (420, 150), [PROMPT_360],
                ent=[_e("clip", "CLIP")],
                sai=[_s("CONDITIONING", "CONDITIONING")],
                titulo="PROMPT do 360 (diz 'equirectangular' — a LoRA espera)")
    g.liga(clip, 0, p360, 0, "CLIP")

    def passada(x, y, img_no, img_slot, msk_no, msk_slot, rotulo, semente):
        enc = g.no("VAEEncode", (x, y), (210, 46), [],
                   ent=[_e("pixels", "IMAGE"), _e("vae", "VAE")],
                   sai=[_s("LATENT", "LATENT")])
        msk = g.no("SetLatentNoiseMask", (x, y + 80), (260, 46), [],
                   ent=[_e("samples", "LATENT"), _e("mask", "MASK")],
                   sai=[_s("LATENT", "LATENT")])
        gui = g.no("FluxGuidance", (x, y + 160), (260, 58), [GUIA],
                   ent=[_e("conditioning", "CONDITIONING")],
                   sai=[_s("CONDITIONING", "CONDITIONING")])
        ks = g.no("KSampler", (x, y + 250), (320, 262),
                  [semente, "fixed", PASSOS, CFG, "euler", "simple", 1.0],
                  ent=[_e("model", "MODEL"), _e("positive", "CONDITIONING"),
                       _e("negative", "CONDITIONING"),
                       _e("latent_image", "LATENT")],
                  sai=[_s("LATENT", "LATENT")], titulo=rotulo)
        dec = g.no("VAEDecode", (x, y + 540), (210, 46), [],
                   ent=[_e("samples", "LATENT"), _e("vae", "VAE")],
                   sai=[_s("IMAGE", "IMAGE")])
        g.liga(img_no, img_slot, enc, 0, "IMAGE")
        g.liga(vae, 0, enc, 1, "VAE")
        g.liga(enc, 0, msk, 0, "LATENT")
        g.liga(msk_no, msk_slot, msk, 1, "MASK")
        g.liga(p360, 0, gui, 0, "CONDITIONING")
        g.liga(lora, 0, ks, 0, "MODEL")
        g.liga(gui, 0, ks, 1, "CONDITIONING")
        g.liga(neg, 0, ks, 2, "CONDITIONING")
        g.liga(msk, 0, ks, 3, "LATENT")
        g.liga(ks, 0, dec, 0, "LATENT")
        g.liga(vae, 0, dec, 1, "VAE")
        return dec

    d1 = passada(1460, Y + 200, warp, 0, warp, 2,
                 "4 · OUTPAINT — completa os 360", 1)
    g.grupo("4 · OUTPAINT 360", [1440, Y - 60, 460, 880], "#853")

    # ── EMENDA ─────────────────────────────────────────────────────────────
    X = 1960
    roll = g.no("MickmumpitzPanoSeamRoll", (X, Y), (340, 106), [0.06, 24],
                ent=[_e("image", "IMAGE")],
                sai=[_s("IMAGE", "rolled_image"), _s("MASK", "seam_mask")],
                titulo="5 · rola meia largura — a emenda vai para o centro")
    g.liga(d1, 0, roll, 0, "IMAGE")
    d2 = passada(X, Y + 150, roll, 0, roll, 1, "5 · pinta a emenda", 2)
    volta = g.no("MickmumpitzPanoRollHorizontal", (X, Y + 760), (340, 58), [0.5],
                 ent=[_e("image", "IMAGE")], sai=[_s("IMAGE", "image")],
                 titulo="5 · desenrola (a emenda volta para a borda)")
    g.liga(d2, 0, volta, 0, "IMAGE")
    g.grupo("5 · EMENDA", [1940, Y - 60, 400, 900], "#853")

    # ── POLOS ──────────────────────────────────────────────────────────────
    X = 2400
    unf = g.no("MickmumpitzPanoUnfilledMask", (X, Y), (340, 170),
               [0.1, 0.4, 24, 12.0], ent=[_e("image", "IMAGE")],
               sai=[_s("MASK", "mask"), _s("IMAGE", "mask_preview"),
                    _s("INT", "unfilled_rows")],
               titulo="6 · o que sobrou preto (ceu e chao)")
    g.liga(volta, 0, unf, 0, "IMAGE")
    d3 = passada(X, Y + 210, volta, 0, unf, 0, "6 · fecha os polos", 3)
    g.grupo("6 · POLOS", [2380, Y - 60, 400, 960], "#853")

    # ── HARMONIZE ──────────────────────────────────────────────────────────
    X = 2840
    harm = g.no("MickmumpitzPanoHarmonizeBoundary", (X, Y), (360, 190),
                [1.0, 8, 800, True],
                ent=[_e("image", "IMAGE"), _e("plate", "IMAGE"),
                     _e("inpaint_mask", "MASK")],
                sai=[_s("IMAGE", "image"), _s("IMAGE", "correction_field")],
                titulo="7 · casa a cor do gerado com a placa (Poisson)")
    g.liga(d3, 0, harm, 0, "IMAGE")
    g.liga(warp, 0, harm, 1, "IMAGE")
    g.liga(warp, 2, harm, 2, "MASK")
    sv = g.no("SaveImage", (X, Y + 230), (500, 380), ["ambiente-360/pano"],
              ent=[_e("images", "IMAGE")], titulo="7 · PANORAMA PRONTO")
    g.liga(harm, 0, sv, 0, "IMAGE")
    g.grupo("7 · HARMONIZE + SALVA", [2820, Y - 60, 540, 680], "#535")

    # ── RECORTES POR ANGULO ────────────────────────────────────────────────
    #
    # Nao existe no de equirretangular->perspectiva no pacote, e nao faz falta:
    # o recorte nao e o fundo final, e a REFERENCIA que o Klein le ao desenhar o
    # plano. Ele so precisa saber o que ha naquela direcao.
    #
    # Rolar antes de recortar e o que resolve a volta do 360: um angulo de 350
    # graus pegaria metade de cada borda num crop simples.
    X = 3400
    larg = int(W * 90.0 / 360.0)              # ~90 graus de campo
    for i, ang in enumerate(angulos):
        y = Y + i * 330
        r = g.no("MickmumpitzPanoRollHorizontal", (X, y), (330, 58),
                 [round((ang % 360.0) / 360.0, 4)],
                 ent=[_e("image", "IMAGE")], sai=[_s("IMAGE", "image")],
                 titulo="gira %d°" % int(ang))
        c = g.no("ImageCrop", (X, y + 90), (300, 130),
                 [larg, H, (W - larg) // 2, 0], ent=[_e("image", "IMAGE")],
                 sai=[_s("IMAGE", "IMAGE")], titulo="recorta o centro")
        st = g.no("SetNode", (X + 340, y + 90), (240, 58), ["AMB_%03d" % int(ang)],
                  ent=[_e("IMAGE", "IMAGE")], sai=[_s("IMAGE", "IMAGE")],
                  titulo="Set_AMB_%03d" % int(ang))
        st_n = g.ns[st]
        st_n["properties"]["aux_id"] = "kijai/ComfyUI-KJNodes"
        st_n["properties"]["previousName"] = "AMB_%03d" % int(ang)
        pv = g.no("SaveImage", (X + 620, y), (330, 300),
                  ["ambiente-360/amb_%03d" % int(ang)],
                  ent=[_e("images", "IMAGE")], titulo="AMB %d°" % int(ang))
        g.liga(harm, 0, r, 0, "IMAGE")
        g.liga(r, 0, c, 0, "IMAGE")
        g.liga(c, 0, st, 0, "IMAGE")
        g.liga(c, 0, pv, 0, "IMAGE")
    g.grupo("8 · RECORTES POR ANGULO DE CAMERA",
            [3380, Y - 60, 1000, 330 * len(angulos) + 80], "#357")

    nota = g.no("MarkdownNote", (40, Y + 620), (420, 620), ["""## Ambiente 360

**Para que serve:** quando a camera vira num dialogo, o fundo tem de continuar
sendo o mesmo lugar. Gera-se o lugar uma vez e recorta-se o pedaco atras de cada
camera.

**Ordem de uso**
1. Escreva o lugar no **PROMPT da placa** e rode o `2 · gera a placa`. Ou
   desligue o switch e carregue uma foto.
2. Confira a **carta de grade** — ela mostra onde a placa caiu na esfera.
3. Rode o `7 · PANORAMA PRONTO`. Sao tres passadas de geracao; nao e rapido.
4. Os recortes saem em `output/ambiente-360/` e ficam em `SetNode AMB_000`,
   `AMB_090`, etc. — e so puxar com `GetNode` dentro do Movie Builder.

**Se a emenda aparecer:** suba `seam_width` no `5 · rola`.
**Se sobrar preto no ceu:** suba `grow` no `6 · o que sobrou preto`.
**Se o gerado tiver outra cor que a placa:** e o `7 · HARMONIZE` que conserta;
confira que a `inpaint_mask` do warp chegou nele.

**O recorte nao e o fundo final.** E a referencia que o Klein le ao desenhar o
plano — ele so precisa saber o que ha naquela direcao.

---

**Quanto o modelo tem de inventar (medido):** uma placa de 70° cobre **7,2%** da
esfera. Sobram **92,8%** para a LoRA preencher. E muito, e e exatamente o
trabalho para o qual ela foi treinada — mas se o resultado derivar (a rua vira
outra rua do outro lado), o remedio nao e mexer no prompt: e dar mais placa.

Suba o `h_fov_deg` do WARP e gere a placa como plano aberto: 90° cobre ~12%,
120° cobre ~21%. O numero cresce com o QUADRADO do campo."""])
    g.ns[nota]["color"], g.ns[nota]["bgcolor"] = "#432", "#653"
    g.ns[nota]["properties"] = {}

    w = g.fecha()
    # conferencia: ligacao existe dos dois lados?
    porid = {l[0]: l for l in w["links"]}
    ruins = []
    for n in w["nodes"]:
        for i, e in enumerate(n.get("inputs", [])):
            if e.get("link") is None:
                if not e.get("shape"):
                    ruins.append("no %s (%s) entrada '%s' sem ligacao"
                                 % (n["id"], n["type"], e["name"]))
                continue
            l = porid.get(e["link"])
            if not l or l[3] != n["id"] or l[4] != i:
                ruins.append("no %s entrada '%s' com link torto" % (n["id"], e["name"]))
    if ruins:
        print("GRAFO INCONSISTENTE:")
        for r in ruins[:15]:
            print("   " + r)
        return 1

    d = os.path.join(WF, a.saida)
    io.open(d, "w", encoding="utf-8").write(
        json.dumps(w, ensure_ascii=False, indent=2))
    print("%d nos · %d links · %d grupos · 0 entrada solta"
          % (len(w["nodes"]), len(w["links"]), len(w["groups"])))
    print("panorama %dx%d · %d recorte(s) de %d px (~90°)"
          % (W, H, len(angulos), larg))
    print("→ %s (%.0f KB)" % (d, os.path.getsize(d) / 1e3))
    return 0


if __name__ == "__main__":
    sys.exit(main())
