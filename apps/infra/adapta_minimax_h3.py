# -*- coding: utf-8 -*-
"""Adapta o template nativo do MiniMax H3 (ref2v) para o Bruno / Imperio.

POR QUE ESTE CAMINHO
  O H3 e o unico modelo de video de ponta com PESO ABERTO que serve para nos:
  a licenca comunitaria exclui EUA, UE, Reino Unido e Coreia do Sul do
  self-host -- e o Brasil nao esta na lista. Roda em GPU alugada pelo preco da
  hora da placa, sem pagar por segundo de video.

  O troco: a licenca e NAO-COMERCIAL e o local trava em 768 px de lado menor
  (o modulo de 2K nao foi liberado). Entao isto serve para TESTE e conteudo
  proprio; peca paga de cliente continua exigindo a rota de API.

DE ONDE VEM O GRAFO
  Nao foi inventado: e o `video_minimax_h3_r2v.json`, template nativo que ja
  vem instalado com o ComfyUI 0.35. Trocam-se as entradas, nada do miolo.

O QUE BARATEIA, E E O PONTO DO EXERCICIO
  O template traz uma `Turbo LoRA` de 4 passos atras de um switch que vem
  DESLIGADO (20 passos). Ligado, sao 4 -- cinco vezes menos tempo de GPU pelo
  mesmo clipe. Numa placa alugada isso e literalmente 1/5 da conta.

  A resolucao tambem: o template usa 0,4 megapixel, nao 1,0. Em 9:16 isso da
  uns 512x896. Para medir se o modelo serve, 0,4 MP responde a pergunta pelo
  menor preco; subir depois e um clique.

AS TAGS DO PROMPT
  O H3 nao adivinha qual referencia e qual: elas entram numeradas e o prompt
  PRECISA cita-las como `<Picture 1>`, `<Picture 2>`. A ordem e a dos slots
  `ref_image_0`, `ref_image_1`. Prompt sem tag ignora a referencia.

USO
    python adapta_minimax_h3.py
    python adapta_minimax_h3.py --sem-turbo --megapixels 1.0
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
ORIGEM = (r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\python_embeded"
          r"\Lib\site-packages\comfyui_workflow_templates_json\templates"
          r"\video_minimax_h3_r2v.json")

# `<Picture 1>` e o rosto (ref_image_0), `<Picture 2>` e o corpo (ref_image_1).
PROMPT = (
    "A warm documentary shot in a brazilian community street at golden hour. "
    "Use <Picture 1> for the man's face and <Picture 2> for his body and "
    "clothing — he wears the same white t-shirt with the golden crown printed "
    "on the chest. He walks slowly toward the camera holding a wrapped gift, "
    "then stops and smiles. Handheld camera, slight movement. Simple brick "
    "houses blurred behind him, warm late afternoon sunlight raking across the "
    "street. Cinematic, natural skin texture, soft film grain. "
    "He speaks warmly: \"Esse ano, o Dia das Crianças vai ser diferente.\"")

# ids do template — conferidos ao ler o arquivo
NO = {
    "rosto": 137,          # LoadImage -> ref_image_0
    "corpo": 139,          # LoadImage -> ref_image_1
    "prompt": 138,         # PrimitiveStringMultiline
    "resolucao": 115,      # ResolutionSelector [proporcao, megapixels, multiplo]
    "duracao": 132,        # PrimitiveFloat, em segundos
    "turbo": 146,          # PrimitiveBoolean: liga a LoRA de 4 passos
    "saida": 92,           # SaveVideo
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--proporcao", default="9:16 (Vertical)")
    ap.add_argument("--megapixels", type=float, default=0.4)
    ap.add_argument("--segundos", type=float, default=5.0)
    ap.add_argument("--sem-turbo", action="store_true",
                    help="usa 20 passos em vez de 4 (5x mais caro)")
    ap.add_argument("--saida", default="MINIMAX-H3-IMPERIO.json")
    a = ap.parse_args()

    if not os.path.isfile(ORIGEM):
        raise SystemExit("template nao encontrado: %s" % ORIGEM)
    w = json.load(io.open(ORIGEM, encoding="utf-8"))
    ns = {n["id"]: n for n in w["nodes"]}
    mudou = 0

    def poe(nid, indice, valor, rotulo):
        nonlocal mudou
        n = ns.get(nid)
        if not n:
            print("   [aviso] no %s sumiu do template" % nid)
            return
        n["widgets_values"][indice] = valor
        mudou += 1
        print("   %-26s %s" % (rotulo, str(valor)[:56]))

    print("entradas:")
    poe(NO["rosto"], 0, "bruno-face.png", "<Picture 1> rosto")
    poe(NO["corpo"], 0, "bruno-body.png", "<Picture 2> corpo")
    poe(NO["prompt"], 0, PROMPT, "prompt")

    print("formato:")
    poe(NO["resolucao"], 0, a.proporcao, "proporcao")
    poe(NO["resolucao"], 1, a.megapixels, "megapixels")
    poe(NO["duracao"], 0, a.segundos, "duracao (s)")

    print("custo:")
    turbo = not a.sem_turbo
    poe(NO["turbo"], 0, turbo, "turbo (4 passos)" if turbo else "turbo DESLIGADO")
    print("   %-26s %d" % ("passos efetivos", 4 if turbo else 20))

    poe(NO["saida"], 0, "video/imperio-h3", "prefixo de saida")

    # o comprimento e calculado pelo proprio template: a expressao alinha o
    # numero de quadros para `n % 17 == 5`, que e o que o H3 exige
    quadros = int(max(5, round(a.segundos * 24)))
    quadros += (5 - (quadros % 17)) % 17
    print("\n%d campo(s) trocado(s)" % mudou)
    print("%d quadros a 24 fps = %.2f s (alinhado para n%%17==5)"
          % (quadros, quadros / 24.0))

    destino = os.path.join(WF, a.saida)
    io.open(destino, "w", encoding="utf-8").write(
        json.dumps(w, ensure_ascii=False, indent=2))
    print("→ %s (%.0f KB)" % (destino, os.path.getsize(destino) / 1e3))
    return 0


if __name__ == "__main__":
    sys.exit(main())
