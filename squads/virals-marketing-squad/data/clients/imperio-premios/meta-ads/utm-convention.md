# Convenção de UTM — Império Prêmios

**Por que isso existe:** o planejamento estratégico de 90 dias mediu que
apenas **15 de 164.561 pedidos (0,03%)** tinham UTM preenchida — não dá para
saber qual conjunto/anúncio específico puxou qual parte dos R$2,34M já
atribuídos à Meta via clique confirmado. Sem UTM consistente desde o dia 1,
a leitura de performance por criativo/ângulo fica cega mesmo com CAPI/EMQ
perfeitos — UTM e CAPI respondem perguntas diferentes (qual anúncio vs. qual
usuário), ambos necessários.

## Regra: todo link de anúncio leva UTM, sem exceção

**Correção 2026-10-05:** a versão original deste documento recomendava
`{{campaign.name}}`/`{{adset.name}}` como macros — ajustado depois de ver os
nomes reais em produção ("Campanha 1 — Advantage+ Vendas (Prospecção)"), que
têm acento, travessão e parênteses. Duas razões pra não usar macro de nome:
(1) suja o relatório de UTM com caracteres especiais codificados na URL; (2)
**se alguém renomear a campanha depois, a UTM de cliques antigos muda
retroativamente** — ID nunca muda, nome muda. Regra final: **sempre ID pra
machine-matching, nome só como prefixo estático legível**.

No campo **"Parâmetros de URL"** de cada anúncio (seção Rastreamento, não o
"Website URL" em si — a Meta anexa isso automaticamente no link final),
colar:

```
utm_source=meta&utm_medium=paid-social&utm_campaign={PREFIXO-DA-CAMPANHA}-{{campaign.id}}&utm_content={{ad.id}}&utm_term={{adset.id}}
```

Troque `{PREFIXO-DA-CAMPANHA}` por um slug curto e fixo que você escolhe uma
vez por campanha (ver exemplos na seção de nomenclatura abaixo) — as macros
`{{campaign.id}}`, `{{adset.id}}`, `{{ad.id}}` a Meta resolve sozinha, sempre
como número estável.

## Convenção de nomenclatura no Ads Manager

Nível Campanha e Conjunto ficam em **português legível** (é o que a equipe lê
no dia a dia) — a parte "máquina" (UTM) já foi resolvida acima via ID, não
depende do nome bater uma convenção rígida. Nível Anúncio já segue o padrão
técnico desde a Trilha A (nome do arquivo = nome do anúncio).

| Nível | Padrão | Já em produção (2026-10-05) |
|---|---|---|
| **Campanha** | `Campanha {N} — {Tipo} ({Objetivo})` | `Campanha 1 — Advantage+ Vendas (Prospecção)` ✅ |
| **Conjunto** | `Conjunto {N} — {Estratégia}` | Renomear de "Novo conjunto de anúncios de Vendas" → `Conjunto 1 — Prospecção Ampla (Advantage+)` |
| **Anúncio** | `{angulo}_{gancho}_{formato}_{AAAAMMDD}` | já aplicado — ex.: `premio_sorteio-pequeno-500_video_20261005` ✅ |

Padrão pras campanhas 2 e 3 quando forem criadas (mesmo estilo, já usado em
`campaign-plan-wave1.md`):
- `Campanha 2 — CBO Teste de Criativos`
- `Campanha 3 — Retargeting (Site)`

Ângulos válidos pro nome do anúncio (Módulo 01 seção 7.3): `premio`, `prova`,
`confianca`, `acessibilidade`, `comunidade`.

## Checklist antes de publicar qualquer anúncio

- [ ] URL de destino tem os 4 parâmetros UTM acima
- [ ] Nome da campanha/conjunto/anúncio segue a convenção (bate com o que a macro vai resolver)
- [ ] `utm_source=meta` sempre minúsculo (diferencia de `fb`/`ig` usados esporadicamente antes — unificar em `meta` daqui pra frente)

## Validação pós-lançamento

Rodar `relatorio_canais` (via `services/Meta/imperio-premios/reports.py`)
periodicamente e conferir se a fatia de `UTM: meta` está crescendo — hoje é
0%, a meta é que qualquer pedido vindo de anúncio tenha UTM **e** clique
confirmado (`fbc`) preenchidos, não um ou outro.
