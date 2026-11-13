# Template — Plano de Criativo Modelado (F3)

```yaml
template:
  id: modeling-plan-tmpl
  version: 1.0.0
  owner: farming-modeler
  output: plano-criativo.md
  consumed_by: [farming-imager, farming-animator, farming-producer]
```

---

# Plano de Criativo Modelado · {{handle}} · rank {{rank}}

**Benchmark de origem:** {{url}}
**Nicho:** {{icon}} {{nicho}} · **Sessão:** `{{session_id}}`
**Duração alvo:** {{duração}}s · **Takes:** {{take_count}} · **Formato:** 9:16

---

## 1. Por que este criativo performou

| Sinal | Leitura |
|:---|:---|
| Viral Score | {{score}} ({{views}} views · {{engagement}}% engaj.) |
| Modelabilidade | {{modelability}} — {{razões}} |
| Gatilho (STEPPS) | {{qual dos seis, e por quê}} |
| Estrutura | {{take único / poucos cortes / montagem}} |

**Âncoras:** cada afirmação acima aponta para um campo de `benchmark.json` ou um trecho de
`audio-description.md`. Nada aqui é impressão.

---

## 2. O que se preserva e o que se troca

> Modelagem é reproduzir a **estrutura** que fez performar e trocar o **conteúdo específico**.

| Preservar (estrutura) | Trocar (conteúdo) |
|:---|:---|
| Ritmo e duração dos takes | Sujeito em cena |
| Enquadramento e direção de luz | Cenário específico |
| Progressão emocional | Falas e frases literais |
| Tratamento do áudio | Texto na tela |
| Gatilho de retenção | Identidade visível |

---

## 3. Estrutura take a take

### Take {{n}} — {{função: hook | desenvolvimento | fechamento}}

| Campo | Valor |
|:---|:---|
| Entrada → saída | {{t_inicio}}s → {{t_fim}}s ({{dur}}s) |
| O que aparece | {{descrição da cena modelada}} |
| Texto na tela | `{{texto}}` — entra no video-studio, **não** na imagem |
| Movimento | {{preset ou direção de câmera}} |
| Transição para o próximo | {{corte seco / suave / fade}} |
| Frame de referência | `screenshots/{{frame}}` |

---

## 4. Áudio

| Campo | Valor |
|:---|:---|
| Tipo | {{música / fala original}} |
| Tratamento | {{preserva original / instrumental / regrava narração}} |
| Fonte | `audio.mp3` do pack |
| Duração | {{dur}}s — **manda na duração total do criativo** |

> Se a soma dos takes não cobre o áudio, o **último take é estendido**. O áudio nunca é
> cortado: o fechamento sonoro é parte do que fez o original performar.

---

## 5. Legendas

| Campo | Valor |
|:---|:---|
| Estilo | `{{caption_style do nicho}}` |
| Fonte do texto | transcrição de `audio-description.md` |
| Queimada | sim, sempre — vertical é consumido sem som |

---

## 6. Gate de guardrails do nicho

| Regra do nicho | Status |
|:---|:---:|
| {{regra 1}} | ✅ / ❌ |
| {{regra 2}} | ✅ / ❌ |

**Termos bloqueados verificados:** {{lista}}
**Veredito:** `APROVADO` / `REPROVADO — {{motivo}}`

{{#se nicho == noticias}}
### ⚠️ Gate de fidelidade factual (TERMINAL)

| Afirmação no plano | Âncora na transcrição |
|:---|:---|
| {{afirmação}} | `"{{trecho literal}}"` |

Afirmação sem âncora **reprova o criativo**. Este gate não é degradado nem contornado
pelo modo automatizado.
{{/se}}

---

## 7. Handoff

- `prompts-imagem.md` → **@farming-imager** (F4)
- `prompts-animacao.md` → **@farming-animator** (F5)
- este documento → **@farming-producer** (F6)
