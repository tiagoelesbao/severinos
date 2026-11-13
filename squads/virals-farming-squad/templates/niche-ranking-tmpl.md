# Template — Ranking de Nicho (F1)

```yaml
template:
  id: niche-ranking-tmpl
  version: 1.0.0
  owner: farming-scout
  output: ranking-{nicho}-{date}.md
  generated_by: scripts/farm-monitor.js
  note: >
    Este template documenta o CONTRATO do relatório que o farm-monitor.js emite.
    Alterações aqui exigem alteração correspondente em buildRankingMarkdown().
```

---

# {{icon}} Ranking de Farming · {{nicho}} · {{date}}

**Sessão:** `{{session_id}}` · **Fonte:** {{source}} · **Lookback:** {{h}}h

**Capturados:** {{n}} · **Aprovados:** {{n}} · **Reprovados:** {{n}} · **Sem métricas:** {{n}}

> Viral Score = (views × 0,1) + (likes × 1) + (comentários × 5)
> Corte deste nicho: score ≥ {{x}} · views ≥ {{x}} · engaj. ≥ {{x}}% · idade ≤ {{x}}h
> Modelabilidade em estágio **preliminar** (só metadados). A F2 completa com detecção de cortes.

---

## 🏆 Aprovados (candidatos a benchmark)

| # | Criador | Score | Modelab. | Views | Likes | Coment. | Engaj. | Dur. | Idade | Origem | Link |
|:-|:---|---:|---:|---:|---:|---:|---:|---:|---:|:---|:---|

### Detalhe dos 10 primeiros
Modelabilidade com as razões, trilha e legenda de cada um.

---

## 🌱 Handles descobertos por hashtag
Perfis novos que apareceram nas hashtags. Promova os que renderem para `anchor_profiles`
em `data/niches/{nicho}.yaml` — a rota de perfil é a mais confiável do pipeline.

---

## ✂️ Reprovados na nota de corte
| Criador | Score | Motivo |
|:---|---:|:---|

O motivo é sempre específico e acionável (`engaj. 2,41% < 5,00%`), nunca "não passou".

---

## ❓ Sem métricas

Itens que a fonte devolveu sem contadores. **Não são "sem engajamento" — são sem dado.**
Rankeá-los como zero falsearia o corte, então ficam de fora do ranking.

---

## ⚠️ Falhas de captura

Alvos que **não foram coletados**. Enquanto esta seção existir, o ranking está incompleto —
e uma lista de aprovados vazia pode ser consequência dela, não ausência de conteúdo.

| Alvo | Tipo | Motivo |
|:---|:---|:---|

---

## Seções obrigatórias

Nenhuma destas pode ser omitida, mesmo vazia:

| Seção | Por quê |
|:---|:---|
| Aprovados | o entregável |
| Reprovados | mostra que o corte funcionou, não que não havia conteúdo |
| Sem métricas | separa "sem dado" de "sem engajamento" |
| Falhas de captura | sem ela, um ranking incompleto parece completo |
