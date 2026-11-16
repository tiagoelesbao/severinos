# Template — Kit de Publicação (F6)

```yaml
template:
  id: publishing-kit-tmpl
  version: 1.1.0
  owner: farming-producer
  output: export/publishing-kit.md
  notes: >
    O campo {{legenda}} reflete o que o export REALMENTE tem — "legenda queimada
    (estilo)" ou o aviso de ausência. Nunca afirme legenda que não foi aplicada:
    este kit é o que o operador lê no momento de publicar. Não use sintaxe de
    placeholder dentro de comentários aqui: o renderizador substitui lá também.
```

---

# Kit de Publicação · {{criativo}}

**Arquivo:** `export/{{arquivo}}.mp4` · {{dur}}s · 9:16 · {{legenda}}

**Nicho:** {{icon}} {{nicho}} · **Sessão:** `{{session_id}}`
**Modelado de:** {{url_original}} (@{{handle_original}})

---

## Descrição para publicar

```text
{{descrição}}
```

> A base vem de `author_description` do `benchmark.json` — a legenda que o autor do
> criativo original usou. Ela é parte do que fez o vídeo ser distribuído; descartá-la e
> reescrever do zero joga fora um sinal que já provou funcionar. Adapte o que for
> específico do autor, preserve a estrutura.

## Hashtags

```text
{{hashtags}}
```

> Capturadas do post original na F2. Ordem preservada — a primeira costuma ser a de maior
> peso de distribuição.

---

## Checagem antes de postar

| Item | Status |
|:---|:---:|
| Vídeo abre e toca até o fim | ☐ |
| Legenda legível em tela pequena, sem corte nas bordas | ☐ |
| Áudio sincronizado com a imagem | ☐ |
| Sem marca d'água ou UI de outra plataforma visível | ☐ |
| Sem texto gerado por IA com erro de grafia | ☐ |
| Guardrails do nicho respeitados | ☐ |
| Descrição sem termo bloqueado | ☐ |

{{#se nicho == cartomante}}
**Enquadramento obrigatório deste nicho:** `{{required_framing}}`
{{/se}}

---

## Rastreabilidade

| Campo | Valor |
|:---|:---|
| Benchmark de origem | `{{pack_dir}}` |
| Plano de modelagem | `plano-criativo.md` |
| Imagens | {{n}} · providers: {{providers_imagem}} |
| Takes | {{n}} · providers: {{providers_video}} |
| Cota consumida | {{consumo}} |
