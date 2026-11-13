---
name: pauta-futebol
description: >
  Etapa 1 do pipeline do canal de futebol — acha o que merece virar vídeo hoje,
  por duas frentes: o que ACONTECEU em campo (API da ESPN: expulsão, virada,
  goleada, pênalti) e o que se FALOU fora dele (RSS de 10 portais: coletiva,
  processo, negociação, treta). Devolve pautas ranqueadas com o fato já
  estruturado, pronto para o /packaging.
  Use when: pauta de futebol, o que postar hoje, notícias do mercado da bola,
  polêmicas do jogo, pós-jogo, ideias de vídeo, /pauta-futebol, *pauta,
  *descobrir.
user-invocable: true
argument-hint: "[--horas=18] [--so=jogo|rss] [--clube=flamengo] [--quantas=15]"
---

# pauta-futebol — o que merece virar vídeo hoje

## Duas frentes, e por que duas

| Frente | Fonte | O que traz | O que nunca traz |
|---|---|---|---|
| **jogo** | API da ESPN | o que **aconteceu** — expulsão, virada, goleada, pênalti, gol no fim | o que foi dito |
| **radar** | RSS de 10 portais | o que se **falou** — coletiva, processo, negociação, treta | o lance em si |

A API chega antes de qualquer portal publicar, e um jogo rende **vários ângulos**:
a mesma partida vista pelo vencedor e pelo perdedor são dois vídeos. O RSS é onde
a polêmica mora — e polêmica é o que o nicho paga.

## Rodar

```bash
python apps/pauta-futebol/descobrir.py --horas 18 --quantas 15
python apps/pauta-futebol/descobrir.py --so jogo          # só pós-jogo
python apps/pauta-futebol/descobrir.py --so rss           # só mercado e bastidor
python apps/pauta-futebol/descobrir.py --salvar pautas.json
```

Saída: pautas ranqueadas de 0 a 100, com o motivo de cada uma ter subido.

```
NOTA FRENTE CONTEXTO                   PAUTA
76   radar  polêmica · palmeiras       Palmeiras vai recorrer e pedir efeito suspensivo…
             punicao · tribunal · stjd · var
88   jogo   Grêmio 3 x 1 Chape · virada  Grêmio saiu atrás e virou para 3 a 1
```

## Como o ranque é montado

Nenhum sinal é opinião:

| Sinal | Peso | Por quê |
|---|---|---|
| clube grande | 30 | audiência de futebol não é distribuída — Flamengo move ordens de grandeza mais busca |
| polêmica | 26 | o nicho paga por tensão; nota de escalação não rende vídeo |
| mercado | 18 | contratação é o insumo mais previsível do plantão diário |
| frescor | 16 | pauta de futebol azeda rápido — 6 h já é velho |
| eco | 5 | a mesma matéria em vários veículos = assunto já em circulação |
| peso da fonte | 5 | veículo grande dá credibilidade ao claim |

Na frente de **jogo** o peso é do desvio, não do resultado: vitória esperada de
time grande em casa não rende nada. Vermelho, virada, goleada e gol no fim rendem.

## Passo seguinte — sempre o mesmo

Escolhida a pauta, o **fato** já vem estruturado no formato que o packaging come:

```json
{
  "nicho": "futebol",
  "sujeito": "o Palmeiras",
  "acao": "", "acao_curta": "", "alvo": "", "consequencia": "",
  "verificado": [],
  "_origem": { "titulo_original": "…", "fonte": "ge.globo", "link": "…" }
}
```

Os campos vazios são o trabalho que sobra: ler a matéria e preencher **ação**,
**alvo** e **consequência**. Deixá-los explicitamente vazios é melhor que
preenchê-los com adivinhação — o packaging só pode prometer o que a fonte
sustenta, e `_origem.link` é onde se confere.

Depois:

```
/packaging   com o fato preenchido   →  título + thumb + a promessa
```

E só então o roteiro, que é escrito para cumprir a promessa.

## O que esta skill não faz

- **Não escreve título.** Isso é do `/packaging`, e é de propósito: quem
  descobre a pauta não deve embalar, porque a tentação de esticar o fato para
  caber num título melhor nasce exatamente aí.
- **Não apura.** Ela indexa o que os portais publicaram. Conferir o link antes
  de prometer qualquer coisa continua sendo trabalho seu.
- **Não cobre o que não está em feed.** Treta de vestiário que só saiu em vídeo
  de canal não aparece aqui.

## Fontes, e por que estas

Vinte candidatos foram testados; nove responderam. O que decide não é o nome do
veículo — é se o feed abre, quantos itens traz e quão fresco está o mais recente.

`ge.globo` (100 itens, só responde no host `pox`), `Jogada10` (100, o mais
fresco), `Gazeta Esportiva` (50), `Placar`, `Metrópoles`, `Trivela`,
`Torcedores.com`, `Terra`, `UOL` (via leitor tolerante — declara um encoding e
manda outro) e `Coluna do Fla`.

Ficaram de fora por não responderem: Lance (410), NetVasco, Meu Timão, CNN (404),
SPFC.net (403), Verdão Web (timeout), ESPN BR (corpo vazio).
