# Creative Quality Checklist (C1–C9) — Auditoria do Pipeline `*design-creative`

> **Fonte canônica** do Quality Gate executado por `squads/virals-marketing-squad/scripts/quality_gate.py`.
> Cada item abaixo é uma regra avaliável; alterar o texto entre `C{n} —` e o fim da linha modifica o comportamento do gate na próxima execução. Não remover linhas — comentar (`<!-- ... -->`) se quiser desativar.

## Critérios

- C1 — PT-BR: headline e body em português (anglicismo só se consagrado).
- C2 — Sem @handle, assinatura ou marca d'água de terceiros.
- C3 — Dentro do TEMA CENTRAL do criativo.
- C4 — Voz Virals: sem promessa vazia, corporativês, linguagem genérica, ego-driven ou mistério.
- C5 — Headline não-vazia e não é placeholder ('[RECAST PENDENTE]').
- C6 — Comprimento adequado: headline concisa; body de 1 a 3 frases.
- C7 — Headline e body SEM emoji e SEM hashtag (#) — texto limpo e profissional.
- C8 — Voz do cliente: headline OU body deve ser CONCRETO — ancorado em fato/exemplo/lugar/método real (NÃO frase poético-motivacional genérica). ATENÇÃO: concretude NÃO é enfiar jargão da marca ("sistema", "bastidor", "log") — headline abstrata cheia de jargão é PIOR que genérica. NÚMERO só se JÁ existir na fonte; PROIBIDO inventar estatística, %, '1,8×', 'subiu 34%' ou 'pesquisa interna'. Reprovar auto-ajuda sem evidência (MCI-06).
- C9 — CTA proibido: último slide NÃO pode conter padrões como "comente X", "manda no DM", "link na bio", "garanta o seu", "zona de conforto", "extraordinário", "transforme sua vida". Reprovar e reescrever como call-to-think (provocação intelectual).

## Regra de Convergência (NÃO-NEGOCIÁVEL)

O auditor LLM (loop C1–C9) **reprova APENAS violações CLARAS e OBJETIVAS** (emoji, hashtag, inglês, @handle). Diferenças de estilo subjetivo NÃO são motivo de reprovação aqui. Esta regra protege a convergência do self-healing loop (máx. 3 iterações).

## Barra de qualidade determinística (independente do LLM)

Depois do loop C1–C9, o `quality_gate` roda `copy_guardrails.py` — regras em **código puro** que reprovam **hook fraco, densidade pesada e jargão abstrato** e acionam um **editor-especialista** (rubrica Hormozi/MrBeast/Ladeira) que REESCREVE a copy. Fallback final: reancorar na copy-fonte do benchmark. Isto garante padrão de qualidade mesmo em LLM fraco — sem depender do gerador ter caprichado.

| Guardrail | Limite |
|---|---|
| Manchete do HOOK | ≤ 52 caracteres, lidera por benefício |
| Manchete de corpo | ≤ 62 caracteres |
| Corpo | ≤ 200 caracteres, 1–3 frases |
| Jargão abstrato como manchete | proibido (lista em `copy_guardrails.JARGAO_ABSTRATO`) |
| Hook que descreve problema abstrato | reprovado (prometer benefício, não mecanismo) |

## Output esperado por iteração

```json
{
  "slides": [
    {"slide_n": 1, "aprovado": true, "problemas": [], "headline": "...", "body": "..."}
  ]
}
```

## Metadata

| Campo | Valor |
|---|---|
| **Pattern** | VM-CL-001 |
| **Executor** | `scripts/quality_gate.py` |
| **Workflow** | `design-creative.workflow.md` (PHASE-5) |
| **Self-healing loop** | máx. 3 iterações |
| **Não-fatal** | true (WARN_MAX_ITER se não converge) |
