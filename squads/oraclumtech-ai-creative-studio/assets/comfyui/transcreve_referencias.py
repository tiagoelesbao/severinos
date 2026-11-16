# -*- coding: utf-8 -*-
"""Transcreve as peças de REFERÊNCIA do canal dark de estoicismo e mede o que
o playbook precisa: ritmo, densidade de pausa e mapa temporal da estrutura.

NAO rodar junto com o ComfyUI carregado — 16 GB de RAM nao comportam os dois, e
ja derrubou o ComfyUI uma vez. Esperar a fila esvaziar.

Uso:  python transcreve_referencias.py [modelo]     (default: small)
"""
import json, os, subprocess, sys, time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DOWNLOADS = r"C:\Users\Pichau\Desktop\Sistemas\SaAS\Bot_youtube\downloads"
DEST = (r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\squads"
        r"\oraclumtech-ai-creative-studio\docs\referencias\estoico")

REFERENCIAS = [
    ("v1-praticas",
     "10 PRÁTICAS ESTOICAS PARA COLOCAR SUA VIDA NOS EIXOS ｜ LIÇÕES DE ESTOICISMO 🏛.mp4",
     "Ja modelado em data/dark-estoicismo-playbook.yaml (34m16s). A transcricao "
     "completa faltava — o playbook foi feito por amostragem."),
    ("v2-reflexoes",
     "10 REFLEXÕES ESTOICAS QUE VOCÊ PRECISA ESCUTAR TODAS AS MANHÃS ｜ Estoicismo.mp4",
     "NAO modelado ainda. Formato diferente: reflexao para ouvir de manha, nao "
     "pratica numerada com desafio."),
]

MODELO = sys.argv[1] if len(sys.argv) > 1 else "small"


def extrai_audio(mp4, wav):
    if os.path.isfile(wav):
        return
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4,
                    "-ac", "1", "-ar", "16000", wav], check=True)


def hhmmss(s):
    return "%02d:%02d:%06.3f" % (int(s // 3600), int(s % 3600 // 60), s % 60)


def escreve_srt(segs, caminho):
    with open(caminho, "w", encoding="utf-8") as f:
        for i, s in enumerate(segs, 1):
            f.write("%d\n%s --> %s\n%s\n\n" % (
                i, hhmmss(s["start"]).replace(".", ","),
                hhmmss(s["end"]).replace(".", ","), s["text"].strip()))


def metricas(segs, duracao):
    """O que o playbook consome: ritmo, pausas e mapa temporal."""
    palavras = sum(len(s["text"].split()) for s in segs)
    wpm = palavras / (duracao / 60.0)

    # pausa = intervalo entre o fim de um segmento e o inicio do proximo
    pausas = []
    for a, b in zip(segs, segs[1:]):
        g = b["start"] - a["end"]
        if g > 0.25:
            pausas.append({"em": round(a["end"], 1), "duracao": round(g, 2)})

    # ritmo local em blocos de 5 min — mostra se o narrador acelera ou cansa
    blocos = []
    passo = 300.0
    t = 0.0
    while t < duracao:
        dentro = [s for s in segs if t <= s["start"] < t + passo]
        if dentro:
            p = sum(len(s["text"].split()) for s in dentro)
            span = max(1.0, min(t + passo, duracao) - t)
            blocos.append({"de": int(t), "ate": int(min(t + passo, duracao)),
                           "wpm": round(p / (span / 60.0), 1)})
        t += passo

    return {
        "duracao_s": round(duracao, 1),
        "duracao": "%dm%02ds" % (duracao // 60, duracao % 60),
        "palavras": palavras,
        "wpm_medio": round(wpm, 1),
        "segmentos": len(segs),
        "pausas_acima_de_250ms": len(pausas),
        "pausa_mediana_s": round(sorted(p["duracao"] for p in pausas)[len(pausas) // 2], 2)
                           if pausas else 0,
        "pausas_mais_longas": sorted(pausas, key=lambda p: -p["duracao"])[:10],
        "wpm_por_bloco_de_5min": blocos,
    }


def main():
    import whisper
    print("[etl] carregando whisper '%s'..." % MODELO)
    modelo = whisper.load_model(MODELO)

    for slug, arquivo, nota in REFERENCIAS:
        mp4 = os.path.join(DOWNLOADS, arquivo)
        if not os.path.isfile(mp4):
            print("[etl] AUSENTE: %s" % arquivo)
            continue
        d = os.path.join(DEST, slug)
        os.makedirs(d, exist_ok=True)
        wav = os.path.join(d, "audio.wav")

        alvo = os.path.join(d, "segments.json")
        if os.path.isfile(alvo):
            print("[etl] %s ja transcrito, pulando" % slug)
            continue

        print("[etl] %s — extraindo audio..." % slug)
        extrai_audio(mp4, wav)

        print("[etl] %s — transcrevendo (isto demora)..." % slug)
        t0 = time.time()
        r = modelo.transcribe(wav, language="pt", verbose=False)
        segs = [{"start": s["start"], "end": s["end"], "text": s["text"]}
                for s in r["segments"]]
        dur = segs[-1]["end"] if segs else 0

        json.dump(segs, open(alvo, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        open(os.path.join(d, "transcricao.txt"), "w", encoding="utf-8").write(
            "\n".join(s["text"].strip() for s in segs))
        escreve_srt(segs, os.path.join(d, "transcricao.srt"))

        m = metricas(segs, dur)
        m["arquivo"] = arquivo
        m["nota"] = nota
        m["modelo_whisper"] = MODELO
        json.dump(m, open(os.path.join(d, "metricas.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)

        os.remove(wav)          # o wav de 40 min nao precisa ficar em disco
        print("[etl] %s pronto em %ds — %s, %d palavras, %.1f wpm"
              % (slug, time.time() - t0, m["duracao"], m["palavras"], m["wpm_medio"]))

    print("[etl] concluido")


if __name__ == "__main__":
    main()
