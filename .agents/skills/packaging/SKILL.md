---
name: packaging
description: >
  Gera título e thumb por nicho pela Regra de 3 — o entregável PRIMÁRIO de um
  episódio de canal dark, antes do roteiro. Pontua candidatos de forma
  determinística (três pilares, corte do feed, complemento da thumb, risco),
  faseia os copywriters dos squads quando o nicho pede, e entrega a promessa
  que o roteiro terá de cumprir. Também diagnostica CTR baixo de vídeo já
  publicado.
  Use when: título e thumb, embalagem, CTR baixo, packaging, capa do vídeo,
  miniatura, /packaging, *packaging, *diagnostico.
user-invocable: true
argument-hint: "{pauta ou título a diagnosticar} [--nicho=futebol|estoicismo|maromba|financas] [--canal={canal}] [--diagnostico]"
agent: packaging-lead
---

# packaging — título e thumb primeiro, roteiro depois

## Quando esta skill roda

Duas entradas:

| Entrada | O que faz |
|---|---|
| **Pauta nova** | Gera candidatos, escolhe, especifica a thumb e declara a promessa. |
| **`--diagnostico`** | Pontua título e thumb que já existem e explica o CTR. |

## A inversão que define isto

Título escrito **depois** do roteiro descreve o vídeo. Título escrito **antes**
promete o que o espectador leva. Num feed onde tudo descreve, descrição não
compete com promessa.

A conta: **70 a 75%** da primeira avaliação do algoritmo é o clique. Um roteiro
excelente atrás de um título que ninguém clica é um vídeo que não existe.

Por isso o roteiro passa a receber uma **promessa**, não um resumo: "entregue isto
nos primeiros 45 segundos".

---

## Passo 1 — Ler o canal

```
{canal_root}/channel-brief.yaml    avatar, tabus, duração-alvo
{canal_root}/thumb-system.yaml     grade, tipografia, cor, regra de rosto
{canal_root}/title-patterns.md     o que já foi usado — não repetir
```

Sem `channel-brief.yaml` o canal ainda não existe como canal. Nesse caso, avise:
o job vira job de fundação (`@brief-strategist`), e nenhum episódio abre antes.

## Passo 2 — Montar o fato

Só entra o que `02-research/fontes.json` sustenta. As fontes são o **teto** da
promessa.

```json
{
  "nicho": "futebol",
  "sujeito": "o STJD",
  "acao": "julgou o caso de apostas de Bruno Henrique",
  "acao_curta": "julga Bruno Henrique",
  "alvo": "o Flamengo",
  "alvo_reage": true,
  "consequencia": "o atacante pode pegar 2 anos de suspensão",
  "verificado": ["falas literais que existem em fontes.json"]
}
```

`verificado` é o que separa citação de invenção — toda aspa num candidato é
conferida contra essa lista.

## Passo 3 — Gerar candidatos, faseando por nicho

**A geração muda com o nicho; o julgamento nunca muda.**

### Nicho de NOTÍCIA (futebol, maromba, finanças)

O fato já tem forma de manchete. O motor por molde basta:

```bash
python apps/regra-de-3/gerador.py --json {job}/06-packaging/fato.json --quantos 12
```

### Nicho de UTILIDADE (estoicismo, saúde, produtividade)

Não há evento com sujeito e alvo — os moldes saem mecânicos. Aqui os copywriters
dos squads entram, **cada um numa fase**, e o pontuador julga o que vier:

| Fase | Agente | O que ele traz |
|---|---|---|
| 1. Ângulo | `@mrbeast-mk` | o conceito do clique: qual tensão faz alguém parar de rolar |
| 2. Headline | `@ladeira` | a redação, por nível de consciência do leitor |
| 3. Gancho | `@georgi` | a primeira frase do vídeo, que precisa cumprir o título |
| 4. Julgamento | `apps/regra-de-3/pilares.py` | a nota, o corte, a thumb e o risco |

Convoque com o pedido explícito de **candidatos curtos e comparáveis** — três a
cinco frases, não um ensaio. Depois passe cada uma pelo pontuador:

```bash
python apps/regra-de-3/gerador.py --diagnostico "CANDIDATO" --thumb "TEXTO DA THUMB"
```

A ordem importa: o conceito antes da redação, e a redação antes do gancho. Pedir
headline sem ângulo definido devolve frase bonita sobre nada.

## Passo 4 — Escolher por estrutura

`candidatos.md` precisa oferecer estruturas diferentes, não interjeições
diferentes:

| | Estrutura | Risco |
|---|---|---|
| **A** | afirma o fato verificado | liberado |
| **B1** | **pergunta** sobre o incerto — `?!` | liberado |
| **B2** | insinua reação, sem citar fala | liberado |
| **B3** | inventa fala e atribui a nome real | **descartado no motor** |

B1 é o mais subestimado: a interrogação transforma afirmação em pergunta, e
pergunta não é asserção. É agressivo como B3 sem carregar o risco de B3.

## Passo 5 — Especificar a thumb

A thumb diz **o que o título não disse**. Se mais de 35% das palavras repetem o
título, o gate reprova.

```yaml
texto_principal: 'É VERDADE?'        # 2 a 5 palavras
texto_secundario: '2 ANOS FORA'      # opcional, canto oposto
elemento_visual: 'escudo do clube + martelo de tribunal'
emocao: 'tensão'
sistema: '{canal_root}/thumb-system.yaml'
```

## Passo 6 — Declarar a promessa

É o contrato que sai deste estágio:

```markdown
## Promessa
Em 45 segundos o espectador sabe qual foi o veredito e o que muda para o time.

## Âncora
fontes.json → id 3 (súmula), id 5 (tabela)
```

## Passo 7 — Gate

`checklists/gate-packaging.md`. Dez itens; os bloqueantes são: nota ≥ 70, três
pilares antes do caractere 55, risco ≠ B3, promessa ancorada, thumb complementar,
três estruturas distintas, ≤ 100 caracteres.

**Quando a promessa não cabe na fonte, o ângulo volta ao research.** Não se
enfraquece o título até caber, e não se suaviza a fonte para caber no título.

---

## Modo diagnóstico

```bash
python apps/regra-de-3/gerador.py --diagnostico "TÍTULO PUBLICADO" --thumb "TEXTO"
```

Devolve nota, quais pilares existem, quais caem depois do corte do feed, quanto a
thumb repete e o risco. É o que explica CTR baixo sem adivinhação.

Exemplo real, do canal estoico a 2,4% de CTR:

```
6 RITUAIS SECRETOS QUE OS ESTÓICOS USAVAM PARA LIDAR COM A ANSIEDADE (EFEITO IMEDIATO)
  86 caracteres · nota 65/100 · risco A
  corte   1 dos 3 pilares fica DEPOIS do corte do feed
  thumb   50% das palavras repetem o título  ← desperdício
```

Os três pilares estavam lá. `(EFEITO IMEDIATO)` estava no caractere 70.
