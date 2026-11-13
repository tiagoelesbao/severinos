# Motor de vídeo local (image-to-video) — viabilidade nesta máquina

**Data:** 2026-07-27
**Contexto:** buscar um fallback **free permanente** para o degrau de vídeo do Virals Farming Squad, hoje dependente de free tiers de terceiros (fal, MiniMax, Kling, Veo) que expiram, mudam ou negam acesso.
**Escopo:** estudo escrito. Nada foi instalado.

---

## Veredito

**Image-to-video por difusão local não é viável nesta máquina como motor de produção do farming.** A restrição que decide não é a VRAM de 8GB — é a combinação dela com **16GB de RAM de sistema** e **38GB de disco livre**, e o número medido por outros usuários com hardware equivalente é brutal:

> Numa **RTX 4060 8GB com 16GB de RAM**, usuários relatam **~3 segundos de vídeo em 60 minutos** com FramePack; outro relata **mais de 40 minutos por segundo de vídeo**. O gargalo reportado nem sempre é a GPU: há casos de GPU a 0% de utilização e 40°C, com o processo preso em RAM.

Aplicado ao pipeline real: `max_takes_per_creative: 6`, com takes de **3 a 6s** cada (`farm-video-takes.md`). Um único criativo tem 18 a 36 segundos de vídeo gerado. Na taxa acima, isso é **6 a 12 horas de render por criativo** — e o farming existe para produzir em lote, diariamente, em 4 nichos.

O tier C procedural (`adapters/video/procedural.js`, ffmpeg `zoompan`) entrega o mesmo take em **segundos**, com custo zero e resultado determinístico. Ele já é o fallback free permanente; o que falta não é substituí-lo, é **elevá-lo**.

---

## Duas premissas que precisavam ser corrigidas

### 1. Fooocus não gera vídeo

[Fooocus](https://github.com/lllyasviel/Fooocus) é um front-end de Stable Diffusion **XL** — texto→imagem. O README: *"High-quality text-to-image without needing much prompt engineering"*, VRAM mínima **4GB**.

Além disso, o status do projeto é *"Limited Long-Term Support (LTS) with Bug Fixes Only"*, com *"no current plans to migrate to or incorporate newer model architectures"*.

**Conclusão:** o Fooocus é candidato legítimo para o degrau de **imagem** local (onde hoje se sangra quota do Gemini), e irrelevante para o degrau de vídeo. A confusão é compreensível: o mesmo autor (lllyasviel) publicou depois o FramePack, que **é** image-to-video — ver abaixo.

### 2. O `ai-video-studio-kit` não faz difusão

Pelo `pipeline/00-START-HERE.md`, os motores do kit são:

| Motor | Natureza |
|---|---|
| Hyperframes | motion graphics 3D hand-coded (Three.js → MP4) |
| Remotion | vídeo programático em React (texto cinético, legendas) |
| Unreal Engine | 3D fotorrealista (instalação separada) |
| VoxCPM / Whisper | TTS local e transcrição |
| ffmpeg | montagem e encode |

É movimento **codado**, não **gerado** — determinístico, $0, sem GPU pesada. Mesma família do tier C atual, com muito mais recurso de composição. **É o ativo aproveitável do kit**, e a rota de menor risco para elevar o fallback.

---

## Hardware medido

```
GPU   : NVIDIA GeForce RTX 4060 Ti — 8.188 MiB VRAM (versão 8GB)  driver 591.86
CPU   : AMD Ryzen 7 5700X (8 cores)
RAM   : 15,9 GB
Disco : C: 19,7 GB livres · G: 18,7 GB livres  (38,4 GB no total, em dois volumes)
Python: 3.13.0
```

Três problemas, em ordem de gravidade:

1. **RAM 16GB.** O offload de modelos de vídeo acontece na RAM do sistema, não só na VRAM. A recomendação corrente é *"pelo menos 24GB, idealmente 32GB"*, e a causa mais comum de falha em hardware modesto é subestimar RAM, não GPU. É o gargalo real desta máquina.
2. **Disco 38GB, fragmentado em dois volumes.** ComfyUI + um modelo de vídeo + VAE + text encoders consome facilmente 30–50GB. Cabe um setup mínimo, sem folga para testar alternativas.
3. **Python 3.13.** PyTorch e o ecossistema ComfyUI ainda se apoiam em 3.10–3.12. Exigiria um Python paralelo em venv — solucionável, mas é mais uma peça móvel.

---

## Candidatos avaliados

| Modelo | VRAM | Resolução / duração | Tempo | Cabe aqui? |
|---|---|---|---|---|
| **LTX-Video 2B distilled** (FP8 + tiling) | 6–8GB | até 720p, 161 frames | "menos de um minuto" em GPU moderna; minutos na prática | ⚠️ o mais provável, sem folga |
| **Wan 2.2 TI2V-5B** (FP8 + offload) | ~5–6GB VRAM | 720p, ~5s | "vários a muitos minutos" | ⚠️ depende de RAM que não há |
| **Wan 2.2 14B GGUF** (Q4/Q5) | ~6GB VRAM | 480p, 3–5s | 10–15+ min por clipe | ❌ RAM insuficiente |
| **FramePack** (lllyasviel) | 6GB | até 60s @ 30fps | 2,5s/frame na **4090**; na 4060 8GB: **~3s de vídeo/hora** | ❌ inviável para lote |
| **Tier C procedural** (atual, ffmpeg) | — | 9:16, qualquer duração | segundos | ✅ já em produção |

Observação transversal da comunidade sobre a faixa de 8GB: *"you can squeeze out a low-resolution clip with aggressive quantization, but the experience is unreliable"* — com **12GB tratado como piso realista**.

O melhor caso plausível aqui (LTX-Video 2B distilled, 480p, poucos passos) produziria takes curtos em alguns minutos cada. Mesmo esse melhor caso é **uma ordem de grandeza mais lento** que o procedural, com qualidade que precisaria ser provada — e sem margem de disco para testar o segundo candidato se o primeiro decepcionar.

---

## O que isso implica para a estratégia de fallback

O objetivo declarado — *fallback free permanente* — é legítimo e o diagnóstico do CSE nesta mesma sessão mostra exatamente por quê: **free tier de terceiro é promessa, não infraestrutura**. Mas "local" e "por difusão" não são sinônimos. Há duas formas de ser permanente:

**Rota determinística (disponível hoje).** ffmpeg + Remotion/Hyperframes. Não depende de VRAM, não expira, roda em qualquer máquina do parque, e nos nichos religioso e cartomante o `ai-providers.yaml` já a define como **estética nativa** — não como consolo. O ganho está em elevá-la: parallax real por camadas (separação figura/fundo), texto cinético, transições, grão e color grade. É trabalho de engenharia previsível, sem risco de hardware.

**Rota por difusão (bloqueada por hardware).** Exigiria, nesta ordem: RAM de 32GB (~R$400–600), disco dedicado, e idealmente GPU de 12–16GB. Sem o upgrade de RAM, nem vale começar — é o item que mais barato destrava o resto.

O nicho `pet` é o único roteado para tier A com justificativa explícita (*"movimento do animal é o conteúdo; procedural não substitui"*). Ele é o único caso onde a difusão seria realmente necessária — e é um caso, não a regra.

---

## Recomendação

1. **Não instalar ComfyUI/difusão nesta máquina agora.** O custo de setup é alto, o disco não permite iterar, e o resultado esperado não sustenta produção em lote.
2. **Elevar o tier C** com o arsenal do `ai-video-studio-kit` (Remotion para texto cinético/legendas; parallax por camadas no procedural). Free permanente de verdade, sem GPU.
3. **Atacar o degrau de imagem separadamente** — é onde a dependência de quota realmente dói hoje (Gemini com 52% de erro por free tier de imagem estourado). SDXL local em 8GB é confortável, e aí sim o Fooocus é o candidato certo, com a ressalva de estar em LTS.
4. **Reavaliar a difusão após RAM de 32GB.** É o upgrade de melhor relação custo/desbloqueio; a GPU de 8GB só passa a ser o gargalo depois disso.

---

## Fontes

- [Fooocus — GitHub (lllyasviel)](https://github.com/lllyasviel/Fooocus) — escopo text-to-image, VRAM mínima, status LTS
- [FramePack — GitHub (lllyasviel)](https://github.com/lllyasviel/FramePack) — I2V, 6GB, 2,5s/frame na 4090
- [FramePack issue #151 — "Exceedingly slow speed on 4060"](https://github.com/lllyasviel/FramePack/issues/151) e [issue #205](https://github.com/lllyasviel/FramePack/issues/205) — números reais em 4060
- [Local Text-to-Video on Low VRAM (2026): 6-8GB & CPU](https://localaimaster.com/blog/local-text-to-video-low-vram) — Wan 2.2 TI2V-5B, LTX-2, exigência de RAM
- [Video Generation VRAM Requirements 2026](https://willitrunai.com/blog/video-generation-gpu-guide-2026) — tabela de VRAM por modelo
- [Best Local AI Video: Wan vs LTX-2.3 & More (2026)](https://insiderllm.com/guides/local-ai-video-generation/) — comparativo qualidade/velocidade
- `assets/ai-video-studio-kit/pipeline/00-START-HERE.md` — inventário dos motores do kit
- `squads/virals-farming-squad/config/ai-providers.yaml` — cascata de tiers e `niche_overrides`
- `squads/virals-farming-squad/tasks/farm-video-takes.md` — 3–6s por take, `max_takes_per_creative: 6`
