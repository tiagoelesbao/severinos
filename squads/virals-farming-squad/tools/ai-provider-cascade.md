# Tool — Cascata de Providers de IA Generativa

```yaml
tool:
  id: ai-provider-cascade
  version: 1.0.0
  config: config/ai-providers.yaml
  ledger: data/runs/.provider-quota-ledger.json
  consumers: [farming-imager, farming-animator]
  pattern: VF-GP-001
```

Contrato dos adapters de geração de imagem e vídeo, e da lógica de roteamento por cota.

---

## Princípio

Consumir primeiro a cota gratuita dos **melhores** modelos; ao estourar, rebaixar para
modelos de cota generosa. **O último degrau nunca falha.**

```text
IMAGEM   Gemini/Nano Banana ─┬─► FLUX (Together) ─┬─► Pollinations (sem chave)
         Imagen              │   SDXL (Cloudflare)│
                          tier A              tier B          tier C

VÍDEO    Veo, Hailuo ────────┬─► Kling ──────────┬─► parallax procedural (ffmpeg)
                          tier A              tier B          tier C  ← ilimitado
```

O tier C de vídeo não é consolo: "imagem animada + áudio" **é** o formato dos nichos de
farming. Custo zero, ilimitado, determinístico.

---

## Interface do adapter

Todo adapter exporta a mesma forma. Trocar de provider não muda quem chama.

```js
module.exports = {
  id: 'gemini-image',
  tier: 'A',
  kind: 'image',                 // 'image' | 'video'
  supportsReferenceImage: true,
  requiresAuth: 'GEMINI_API_KEY', // null quando não precisa

  /** @returns {{available: boolean, reason?: string}} */
  async check() {},

  /**
   * @param {object} req
   * @param {string}  req.prompt
   * @param {string}  req.negative
   * @param {string}  req.outputPath
   * @param {string} [req.referenceImage]  caminho do screenshot do benchmark
   * @param {string} [req.inputImage]      só para kind='video'
   * @param {number} [req.seed]
   * @param {number} [req.durationSeconds] só para kind='video'
   * @returns {{ok: boolean, outputPath?: string, quotaExceeded?: boolean, reason?: string}}
   */
  async generate(req) {},
};
```

### Contrato de erro

| Situação | Retorno | Ação do roteador |
|:---|:---|:---|
| Sucesso | `{ ok: true, outputPath }` | registra consumo, segue |
| Cota estourada (429, quota_exceeded) | `{ ok: false, quotaExceeded: true }` | marca cooldown, **rebaixa tier**, repete |
| Erro transitório | `{ ok: false, reason }` | 1 retry, depois rebaixa |
| Sem credencial | `{ ok: false, reason }` no `check()` | pula o provider silenciosamente |

**Cota estourada não é erro fatal.** É rebaixamento de degrau.

---

## Ledger de quota

`data/runs/.provider-quota-ledger.json` é a **fonte de verdade**. Os `daily_limit` do YAML
são defaults de configuração, não fatos verificados sobre a política de cada serviço.

```json
{
  "2026-07-26": {
    "gemini-image": { "used": 43, "limit_hint": 100, "exhausted_at": null },
    "veo":          { "used": 5,  "limit_hint": 5,   "exhausted_at": "2026-07-26T14:02:11Z" }
  }
}
```

Regras:
1. Todo `generate()` bem-sucedido incrementa `used`.
2. `quotaExceeded` grava `exhausted_at` e o provider sai da rotação por `cooldown_hours`.
3. `limit_hint` é informativo. Um 429 antes do limite **rebaixa na hora** — a resposta do
   serviço vale mais que o palpite do YAML.
4. Reset por data (chave do dia), não por relógio de processo.

---

## Ordem de resolução do tier

```text
--tier explícito  >  niche_overrides.{video|image}_preferred_tier  >  tier A
```

Dentro do tier, ordem de declaração no YAML. Providers sem credencial são pulados sem ruído.

| Nicho | Tier de vídeo | Motivo |
|:---|:---:|:---|
| religioso | C | cena devocional estática — parallax entrega o formato nativo |
| cartomante | C | plano fechado de mesa — micro-movimento basta |
| noticias | B | mistura de cena e cartela, sem queimar tier A |
| pet | A | o movimento do animal **é** o conteúdo |

---

## Modo híbrido

O híbrido não chama API nenhuma e produz **a mesma árvore de arquivos** que o auto — a
fase seguinte não sabe qual modo foi usado.

```text
images/
├── _prompts-para-colar.md    prompts formatados por ferramenta-alvo
├── _slots.json               arquivos que a F5 espera encontrar
└── (você deposita os .png aqui)
```

```json
// _slots.json
{
  "mode": "hybrid",
  "expected": [
    { "take": 1, "file": "take-1.png", "status": "pending" },
    { "take": 2, "file": "take-2.png", "status": "pending" }
  ]
}
```

O agente valida dimensões (9:16) e presença antes de liberar a próxima fase.

---

## Falha total

Se todos os tiers falharem para um item, ele entra em `degraded[]` no manifesto da sessão
e o gate reporta. **Nunca se pula um item em silêncio** — `fail_mode: report_degraded`.
