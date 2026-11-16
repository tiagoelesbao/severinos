# Guia de dias de jogo — grade do canal

Levantado em **2026-09-04** varrendo 21 dias do calendário da ESPN em 64 ligas.
Nada aqui vem de memória: dias, horários e volume saíram da API.

Horários em **Brasília**. Para regerar: `python apps/pauta-futebol/mapa_ligas.py`

---

## 1. Brasil — o que alimenta o pós-jogo

| Liga | Código | Jogos/21d | Dias fortes | Horário |
|---|---|---|---|---|
| **Brasileirão A** | `bra.1` | 31 | sáb, dom, qua | 11h–21h (pico 16h e 18h) |
| **Brasileirão B** | `bra.2` | 39 | **seg a qui**, sex | 11h–21h (pico 19h e 21h) |

**A Série B é o insumo mais subestimado do canal.** Ela joga **39 jogos** contra 31
da Série A na mesma janela, e joga de **segunda a quinta** — exatamente os dias em
que a Série A não joga e o canal fica sem pauta de pós-jogo.

Copa do Brasil, Carioca e Paulista **não têm cobertura na ESPN**. Se virarem
necessidade, precisam de outra fonte.

### O ciclo semanal do pós-jogo

| Dia | O que rende |
|---|---|
| **dom noite / seg manhã** | a rodada da Série A — o pico da semana |
| **seg a qui** | Série B, todo dia |
| **qua / qui** | Libertadores e Sul-Americana (19h e 21h) |
| **sex** | quase nada de Brasil — é dia de **mercado da bola**, não de pós-jogo |

Sexta é o dia em que a esteira vive do RSS. Foi o que a gente viu na prática hoje.

---

## 2. Lives — a pergunta certa não é "onde tem jogo"

Tem jogo em quase toda hora. A pergunta que decide a grade é **onde tem jogo e
não tem canal brasileiro transmitindo**.

O mapa abaixo é de 21 dias e 44 ligas. O número entre parênteses são os jogos em
ligas **pouco disputadas** por canal brasileiro de live.

```
     SEG        TER        QUA        QUI        SEX        SÁB        DOM
00h   ·          ·          ·          ·          ▪(1)       ▓(4)       ▪(3)
01h–05h  ·············· deserto em todos os dias ··············  05h dom ▪(2)
06h   ·          ·          ·          ·          ·          ▓(7)       ▓(6)
07h   ·          ▓(4)       ▪(1)       ·          ▪(2)       ▓(8)       ▓(8)
08h   ·          ·          ·          ·          ▪(1)       █(25)      █(21)
09h   ·          ▪(2)       ▪(1)       ·          ·          █(10)      █(27)
10h   ▪(1)       ·          ·          ▪(1)       ·          █(19)      █(16)
11h   ·          ·          ·          ·          ·          █(48)      █(27)
12h   ▪(2)       ▪(2)       ▪(3)       ▪(2)       ▪(3)       █(17)      █(20)
13h   ▓(3)       ▓(2)       ▓(2)       ▓( )       ▓(7)       █(22)      █(18)
14h   █(12)      ▪( )       ▓(4)       ▪(2)       █(16)      █(15)      █(22)
15h   █(10)      █(15)      ▓(5)       █(13)      █(30)      █(32)      █(40)
16h   ▓(4)       ▓(2)       █(4)       █(1)       █(7)       █(16)      █(13)
17h   ·          ·          ▪(1)       ·          ▓(3)       ▓(3)       █(6)
18h   ▪(1)       ▪(1)       ▪(1)       ·          ▪(2)       █(8)       █(10)
19h   ▓(2)       ▓( )       ▓(2)       ▪(1)       ▓(2)       ▓(2)       █(5)
20h   ▓(4)       ▪(1)       ▓(6)       ·          ▓(5)       █(50)      ▓(9)
21h   ▓(3)       ▓( )       █(7)       ▓(1)       ▓(4)       █(13)      ▓(6)
22h   ▪(1)       ▪(2)       ▪(3)       ▪(1)       ▓(6)       █(18)      ▓(4)
23h   ·          ·          ▓(4)       ·          ▪(1)       █(13)      ▪(1)

·  sem jogo     ▪  1-3     ▓  4-9     █  10+
```

### Os cinco melhores buracos

| # | Janela | Jogos livres | O que está em campo |
|---|---|---|---|
| 1 | **sáb 20h** | **50** | MLS, USL, sul-americanas — o Brasileirão já acabou ou nem começou |
| 2 | **sáb 11h** | **48** | Championship, LaLiga 2, Serie B ITA, 2. Bundesliga |
| 3 | **dom 15h** | **40** | Europa de 2ª linha inteira ao mesmo tempo |
| 4 | **sex 15h** | **30** | Ligue 2 (16 jogos numa sexta), Rússia, Saudita |
| 5 | **sáb/dom 08h–09h** | **25 e 27** | Championship + China + Europa cedo |

### O horário que ninguém disputa

**Sábado e domingo, 06h–07h: a J-League.** 30 jogos em 21 dias, todos entre
**05h e 07h** de Brasília. Nenhum canal brasileiro de live acorda a essa hora, e
o apostador que segue mercado asiático está desperto.

Mesma lógica na **terça e quarta, 07h**: AFC Champions, 16 jogos, zero
concorrência. E na **China, sáb/dom 08h–09h**.

### Onde NÃO ir

| Janela | Por quê |
|---|---|
| ter/qua/qui **16h** | Champions e Europa League — todo canal grande está lá |
| dom **18h–21h** | Brasileirão A, o horário mais disputado do país |
| sáb **16h** | Premier League + LaLiga simultâneas |

---

## 3. As ligas, por região

### América do Sul — o fuso amigo

| Liga | Código | Jogos | Dias | Horário |
|---|---|---|---|---|
| Argentina | `arg.1` | 45 | sáb (14), dom, seg, sex | 13h–21h |
| Colômbia | `col.1` | 33 | espalhado | 15h–22h |
| Venezuela | `ven.1` | 28 | **dom (24)** | 15h–20h |
| Peru | `per.1` | 26 | sáb (11), dom, sex | 12h–22h |
| Bolívia | `bol.1` | 24 | ter a sex | 16h–21h |
| Paraguai | `par.1` | 18 | **qui (12)** | 10h–18h |
| Chile | `chi.1` | 17 | sáb, dom | 12h–21h |
| Uruguai | `uru.1` | 16 | sáb, dom | 10h–19h |
| Equador | `ecu.1` | 16 | seg, dom | 15h–21h |

**Venezuela concentra 24 dos 28 jogos num domingo só** e **Paraguai concentra 12
numa quinta** — duas grades inteiras de live num dia, com concorrência quase nula.

### América do Norte — o fim da noite

| Liga | Código | Jogos | Dias | Horário |
|---|---|---|---|---|
| **MLS** | `usa.1` | 60 | **sáb (39)**, qua (15) | 18h–23h |
| USL Championship | `usa.usl.1` | 39 | sáb, dom | 13h–23h |
| Liga MX | `mex.1` | 25 | sáb, dom | **00h**–23h |

MLS é o maior volume de todos: **60 jogos**, quase todos no sábado à noite, quando
o Brasileirão já saiu do ar.

### Europa top — muito público, muita briga

Premier `eng.1` (30), LaLiga `esp.1` (39), Serie A `ita.1` (30), Bundesliga
`ger.1` (27), Ligue 1 `fra.1` (26), Champions `uefa.champions` (18), Europa
`uefa.europa` (18). Todas entre **07h e 16h**, sáb/dom e ter/qua/qui.

São as de maior audiência e as de maior concorrência. Entrar aqui só faz sentido
com um diferencial de overlay — que é justamente o que a gente tem.

### Europa 2ª linha — o melhor custo-benefício

| Liga | Código | Jogos | Nota |
|---|---|---|---|
| **Championship (ING)** | `eng.2` | **47** | 2º maior volume do levantamento |
| LaLiga 2 | `esp.2` | 33 | sáb (15) |
| Eredivisie | `ned.1` | 30 | |
| Serie B (ITA) | `ita.2` | 30 | |
| Portugal | `por.1` | 29 | idioma facilita a narração |
| 2. Bundesliga | `ger.2` | 27 | |
| **Ligue 2** | `fra.2` | 27 | **16 jogos numa sexta** |
| Bélgica | `bel.1` | 27 | |
| Turquia | `tur.1` | 27 | volume alto de aposta |
| Suécia `swe.1` (25) · Noruega `nor.1` (24) · Rússia `rus.1` (24) · Grécia `gre.1` (22) · Dinamarca `den.1` (18) · Escócia `sco.1` (17) · Áustria `aut.1` (12) | | | |

Sem cobertura na ESPN: Suíça, Polônia, Tchéquia, Romênia, Ucrânia, Croácia,
Sérvia, Conference League.

### Ásia — a madrugada

| Liga | Código | Jogos | Dias | Horário |
|---|---|---|---|---|
| **J-League** | `jpn.1` | 30 | sáb (15), dom (13) | **05h–07h** |
| Saudi Pro League | `ksa.1` | 24 | seg a sex | 12h–15h |
| AFC Champions | `afc.champions` | 16 | **seg (6), ter (8)** | 07h–15h |
| Super League (CHN) | `chn.1` | 11 | sáb, dom | 08h–09h |

Sem cobertura: K-League, A-League, Emirados, Catar, Indonésia, Índia.

### África

África do Sul `rsa.1` (22 jogos, 10h–15h). Egito e Marrocos sem cobertura.

---

## 4. Grade sugerida

Combinando volume, ausência de concorrência e o custo de operar:

| Dia | Janela | Conteúdo | Por quê |
|---|---|---|---|
| **sáb** | 08h–12h | Championship + LaLiga 2 + 2. Bundesliga | 25 a 48 jogos livres por hora |
| **sáb** | 20h–23h | MLS + USL + Liga MX | 50 jogos livres às 20h |
| **dom** | 08h–12h | Europa 2ª linha | 21 a 27 jogos livres |
| **dom** | 15h | Venezuela (24 jogos num dia) + Europa 2ª | 40 livres |
| **sex** | 15h | Ligue 2 (16 jogos) + Rússia + Saudita | 30 livres, e o Brasil não joga |
| **qui** | 10h–18h | Paraguai (12 jogos numa quinta) | grade inteira, zero briga |
| **ter** | 07h | AFC Champions | nicho, mas ninguém disputa |
| **sáb/dom** | 06h–07h | J-League | o horário que ninguém acorda |

**Não comece pelas cinco grandes.** O overlay é o diferencial, mas contra canal
consolidado ele não compensa a diferença de inscritos. Comece onde não há
ninguém, acumule reconhecimento, e só então dispute a Premier.

---

## 5. Como isso conversa com o resto

| Frente | Consome deste guia |
|---|---|
| `/pauta-futebol --so jogo` | os dias de Brasileirão A e B, para saber quando há pós-jogo |
| `/pauta-futebol --so rss` | sexta e segunda, quando o mercado da bola manda |
| Live (`apps/live-futebol`) | a grade da seção 4, e o código da liga para `--liga` |

Para subir uma live de qualquer liga da tabela:

```bash
python apps/live-futebol/servidor.py --procurar     # o que está em campo agora
python apps/live-futebol/servidor.py <id> --liga <código> --narrar
```

O `--procurar` hoje varre 19 ligas. Para alcançar as da seção 3, acrescente os
códigos em `LIGAS_BUSCA`, no topo de `servidor.py`.

---

## Ressalvas

- **Janela de 21 dias.** Calendário de futebol tem data FIFA, copa e feriado. O
  número de jogos por dia varia; o **padrão de dias e horários** é estável.
- **Cobertura da ESPN não é cobertura de aposta.** Uma liga sem cobertura aqui
  pode ter mercado ativo em casa de aposta — mas sem dado não há overlay, e sem
  overlay a live não tem o diferencial.
- **Horário de verão do hemisfério norte** desloca a Europa em 1 h entre março e
  outubro. Os horários acima são de setembro.
