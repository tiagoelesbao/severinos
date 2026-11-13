# Discovery Cutoff Checklist — Gate F1

```yaml
checklist:
  id: discovery-cutoff-checklist
  version: 1.0.0
  owner: farming-scout
  mode: blocking
  phase: f1-discovery
  purpose: "Garantir que o ranking é inteligência acionável, não uma lista de links"
```

---

## 1. Cobertura da varredura

```yaml
coverage:
  - id: targets-attempted
    check: "Todos os alvos do nicho foram tentados"
    type: blocking
  - id: failures-reported
    check: "Toda falha de captura está na seção própria do relatório"
    type: blocking
    note: >
      Falha de captura NÃO é 'perfil sem post'. Um ranking que esconde falha parece
      completo quando não está, e corrompe as decisões de todas as fases seguintes.
  - id: source-route-declared
    check: "O relatório diz qual rota trouxe cada item (hashtag ou perfil)"
    type: blocking
  - id: empty-result-explained
    check: "Se zero aprovados, o relatório distingue 'corte rigoroso' de 'captura falhou'"
    type: blocking
```

## 2. Integridade do corte

```yaml
cutoff_integrity:
  - id: niche-cutoff-applied
    check: "O corte do nicho foi usado, não só o global"
    type: blocking
    source: "data/niches/{nicho}.yaml → cutoff"
  - id: rejection-reasons-specific
    check: "Cada reprovado tem motivo específico e acionável"
    type: blocking
    example: "'engaj. 2,41% < 5,00%', não 'não passou'"
  - id: unranked-separated
    check: "Itens sem métrica estão em seção própria, não rankeados como zero"
    type: blocking
    note: "'Sem dado' e 'sem engajamento' são coisas diferentes."
  - id: age-window-respected
    check: "Nenhum aprovado é mais velho que max_age_hours"
    type: blocking
```

## 3. Qualidade do ranking

```yaml
ranking_quality:
  - id: diversity-enforced
    check: "Nenhum handle ocupa mais que max_items_per_handle posições"
    type: blocking
    note: "Ranking dominado por um perfil vira cópia de uma conta só."
  - id: modelability-scored
    check: "Todo aprovado tem score de modelabilidade e as razões"
    type: blocking
  - id: modelability-stage-declared
    check: "O relatório declara que o estágio é 'preliminary'"
    type: blocking
    note: "Os sinais que exigem o vídeo em disco só entram na F2."
  - id: no-duplicates
    check: "Nenhum id de vídeo repetido"
    type: blocking
```

## 4. Retroalimentação

```yaml
feedback_loop:
  - id: hashtags-suggested
    check: "Novas hashtags observadas nas legendas dos aprovados foram propostas"
    type: warning
  - id: handles-surfaced
    check: "Handles descobertos por hashtag estão listados para virar anchor_profiles"
    type: warning
    note: "A rota de perfil é a confiável — alimentá-la é o que torna o nicho sustentável."
```

---

## Veredito

| Resultado | Condição | Próximo passo |
|:---|:---|:---|
| **PASS** | 100% blocking | Segue para F2 |
| **CONCERNS** | 100% blocking, warnings pendentes | Segue e registra o débito |
| **FAIL** | Qualquer blocking reprovado | Corrige e roda a F1 de novo |

### Quando zero criativos passam o corte

Isso **não é falha automaticamente**. Investigue nesta ordem:

1. Há falhas de captura? → o problema é de coleta, não de corte.
2. Os reprovados chegaram perto? → o corte do nicho pode estar rigoroso demais.
3. Todos foram reprovados por idade? → amplie `--hours` ou rode com mais frequência.
4. O nicho tem `anchor_profiles` vazio e a rota de hashtag falhou? → **não havia o que varrer.**
