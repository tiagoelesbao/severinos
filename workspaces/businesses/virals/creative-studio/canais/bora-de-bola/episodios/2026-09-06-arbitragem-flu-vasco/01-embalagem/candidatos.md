# Futebol 06/09 — candidatos de título e thumb, para escolha

> **Nicho de NOTÍCIA.** O método da skill `/packaging` diz que aqui o fato já tem
> forma de manchete e **o motor por molde basta** — não se convocam os copywriters
> em fases, como no estoico. O julgamento é o mesmo pontuador.

## O fato que alimenta o molde

```json
{
  "sujeito": "o árbitro",
  "acao_curta": "engole pênalti e vermelho",
  "alvo": "o Fluminense",
  "alvo_reage": true,
  "consequencia": "o Fluminense venceu por 1 a 0 e reclamou mesmo assim"
}
```

**Correção que mudou tudo:** na primeira rodada eu havia posto o Vasco como `alvo`,
e o molde gerou `O Vasco peita` — que é **falso**: quem reclamou foi o Hulk, do
Fluminense. O erro não era do gerador, era do fato que eu dei a ele. Com o alvo
certo, `o Fluminense peita` passa a ser verdade.

---

## Os candidatos

| # | Est. | Origem | Nota | Risco | Ch | Título |
|---|---|---|---|---|---|---|
| **1** | A | autoral | **100** | B2 | **46** | AGORA: Hulk ganhou e detona o árbitro. Entenda |
| **2** | A | autoral | **100** | B2 | 65 | AGORA: o Flu ganhou e detona o árbitro. Entenda o que a Globo viu |
| **3** | B2 | autoral | **100** | **A** | 65 | AGORA: ganhou e não ficou calado. Entenda o que o árbitro não viu |
| **4** | A | molde | 80 | A | 82 | BOMBA! O árbitro não marcou o pênalti e o vermelho na reta final e veja o desfecho |
| **5** | B2 | molde | 70 | B2 | 72 | BOMBA! O Fluminense peita depois que o árbitro engole pênalti e vermelho |
| 6 | B1 | autoral | 60 | B1 | 69 | ERA PÊNALTI NO ÚLTIMO LANCE?! Entenda por que o Flu ganhou reclamando |
| 7 | B1 | molde | 50 | B1 | 56 | O árbitro engole pênalti e vermelho?! entenda o que muda |

### Os três pilares, candidato a candidato

| # | Imediatismo | Curiosidade | Resolução |
|---|---|---|---|
| **1** | `agora` | `detona` (tensão) | `entenda` |
| **2** | `agora` | `o que` + `detona` | `entenda` |
| **3** | `agora` | `o que` + `não` (contra-expectativa) | `entenda` |
| **4** | `bomba` (ruptura) | `não` (contra-expectativa) | `o desfecho` |
| **5** | `bomba` (ruptura) | `peita` (tensão) | **FALTA** |
| 6 | **FALTA** | `por que` | `entenda` |
| 7 | **FALTA** | `o que` | `que muda` + `entenda` |

### As thumbs

| # | Thumb | O que ela mata |
|---|---|---|
| 1 | `ERA PÊNALTI E VERMELHO` | "reclamou de quê, se ganhou?" |
| 2 | `ERA PÊNALTI E VERMELHO` | idem |
| 3 | `PÊNALTI E VERMELHO` | idem |
| 4 | `GANHOU E RECLAMOU` | "por que isso é notícia?" |
| 5 | `NÃO FICOU CALADO` | "quem reclamou?" |

---

## Uma correção ao que eu te disse antes

Reportei o candidato 1 como **risco A**. Com o `verificado` completo carregado no
pontuador, ele classifica como **B2** — porque `detona` insinua reação. B2 é
**liberado** pelo gate (só B3, que inventa fala e atribui a nome real, é
descartado no motor), mas a classificação estava errada no que te passei.

O candidato **3** é o único de nota 100 com **risco A**.

## Gate de packaging

| Item | Situação |
|---|---|
| Nota ≥ 70 | ✅ candidatos 1 a 5 |
| 3 pilares antes do caractere 55 | ✅ no candidato 1 (46 ch); os outros usam a cauda |
| Risco ≠ B3 | ✅ nenhum inventa fala |
| Promessa ancorada | ✅ `00-pauta/fato.json`, 6 fontes |
| Thumb complementar | ✅ 0% de repetição |
| 3 estruturas distintas | ✅ A, B1 e B2 |
| ≤ 100 caracteres | ✅ |

## Minha recomendação

**Candidato 1** — `AGORA: Hulk ganhou e detona o árbitro. Entenda`

**Por quê:** 46 caracteres significa que os três pilares **e** o nome que puxa o
clique (Hulk) cabem inteiros antes do corte do feed, com folga. E carrega o que a
história tem de contra-intuitivo: quem ganhou é quem reclama.

**Se você preferir risco A**, vá no candidato 3 — mesma nota, mesma ideia, sem a
palavra `detona`.

**O que eu descartaria:** o 4, apesar dos 80 — tem 82 caracteres e `veja o desfecho`
é vago; e o 7, que perde o imediatismo inteiro.

---

## Depois da sua escolha

O roteiro **já está escrito** (827 palavras, narração pronta e auditada). Pelo
pipeline oficial ele deveria ter nascido *da* promessa do título — e nasceu do
título que eu escolhi sozinho. **Se você escolher um candidato diferente do 1, eu
revalido o roteiro contra a nova promessa** antes de seguir para b-roll e
montagem. A narração levaria ~4 min para refazer, com o cache aproveitando os
blocos que não mudarem.
