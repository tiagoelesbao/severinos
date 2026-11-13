# -*- coding: utf-8 -*-
"""Camada de voz — Piper carregado em memoria, com cadeia de radio na saida.

A VOZ ESCOLHIDA
  `pt_BR-cadu-medium` passando pela cadeia de radio de `radio.py`. Foi a que o
  dono do canal aprovou depois de ouvir sete vozes lado a lado. O timbre e do
  Piper; a energia de locucao vem do processamento, nao do motor.

POR QUE FRASE INTEIRA, E NAO PACK PICOTADO
  O pack de videogame existia para contornar um custo que, medido, nao existe:

      piper como subprocesso, frase inteira    1,54 a 1,97 s
      piper com o modelo JA carregado          0,11 a 0,28 s

  Aquele 1,5 s era carga de modelo, nao sintese — e carga acontece UMA vez,
  quando o servidor sobe. Com o modelo em memoria, uma frase de sete segundos
  sai em menos de trinta centesimos, mais 0,16 s da cadeia de radio.

  Isso muda a decisao: nao ha motivo para colar pedacos. Frase inteira soa
  natural porque a entonacao atravessa a frase; emenda de fragmentos soa robo
  justamente porque cada pedaco carrega a entonacao de um fim de frase. O pack
  continua util para o que se repete a live toda (chamadas de engajamento,
  marcadores de tempo), que se ouve e se aprova antes do ar — nao para o relato.

OS MOTORES, EM ORDEM
  piper  local, MIT, modelo em memoria. E o de producao.
  edge   vozes neurais melhores, mas dependem de servico externo — a mesma
         classe de risco da API de dados, e num ao vivo isso pesa.
  sapi   voz do Windows, de 2010. Rede de seguranca: se tudo falhar, a live
         segue com voz feia em vez de seguir muda.
"""
import os
import shutil
import subprocess
import sys
import threading

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "_falas")


def _garante_pasta():
    os.makedirs(SAIDA, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# motores
# ─────────────────────────────────────────────────────────────────────────────

def _tem(mod):
    import importlib.util
    return importlib.util.find_spec(mod) is not None


def _sapi(texto, destino):
    """PowerShell + System.Speech. Sem dependência: já existe no Windows.

    O texto vai por STDIN e não como argumento — narração tem aspas, acento e
    hífen, e montar isso na linha de comando quebra na primeira frase com
    apóstrofo.
    """
    script = (
        "$ErrorActionPreference='Stop';"
        "Add-Type -AssemblyName System.Speech;"
        "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;"
        "try { $s.SelectVoice('Microsoft Maria Desktop') } catch {};"
        "$s.Rate=2;"                       # futebol pede pressa
        "$t=[Console]::In.ReadToEnd();"
        "$s.SetOutputToWaveFile('%s');"
        "$s.Speak($t);"
        "$s.Dispose();" % destino.replace("\\", "\\\\")
    )
    r = subprocess.run(["powershell", "-NoProfile", "-Command", script],
                       input=texto, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=30)
    return os.path.isfile(destino) and os.path.getsize(destino) > 1000


def _edge(texto, destino):
    import asyncio
    import edge_tts

    async def go():
        # pt-BR-AntonioNeural é masculina e tem a cadência mais próxima de
        # locução esportiva entre as gratuitas.
        c = edge_tts.Communicate(texto, "pt-BR-AntonioNeural", rate="+18%")
        await c.save(destino)

    asyncio.run(go())
    return os.path.isfile(destino) and os.path.getsize(destino) > 1000


# A voz aprovada. `PIPER_MODELO` no ambiente troca sem mexer no codigo.
MODELO_PIPER = os.path.join(AQUI, "_vozes", "pt_BR-cadu-medium.onnx")

# Locucao esportiva pede pressa: `length_scale` < 1 acelera a fala e 0.92 tira
# o arrastado sem virar atropelo. `noise_w_scale` baixo deixa a duracao dos
# fonemas mais firme — valor alto soa hesitante, que e o oposto de narracao.
VELOCIDADE, FIRMEZA = 0.92, 0.6

_voz_carregada = {"modelo": None, "obj": None}
_trava_piper = threading.Lock()


def _carrega_piper(modelo):
    """Carrega o modelo UMA vez e guarda. E a diferenca entre 1,5 s e 0,2 s."""
    if _voz_carregada["modelo"] == modelo and _voz_carregada["obj"] is not None:
        return _voz_carregada["obj"]
    from piper import PiperVoice, SynthesisConfig      # noqa: F401
    obj = PiperVoice.load(modelo)
    _voz_carregada["modelo"], _voz_carregada["obj"] = modelo, obj
    return obj


def _piper(texto, destino, modelo=None):
    """Sintetiza com o modelo em memoria e passa pela cadeia de radio.

    Se a biblioteca nao expuser a API em processo, cai para o subprocesso — mais
    lento, mas a live nao para por causa de uma versao diferente do pacote.
    """
    import wave
    modelo = modelo or os.environ.get("PIPER_MODELO") or MODELO_PIPER
    if not os.path.isfile(modelo):
        return False
    cru = destino + ".cru.wav"
    try:
        with _trava_piper:
            v = _carrega_piper(modelo)
            from piper import SynthesisConfig
            cfg = SynthesisConfig(length_scale=VELOCIDADE, noise_w_scale=FIRMEZA)
            with wave.open(cru, "wb") as w:
                v.synthesize_wav(texto, w, syn_config=cfg)
    except Exception as e:
        print("  [piper] em processo falhou (%s) — indo de subprocesso"
              % str(e)[:70], flush=True)
        r = subprocess.run(
            [sys.executable, "-m", "piper", "-m", modelo, "-f", cru,
             "--length-scale", str(VELOCIDADE), "--noise-w-scale", str(FIRMEZA)],
            input=texto.encode("utf-8"), capture_output=True, timeout=60)
        if not (os.path.isfile(cru) and os.path.getsize(cru) > 1000):
            err = (r.stderr or b"").decode("utf-8", "replace")[-160:]
            if err.strip():
                print("  [piper] %s" % err.strip(), flush=True)
            return False

    # A cadeia de radio e o que separa locucao de leitura: sem ela a faixa
    # dinamica fica larga demais e as silabas fracas somem.
    ok = False
    try:
        import radio
        ok = radio.processa(cru, destino, "padrao")
    except Exception as e:
        print("  [radio] %s" % str(e)[:80], flush=True)
    if not ok:
        # Sem tratamento e melhor que sem voz.
        try:
            shutil.copyfile(cru, destino)
            ok = True
        except OSError:
            ok = False
    try:
        os.remove(cru)
    except OSError:
        pass
    return ok and os.path.isfile(destino) and os.path.getsize(destino) > 1000


# Piper PRIMEIRO: e local, e a voz aprovada, e nao depende de servico externo.
MOTORES = [
    ("piper", lambda: _tem("piper") and os.path.isfile(MODELO_PIPER), _piper, ".mp3"),
    ("edge", lambda: _tem("edge_tts"), _edge, ".mp3"),
    ("sapi", lambda: sys.platform == "win32", _sapi, ".wav"),
]


def aquece():
    """Carrega o modelo antes do apito. Sem isso, a PRIMEIRA fala da live —
    que costuma ser a de abertura — pagaria 1,2 s de carga sozinha."""
    nome, _, _ = motor_disponivel()
    if nome != "piper":
        return nome
    try:
        with _trava_piper:
            _carrega_piper(MODELO_PIPER)
    except Exception as e:
        print("  [voz] nao consegui aquecer: %s" % str(e)[:80], flush=True)
    return nome


def motor_disponivel(preferido=None):
    """(nome, funcao, extensao) do melhor motor presente."""
    ordem = MOTORES
    if preferido:
        ordem = [m for m in MOTORES if m[0] == preferido] + [m for m in MOTORES if m[0] != preferido]
    for nome, checa, fn, ext in ordem:
        try:
            if checa():
                return nome, fn, ext
        except Exception:
            continue
    return None, None, None


def sintetiza(texto, nome_arquivo, preferido=None):
    """Gera o áudio e devolve o caminho relativo servido, ou None.

    Nunca levanta: uma falha de síntese não pode derrubar a live. No pior caso
    o lance passa sem narração — que é muito melhor que a página parar.
    """
    _garante_pasta()
    nome, fn, ext = motor_disponivel(preferido)
    if not fn:
        return None
    destino = os.path.join(SAIDA, nome_arquivo + ext)
    if os.path.isfile(destino) and os.path.getsize(destino) > 1000:
        return "/falas/" + os.path.basename(destino)     # já sintetizado
    try:
        if fn(texto, destino):
            return "/falas/" + os.path.basename(destino)
    except Exception as e:
        print("  [voz] falhou (%s): %s" % (nome, str(e)[:90]), flush=True)
    return None


def limpa_antigos(manter=40):
    """Mantém só os últimos arquivos — uma live longa geraria centenas."""
    _garante_pasta()
    arqs = sorted((os.path.join(SAIDA, f) for f in os.listdir(SAIDA)),
                  key=os.path.getmtime, reverse=True)
    for f in arqs[manter:]:
        try:
            os.remove(f)
        except OSError:
            pass


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    nome, _, ext = motor_disponivel()
    print("motor escolhido: %s (%s)" % (nome, ext))
    for n, checa, _, _ in MOTORES:
        try:
            ok = checa()
        except Exception:
            ok = False
        print("  %-6s %s" % (n, "disponível" if ok else "ausente"))
    texto = " ".join(sys.argv[1:]) or "Gooool do Flamengo! Samuel Lino, aos treze minutos do primeiro tempo."
    p = sintetiza(texto, "teste")
    print("\nsaída:", p or "FALHOU")
    if p:
        print("arquivo:", os.path.join(SAIDA, os.path.basename(p)))
