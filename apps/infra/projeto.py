# -*- coding: utf-8 -*-
"""Carrega um projeto de peca e valida o que o grafo nao consegue validar.

POR QUE VALIDAR AQUI
  O ComfyUI so reclama quando ja esta gerando -- e nesta maquina uma rodada
  custa dezenas de minutos. Um setor citado num take que nao existe na lista,
  um angulo em zero grau, um arquivo de referencia que nao esta em input/:
  tudo isso e barato de pegar antes e caro de descobrir depois.

  A regra que guiou o que entra aqui: so valida o que, se estiver errado,
  custa uma geracao inteira para aparecer.
"""
import io
import os
import sys

import yaml

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJETOS = os.path.join(AQUI, "projetos")
ENTRADA = r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\input"


class Projeto(object):
    def __init__(self, d, caminho):
        self.caminho = caminho
        self.d = d
        p = d.get("projeto", {})
        self.nome = p.get("nome") or "sem-nome"
        self.cliente = p.get("cliente") or ""
        self.peca = p.get("peca") or ""

        pe = d.get("personagem", {})
        self.rosto = pe.get("rosto")
        self.corpo = pe.get("corpo")
        self.voz = pe.get("voz")
        self.voz_corte = int(pe.get("voz_corte") or 4)
        self.roupa = _lin(pe.get("roupa"))

        self.estilo = _lin(d.get("estilo"))

        am = d.get("ambiente", {})
        self.contexto = _lin(am.get("contexto"))
        self.panorama_pronto = am.get("panorama_pronto") or None
        self.setores = [(s["chave"], int(s["angulo"]), s["rotulo"],
                         _lin(s["erp"]), _lin(s["fundo"]))
                        for s in (am.get("setores") or [])]

        v = d.get("video", {})
        self.frames = int(v.get("frames") or 121)
        self.passos_imagem = int(v.get("passos_imagem") or 8)
        # 1080p em vez de 720p da ~50% mais pixels de rosto em TODOS os
        # planos, sem mexer no enquadramento. Medido: num plano aberto o
        # rosto cai para 77 px no video de 512 -- pouco demais para o LTX
        # sustentar identidade por 121 frames, e e de onde vinha a troca de
        # rosto no meio do take.
        self.resolucao_imagem = str(v.get("resolucao_imagem") or "1080p")
        # A resolucao do VIDEO e o parametro mais caro do grafo: o custo
        # cresce com a AREA, nao com o lado.
        #
        #    512p  512x896    1,0x   ~22 min por take
        #    720p  736x1280   2,1x   ~45 min
        #   1080p 1088x1920   4,6x  ~100 min
        #
        # E nao e so tempo. O LTX ja roda com 11 GB em offload numa placa de
        # 8 GB; multiplicar a ativacao por 4,6 nesse estado costuma dar OOM
        # -- ou, pior, saida degradada em vez de erro limpo, que foi o que
        # esta maquina fez quando a memoria apertou. 720p e o degrau que o
        # proprio autor usa nos templates dele.
        self.resolucao_video = str(v.get("resolucao_video") or "512p")
        # o recorte do 360 entra como referencia de ambiente. Subir ele com
        # ESRGAN antes de entrar da mais textura ao fundo -- e aqui ESRGAN
        # serve, porque e imagem parada: a cintilacao que ele causa em video
        # nao existe num frame unico.
        self.upscale_ambiente = v.get("upscale_ambiente")
        if self.upscale_ambiente is None:
            self.upscale_ambiente = "4x-UltraSharp.pth"
        self.upscale = bool(v.get("upscale"))
        self.voz_referencia = bool(v.get("voz_referencia"))

        self.takes = [(int(t["n"]), t["setor"], _lin(t["enquadramento"]),
                       _lin(t["camera"]), _lin(t["acao"]), t["fala"],
                       _lin(t["som"]))
                      for t in (d.get("takes") or [])]

    # ------------------------------------------------------------------
    def confere(self, exigir_arquivos=True):
        """Devolve a lista de problemas. Vazia = pode rodar."""
        p = []
        chaves = [s[0] for s in self.setores]

        if not self.setores:
            p.append("nenhum setor definido em ambiente.setores")
        if not self.takes:
            p.append("nenhum take definido")

        if len(set(chaves)) != len(chaves):
            p.append("ha setores com a mesma chave: %s" % chaves)

        for chave, ang, _, _, _ in self.setores:
            # zero grau E a emenda do equirretangular. Um recorte centrado ali
            # pega justamente o pedaco que o modelo teve de inventar duas
            # vezes -- foi de onde vieram a cadeira deformada e a esquina que
            # sumia. O recorte cobre ~51 graus, entao 26 e o minimo seguro.
            if ang < 26 or ang > 334:
                p.append("setor %s em %d graus cai sobre a emenda do "
                         "panorama (use entre 26 e 334)" % (chave, ang))

        # frames precisa ser 8n+1; o LTX rejeita o resto
        if (self.frames - 1) % 8:
            sug = ((self.frames - 1) // 8) * 8 + 1
            p.append("frames=%d nao e da forma 8n+1 (o mais proximo e %d)"
                     % (self.frames, sug))

        for n, setor, _, _, _, fala, som in self.takes:
            if setor not in chaves:
                p.append("take %d aponta para o setor %r, que nao existe"
                         % (n, setor))
            # TIMING so faz sentido quando HA fala. Take mudo e dirigido
            # so por acao e ambiencia -- exigir TIMING nele seria pedir que
            # se marque o segundo de uma fala que nao existe.
            if str(fala).strip() and not som.strip().upper().startswith("TIMING"):
                p.append("take %d: tem fala mas o campo `som` nao comeca "
                         "com TIMING:" % n)
            if not str(fala).strip() and "TIMING" in som.upper():
                p.append("take %d: e mudo mas o `som` fala de TIMING -- "
                         "descreva a acao sonora, nao o tempo da fala" % n)
            if "..." in fala and "paus" not in som.lower() and \
               "silence" not in som.lower():
                p.append("take %d: a fala tem reticencias mas `som` nao "
                         "descreve a pausa -- o modelo le como virgula" % n)

        # o pipeline de dois estagios exige o fp8, que nao cabe em 8 GB
        if (self.upscale or self.voz_referencia):
            p.append("upscale/voz_referencia ligam o pipeline de dois "
                     "estagios, que exige o modelo fp8 (23,47 GB). Em placa "
                     "de 8 GB a GGUF Q4 nao sustenta o segundo estagio e a "
                     "saida sai com mosaico. So ligue em GPU alugada.")

        if exigir_arquivos:
            for rot, arq in (("personagem.rosto", self.rosto),
                             ("personagem.corpo", self.corpo),
                             ("personagem.voz", self.voz)):
                if not arq:
                    p.append("%s nao informado" % rot)
                elif not os.path.isfile(os.path.join(ENTRADA, arq)):
                    p.append("%s: nao achei %s em ComfyUI/input/" % (rot, arq))
            if self.panorama_pronto and not os.path.isfile(
                    os.path.join(ENTRADA, self.panorama_pronto)):
                p.append("ambiente.panorama_pronto: nao achei %s em input/"
                         % self.panorama_pronto)
        return p

    def resumo(self):
        return ("%s · %s · %s\n   %d setores, %d takes, %d frames (%.2f s)\n"
                "   imagem %s · video %s · upscale=%s voz_ref=%s\n"
                "   panorama: %s"
                % (self.nome, self.cliente, self.peca,
                   len(self.setores), len(self.takes), self.frames,
                   self.frames / 24.0, self.resolucao_imagem,
                   self.resolucao_video, self.upscale, self.voz_referencia,
                   self.panorama_pronto or "gerado por texto"))


def _lin(s):
    return " ".join(str(s or "").split())


def carrega(nome):
    caminho = nome if os.path.isfile(nome) else os.path.join(
        PROJETOS, nome if nome.endswith(".yaml") else nome + ".yaml")
    if not os.path.isfile(caminho):
        disp = [f[:-5] for f in sorted(os.listdir(PROJETOS))
                if f.endswith(".yaml") and not f.startswith("_")]
        raise SystemExit("projeto %r nao existe. Disponiveis: %s"
                         % (nome, ", ".join(disp) or "(nenhum)"))
    return Projeto(yaml.safe_load(io.open(caminho, encoding="utf-8")), caminho)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if len(sys.argv) < 2:
        disp = [f[:-5] for f in sorted(os.listdir(PROJETOS))
                if f.endswith(".yaml") and not f.startswith("_")]
        print("uso: python projeto.py NOME")
        print("projetos: %s" % ", ".join(disp))
        raise SystemExit(0)
    pr = carrega(sys.argv[1])
    print(pr.resumo())
    probs = pr.confere()
    if probs:
        print("\n%d problema(s):" % len(probs))
        for x in probs:
            print("   - %s" % x)
        raise SystemExit(1)
    print("\nsem problemas")
