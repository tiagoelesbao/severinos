# Criativos — Campanha 1 — Advantage+ Vendas (Prospecção)

## Nomenclatura e UTM — cola direto no Ads Manager

**Nome do conjunto de anúncios** (hoje está "Novo conjunto de anúncios de
Vendas" — genérico, renomear):
```
per
```

**Nome de cada anúncio:** já está certo — o nome do arquivo que você sobe
*é* o nome do anúncio (confirmado no seu print, a Meta puxou automático).
Não precisa digitar nada a mais aqui.

**Campo "Parâmetros de URL"** (seção Rastreamento de cada anúncio, **não** o
campo "Website URL") — cola essa linha exata em **todos os 5 anúncios**
desta campanha, sem alterar nada entre um e outro (as macros resolvem
sozinhas pra cada anúncio):

```
utm_source=meta&utm_medium=paid-social&utm_campaign=camp1-advantage-vendas-{{campaign.id}}&utm_content={{ad.id}}&utm_term={{adset.id}}
```

Por que não usar o nome da campanha/conjunto direto na UTM: ver
`utm-convention.md` (correção 2026-10-05) — nome tem acento/travessão/
parênteses e pode ser renomeado depois, o que mudaria a UTM de cliques
antigos retroativamente. ID nunca muda.


Movidos de `Downloads/Conteúdo rapidinhas (...)/` em 2026-10-05, renomeados pela
taxonomia do `utm-convention.md` (`{angulo}_{gancho}_{formato}_{data}`) e
triados contra `campaign-plan-wave1.md` seção 5. Critério de seleção pra esta
campanha: **sorteio pequeno (R$400-500) ou ângulo de acessibilidade** — melhor
margem (33,1% vs. 17% do jackpot, achado do plano de 90 dias) e é a oferta que
queremos que converta em escala. Jackpots grandes ficam reservados pra
Campanha 2 (teste) — ver nota no final.

## Arquivos

| Arquivo | Origem | Ângulo | Oferta mostrada |
|---|---|---|---|
| `confianca_como-funciona_video_20261005.mov` | `copy_65FBBD9D...` | Confiança | Explica o funcionamento da Rapidinha |
| `premio_sorteio-pequeno-500_video_20261005.mov` | `copy_154D1262...` | Prêmio | R$500, entrada R$8 |
| `acessibilidade_apenas-8reais_video_20261005.mov` | `copy_FA034ECB...` | Acessibilidade | R$500, entrada R$8 |
| `acessibilidade_apenas-7reais_video_20261005.mov` | `copy_A4BAD1B8...` | Acessibilidade | R$400, entrada R$7 |
| `premio_cozinha-casa_estatico_20261005.jpg` | `IMG_2975.DNG` (convertido, full-res 4536×8064) | Prêmio/lifestyle | R$2.100, entrada R$28 |

---

## Sugestões de título e descrição (aba Criativos do Ads Manager)

Rascunhos de copy direto-resposta — ajustados às cautelas do Módulo 01 seção
7.3 (nunca prometer resultado, nunca forçar urgência falsa, claim sempre
verificável). Trate como ponto de partida: revisar/ajustar o texto principal
junto do vídeo antes de publicar. Cada criativo tem 2-3 variações de título
pra deixar o Advantage+ testar.

### `confianca_como-funciona_video_20261005.mov`

**Texto principal:**
> Já se perguntou como funciona a Rapidinha da Império Prêmios? Escolhe seu número, paga na hora pelo PIX e concorre de verdade — sorteio com data e hora marcada, sem letra miúda. Entra e vê com seus próprios olhos.

**Títulos (variações):**
- Veja como funciona a Rapidinha
- Entenda o sorteio em 30 segundos
- Como participar da Rapidinha

**Descrição:** Sorteio ao vivo, regras claras, PIX na hora.

---

### `premio_sorteio-pequeno-500_video_20261005.mov`

**Texto principal:**
> R$500 no PIX por apenas R$8,00 de participação. Rapidinha rápida, sorteio marcado, você já concorre assim que escolhe seu número. Números limitados — entra antes que esgote.

**Títulos:**
- Rapidinha de R$500 por R$8
- Concorra a R$500 agora
- R$500 esperando um ganhador

**Descrição:** A partir de R$8 você já está concorrendo.

---

### `acessibilidade_apenas-8reais_video_20261005.mov`

**Texto principal:**
> Não precisa gastar muito pra ter chance de ganhar de verdade. Por apenas R$8,00 você já participa da Rapidinha — rápido, direto pelo PIX, sem complicação.

**Títulos:**
- Participe por apenas R$8
- A partir de R$8,00
- R$8 já te coloca no sorteio

**Descrição:** Participação a partir de R$8,00.

---

### `acessibilidade_apenas-7reais_video_20261005.mov`

**Texto principal:**
> R$400 esperando um ganhador. Participação por apenas R$7,00. Escolhe seu número, paga no PIX, pronto — já está concorrendo.

**Títulos:**
- Rapidinha de R$400 por R$7
- Só R$7 pra concorrer
- R$400 por apenas R$7

**Descrição:** A partir de R$7,00 você já concorre.

---

### `premio_cozinha-casa_estatico_20261005.jpg`

**Texto principal:**
> De qualquer lugar, a qualquer hora — participar da Rapidinha é rápido. R$2.100 em jogo, participação a partir de R$28,00 no PIX.

**Títulos:**
- R$2.100 esperando um ganhador
- Concorra a R$2.100
- A partir de R$28,00 você concorre

**Descrição:** Participação a partir de R$28,00.

---

## Nota — reservados pra Campanha 2 (CBO Teste), não movidos ainda

Da análise completa dos 13 vídeos + 9 fotos, estes ficaram de fora desta
pasta por não se encaixarem no critério "sorteio pequeno/acessibilidade" da
Campanha 1 (continuam em `Downloads/Conteúdo rapidinhas (...)/`):

- `copy_426A700C...` (v02), `copy_55B1789E...` (v03), `copy_E3B8F274...` (v10) — jackpots (R$4.000-4.500), melhores como gancho de alcance
- `copy_5589631F...` (v04), `copy_52919443...` (v05), `copy_EEF9AE97...` (v11), `copy_FCD9A393...` (v12 — lista de variedade), `copy_E9955999...` (v13, hook incompleto no frame) — ângulos mistos, bons pra testar
- `IMG_2642.DNG`, `IMG_2974.DNG` — fotos de jackpot/ticket mais caro
- `IMG_7310.DNG` — print de grupo WhatsApp (ângulo Comunidade, não Prêmio/Acessibilidade)

**Fora de qualquer campanha:** `copy_E9955999-CE6F...` (v09, CTA "Me chama no WhatsApp" — direção conflita com a Campanha 1/2, que otimizam conversão via Site) e as 4 fotos `.HEIC` (borradas, inutilizáveis).

Peça pra eu organizar a pasta `creatives/campanha-2-cbo-teste/` quando for montar essa campanha.
