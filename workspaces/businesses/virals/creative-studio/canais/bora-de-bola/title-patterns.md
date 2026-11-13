# Padrões de título — Bora de Bola

Registro vivo. Cada episódio publicado acrescenta uma linha, e o `gate-packaging`
consulta as **5 últimas** para não repetir padrão — dois vídeos com a mesma
moldura disputam a mesma impressão e canibalizam o próprio catálogo.

## A fórmula

```
[GATILHO IMEDIATO!] + [FATO REAL COM CURIOSIDADE] + [O QUE SE RESOLVE ASSISTINDO]
```

Os três pilares precisam caber **antes do caractere 55**. Pilar depois do corte
existe no Studio e não existe para quem rola a tela.

Verificação obrigatória:

```bash
python apps/regra-de-3/gerador.py --diagnostico "TÍTULO" --thumb "TEXTO DA THUMB"
```

Nota mínima para publicar: **70**. Risco: **A, B1 ou B2** — nunca B3.

## As molduras

| Padrão | Forma | Exemplo | Quando usar |
|---|---|---|---|
| **A** | afirma o fato | `AGORA! Abel fora, e o Palmeiras não aceita o veredito` | fato confirmado por 2+ veículos |
| **B1** | pergunta o incerto | `Whey proibido de vender?! O que se sabe` | notícia ainda não confirmada |
| **B2** | insinua reação | `STJD julga e o Flamengo não passou batido` | há reação real, mas sem declaração literal |
| ~~B3~~ | inventa fala | — | **bloqueado no motor** |

## Gatilhos de imediatismo já usados

`AGORA!` · `URGENTE!` · `BOMBA!` · `A CASA CAIU!` · `ACABOU!` · `PLANTÃO URGENTE!`
· `REVIRAVOLTA!` · `CONFIRMADO!` · `SAIU AGORA!`

Rodar o mesmo gatilho dois dias seguidos gasta o gatilho. O motor já ordena por
nota, mas a escolha entre empatados deve preferir o menos usado na semana.

## Histórico

| Data | Padrão | Nota | Título | Thumb |
|---|---|---|---|---|
| 2026-09-04 | A | 100 | AGORA! Abel fora, e o Palmeiras não aceita o veredito | ABSOLVIÇÃO VIROU 2 JOGOS |

*(o primeiro é prova de pipeline; ainda não publicado)*
