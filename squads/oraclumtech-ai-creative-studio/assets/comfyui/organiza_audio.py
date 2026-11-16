# -*- coding: utf-8 -*-
"""Leva o pack de audio gerado para data/trilhas-and-sfx, organizado por
segmento / tipo / intencao, e escreve o INDEX e o documento de validacao.

Uso:  python organiza_audio.py
"""
import os, subprocess, sys
from pecas_audio import PECAS

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OUT = (r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\output\pack-audio")
BANK = (r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\squads"
        r"\oraclumtech-ai-creative-studio\data\trilhas-and-sfx")

ENGINE = {
    "ace": ("ACE-Step 3.5B", "Apache 2.0 — uso comercial livre, sem teto de faturamento"),
    "sao": ("Stable Audio Open 1.0",
            "Stability Community License — comercial liberado abaixo de USD 1M/ano"),
}

SEGMENTOS = {
    "01-trilhas": ("Trilhas", "Musica COM estrutura e progressao. Tem inicio, meio e fim."),
    "02-leitos": ("Leitos", "Cama atmosferica SEM melodia. Sustenta fala sem disputar com ela."),
    "03-ambiencias": ("Ambiencias", "Som de LUGAR. Diz onde a cena acontece."),
    "04-sfx": ("SFX", "Pontuacao. Cai numa palavra ou num corte, nao se estende."),
}


# Nivelamento para a AUDICAO. O que o founder precisa julgar e o MATERIAL, e nao
# consegue julgar o que nao ouve — as ambiencias saem do gerador a -42 dB de media.
#   · trilha / leito / ambiencia -> loudnorm EBU R128 a -18 LUFS
#   · sfx                        -> normalizacao de PICO a -1 dBFS (e transiente curto;
#                                   loudnorm num tique de 5s empurraria o ganho ao absurdo)
# O nivel de MIXAGEM final e outra decisao, e e do editor. Ver _INDEX.yaml.
ALVO_LUFS = -18.0


def converter(src, dst, segmento):
    if segmento == "04-sfx":
        # mede o pico e aplica o ganho que o leva a -1 dBFS
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src,
                            "-af", "volumedetect", "-f", "null", os.devnull],
                           capture_output=True, text=True, errors="replace")
        pico = 0.0
        for linha in r.stderr.splitlines():
            if "max_volume:" in linha:
                pico = float(linha.split("max_volume:")[1].replace("dB", "").strip())
        af = "volume=%.2fdB" % (-1.0 - pico)
    else:
        af = "loudnorm=I=%.1f:TP=-1.5:LRA=11" % ALVO_LUFS
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src,
                        "-af", af, "-b:a", "192k", dst], capture_output=True)
    return r.returncode == 0


def main():
    copiadas, faltando = 0, []
    for pid, pasta, eng, dur, prompt, intencao in PECAS:
        src = os.path.join(OUT, pid + "_00001.flac")
        if not os.path.isfile(src):
            src = os.path.join(OUT, pid + "_00001.mp3")
        if not os.path.isfile(src):
            faltando.append(pid)
            continue
        d = os.path.join(BANK, pasta.replace("/", os.sep))
        os.makedirs(d, exist_ok=True)
        dst = os.path.join(d, pid + ".mp3")
        if src.endswith(".flac"):
            if not converter(src, dst, pasta.split('/')[0]):
                faltando.append(pid + " (ffmpeg)")
                continue
        else:
            import shutil
            shutil.copy2(src, dst)
        copiadas += 1

    escrever_index()
    escrever_validacao()
    print("  %d pecas organizadas" % copiadas)
    if faltando:
        print("  FALTANDO: %s" % ", ".join(faltando))
    for raiz, _dirs, arqs in os.walk(BANK):
        mp3 = [a for a in arqs if a.endswith(".mp3")]
        if mp3:
            print("   %-42s %d" % (os.path.relpath(raiz, BANK), len(mp3)))


def escrever_index():
    L = []
    A = L.append
    A("# " + "─" * 75)
    A("# PACK DE TRILHAS, AMBIENCIAS E SFX — catalogo por segmento / tipo / intencao")
    A("#")
    A("# Cada peca foi GERADA localmente. Nao ha sample de terceiro aqui — o que")
    A("# elimina de uma vez a questao de licenca de biblioteca musical.")
    A("#")
    A("# Consumido por: @sound-designer (`audio`), @editor (montagem), @exec-producer")
    A("#")
    A("# COMO USAR")
    A("#   1. Ache o SEGMENTO pelo que a peca faz (trilha / leito / ambiencia / sfx)")
    A("#   2. Dentro dele, o TIPO e o nicho ou a familia")
    A("#   3. `intencao` diz em que momento do video a peca entra — e o campo que decide")
    A("# " + "─" * 75)
    A("")
    A("meta:")
    A("  versao: '1.0.0'")
    A("  criado_em: '2026-08-29'")
    A("  squad: oraclumtech-ai-creative-studio")
    A("  total_pecas: %d" % len(PECAS))
    A("  origem: 'geracao local no ComfyUI — nenhum sample de terceiro'")
    A("  regenerar: 'python assets/comfyui/run_batch.py --only aud-'")
    A("")
    A("engines:")
    for k, (nome, lic) in ENGINE.items():
        A("  %s:" % k)
        A("    nome: '%s'" % nome)
        A("    licenca: '%s'" % lic)
    A("")
    A("# As pecas saem do gerador com niveis MUITO diferentes — as ambiencias vieram")
    A("# a -42 dB de media, inaudiveis para julgar. O arquivo que esta aqui ja veio")
    A("# nivelado; o cru continua em ComfyUI/output/pack-audio/.")
    A("nivelamento:")
    A("  aplicado_em: 'copias deste diretorio (as de audicao e uso)'")
    A("  trilha_leito_ambiencia: 'loudnorm EBU R128, I=%.0f LUFS, TP=-1.5 dBTP, LRA=11'" % ALVO_LUFS)
    A("  sfx: 'normalizacao de pico a -1 dBFS (transiente curto; loudnorm distorceria o ganho)'")
    A("  atencao: >")
    A("    Este e o nivel de AUDICAO, para comparacao justa. O nivel de MIXAGEM e outra")
    A("    decisao e e do editor: leito e ambiencia entram bem abaixo da narracao. Regra")
    A("    de partida: voz a -16 LUFS, leito 12 a 15 dB abaixo, ambiencia 18 a 22 abaixo.")
    A("")
    A("segmentos:")
    for k, (nome, oq) in SEGMENTOS.items():
        A("  %s:" % k)
        A("    nome: '%s'" % nome)
        A("    o_que_e: '%s'" % oq)
    A("")
    A("pecas:")
    for pid, pasta, eng, dur, prompt, intencao in PECAS:
        A("")
        A("  - id: '%s'" % pid)
        A("    caminho: '%s/%s.mp3'" % (pasta, pid))
        A("    segmento: '%s'" % pasta.split("/")[0])
        A("    tipo: '%s'" % pasta.split("/")[1])
        A("    engine: '%s'" % ENGINE[eng][0])
        A("    duracao_s: %d" % dur)
        A("    intencao: >")
        A("      %s" % intencao)
        A("    prompt: >")
        A("      %s" % prompt)
        loop = os.path.join(BANK, pasta.replace("/", os.sep), pid + "-LOOP.wav")
        if os.path.isfile(loop):
            A("    loop: '%s/%s-LOOP.wav'" % (pasta, pid))
        elif pasta.split("/")[0] in ("02-leitos", "03-ambiencias"):
            A("    loop: null   # material sustentado curto demais para emendar")
    A("")
    A("# " + "─" * 75)
    A("# O Stable Audio Open recebe a duracao no condicionamento e compoe uma PECA com")
    A("# arco — entra, sustenta e DESVANECE. Tres dos quatro leitos cairam de 20 a 35 dB")
    A("# nos ultimos 15 s. Para uso como cama, o que serve e o LOOP, nao o arquivo cheio.")
    A("loops:")
    A("  formato: 'WAV 16 bits / 44,1 kHz — NAO mp3'")
    A("  por_que_nao_mp3: >")
    A("    MP3 carrega atraso de codificador e preenchimento nas bordas do arquivo, o que")
    A("    insere um buraco audivel na volta do loop na maioria dos reprodutores.")
    A("  como_foi_feito: 'maior janela estavel + crossfade de 2 s do fim sobre o comeco'")
    A("  verificado: 'degrau na emenda medido 7 a 43 dB ABAIXO do degrau tipico do material'")
    A("  regenerar: 'python assets/comfyui/faz_loops.py'")
    A("")
    A("lacunas:")
    A("  - o_que_falta: 'Stems separados (grave / medio / agudo) das trilhas'")
    A("    por_que_importa: 'Permite abaixar so o medio sob a narracao, em vez do volume inteiro'")
    A("  - o_que_falta: 'Trilha de mais de 60s'")
    A("    por_que_importa: >")
    A("      O ACE-Step chega a alguns minutos, mas nao foi testado aqui. Ate testar,")
    A("      a montagem repete e cruza blocos de 60s.")
    A("")
    A("manutencao:")
    A("  regra: >")
    A("    Peca nova entra pelo catalogo em assets/comfyui/pecas_audio.py e vem para ca")
    A("    por `python assets/comfyui/organiza_audio.py`. Nao copiar arquivo na mao —")
    A("    o INDEX e a VALIDACAO sao gerados a partir do catalogo.")
    open(os.path.join(BANK, "_INDEX.yaml"), "w", encoding="utf-8").write("\n".join(L) + "\n")


def escrever_validacao():
    L = []
    A = L.append
    A("# Validação do pack de trilhas, ambiências e SFX")
    A("")
    A("> Marque **um** dos três estados por peça. Se marcar **Aprovado com observação**,")
    A("> preencha o campo logo abaixo — é ele que vira regra no squad.")
    A(">")
    A("> **O que avaliar em cada segmento é diferente:**")
    A("> · **Trilha** — a progressão serve? Ela chega em algum lugar?")
    A("> · **Leito** — ele desaparece sob a voz, ou disputa com ela?")
    A("> · **Ambiência** — soa como o lugar, ou soa como um efeito?")
    A("> · **SFX** — cai limpo, ou tem cauda demais para caber no corte?")
    A(">")
    A("> Todas as peças foram **geradas aqui**. Não há sample de terceiro no pack,")
    A("> então nenhuma delas tem pendência de licença de biblioteca musical.")
    A("")
    A("**Como preencher:** troque `[ ]` por `[x]`.")
    A("")

    por_seg = {}
    for p in PECAS:
        por_seg.setdefault(p[1].split("/")[0], []).append(p)

    for seg in sorted(por_seg):
        nome, oq = SEGMENTOS[seg]
        A("---")
        A("")
        A("## %s — %s" % (seg, nome))
        A("")
        A("*%s*" % oq)
        A("")
        tipo_atual = None
        for pid, pasta, eng, dur, prompt, intencao in por_seg[seg]:
            tipo = pasta.split("/")[1]
            if tipo != tipo_atual:
                tipo_atual = tipo
                A("### · %s" % tipo)
                A("")
            A("#### `%s` · %ds · %s" % (pid, dur, ENGINE[eng][0]))
            A("`%s/%s.mp3`" % (pasta, pid))
            A("")
            A("**Para que serve:** %s" % intencao)
            loop = os.path.join(BANK, pasta.replace("/", os.sep), pid + "-LOOP.wav")
            if os.path.isfile(loop):
                A("")
                A("**Versão em loop:** `%s/%s-LOOP.wav` — é ESTA que vai para a linha de"
                  " tempo. O mp3 acima é a peça inteira, com o desvanecimento que o"
                  " gerador escreveu no fim." % (pasta, pid))
            A("")
            A("- [ ] Aprovado")
            A("- [ ] Aprovado com observação")
            A("- [ ] Recusado")
            A("")
            A("**Observação:**")
            A("```")
            A("")
            A("```")
            A("")

    A("---")
    A("")
    A("## Decisão final")
    A("")
    for rot in ["Trilha canônica do canal de estoicismo",
                "Leito canônico para narração longa",
                "Trilha canônica para o formato de novela / recap",
                "Trilha canônica para anúncio de hospedagem",
                "SFX de transição padrão do squad"]:
        A("**%s:**" % rot)
        A("```")
        A("")
        A("```")
        A("")
    A("**O que falta no pack (peça que você sentiu falta):**")
    A("```")
    A("")
    A("```")
    open(os.path.join(BANK, "VALIDACAO.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
