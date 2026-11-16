# LA3 · "O tempo que ainda sobra" — embalagem

**Canal:** Modern Estoicism · **Roteiro:** `squads/oraclumtech-ai-creative-studio/data/roteiros/estoico/LA3-tempo.md`
**Duração:** ~19m53s · **Formato do documento:** `apps/regra-de-3/FORMATO-EMBALAGEM.md`

> **Base das palavras-alvo:** observação dos títulos dos canais de referência
> (`assets/image copy 91.png` … `95.png`), **não medição de volume de busca**.
> Não há Keyword Planner, Semrush, Ahrefs, Google Trends nem API de busca
> configurada neste repositório — verificado em 2026-09-04. Nenhum número de
> volume aparece neste documento porque nenhum existe.

---

## O diagnóstico que este documento tenta corrigir

CTR de **2,4%** em 2,5 mil impressões. Rodando os dois títulos publicados pelo
pontuador, os defeitos são específicos e não são "o título estava fraco":

- **`(EFEITO IMEDIATO)` no caractere 70.** O pilar do imediatismo existia — e
  ficava depois do corte do feed. Nota 65 em vez de 100 só por causa da posição.
- **50% de repetição entre título e thumb.** Metade do espaço de venda gasto
  dizendo a mesma coisa duas vezes.

Nenhum dos oito candidatos abaixo repete qualquer um dos dois.

---

## 1 · Candidatos de título

Thumb travada em **`NENHUMA DELAS É ACORDAR CEDO`** para todos, porque comparar
título com thumb diferente compara a dupla, não o título.

Comando: `python apps/regra-de-3/gerador.py --diagnostico "…" --thumb "…"`

#### C1 — recomendado
```
EM 7 DIAS VOCÊ RECUPERA HORAS QUE NINGUÉM TE DEVOLVE | 6 práticas estoicas sobre o tempo
  88 caracteres · nota 100/100 · risco A
  imediatismo  sim  prazo: em \d+ (minutos?|horas?|dias?|segundos?|semanas?)
  curiosidade  sim  contra_expectativa: ninguem 
  resolucao    sim  beneficio: recupera
  thumb        0% das palavras repetem o titulo
```

#### C2
```
QUANTO DO SEU DIA NÃO É SEU? em 7 dias você recupera horas | práticas estoicas sobre o tempo
  92 caracteres · nota 100/100 · risco B1
  imediatismo  sim  prazo: em \d+ (minutos?|horas?|dias?|segundos?|semanas?)
  curiosidade  sim  lacuna: quanto, contra_expectativa: nao 
  resolucao    sim  beneficio: recupera
  thumb        0% das palavras repetem o titulo
  risco        pergunta em vez de afirmacao — nao e assercao
```

#### C3
```
O QUE SÊNECA FAZIA TODO DIA PARA NÃO PERDER TEMPO — 6 práticas estoicas sobre o tempo
  85 caracteres · nota 100/100 · risco A
  imediatismo  sim  agora: todo dia
  curiosidade  sim  lacuna: o que, contra_expectativa: nao 
  resolucao    sim  beneficio: para
  thumb        0% das palavras repetem o titulo
```

#### C4
```
EM 7 DIAS: 6 práticas estoicas para o tempo que ninguém te ensina
  65 caracteres · nota 100/100 · risco A
  imediatismo  sim  prazo: em \d+ (minutos?|horas?|dias?|segundos?|semanas?)
  curiosidade  sim  lacuna: o que, segredo: ninguem te ensina
  resolucao    sim  beneficio: para
  thumb        0% das palavras repetem o titulo
```

#### C5
```
COMECE HOJE: 6 práticas estoicas para não perder mais o seu tempo
  65 caracteres · nota 100/100 · risco A
  imediatismo  sim  ruptura: comece hoje, agora: hoje
  curiosidade  sim  contra_expectativa: nao 
  resolucao    sim  beneficio: para
  thumb        0% das palavras repetem o titulo
```

#### C6
```
EM 7 DIAS VOCÊ RECUPERA O TEMPO QUE NINGUÉM TE DEVOLVE
  54 caracteres · nota 100/100 · risco A
  imediatismo  sim  prazo: em \d+ (minutos?|horas?|dias?|segundos?|semanas?)
  curiosidade  sim  lacuna: o que, contra_expectativa: ninguem 
  resolucao    sim  beneficio: recupera
  thumb        0% das palavras repetem o titulo
```

#### C7
```
EM 7 DIAS VOCÊ VÊ O QUE ROUBA AS SUAS HORAS — e recupera o que dá para recuperar
  80 caracteres · nota 80/100 · risco A
  imediatismo  sim  prazo: em \d+ (minutos?|horas?|dias?|segundos?|semanas?)
  curiosidade  sim  lacuna: o que
  resolucao    sim  beneficio: para
  corte        1 dos 3 pilares ficam DEPOIS do corte do feed
               visivel: "EM 7 DIAS VOCÊ VÊ O QUE ROUBA AS SUAS HORAS — e recuper…"
  thumb        0% das palavras repetem o titulo
```

#### C8
```
PARE DE PERDER O SEU DIA: em 7 dias você recupera horas que ninguém devolve
  75 caracteres · nota 75/100 · risco A
  imediatismo  sim  ruptura: pare de, prazo: em \d+ (minutos?|horas?|dias?|segundos?|semanas?)
  curiosidade  sim  contra_expectativa: ninguem 
  resolucao    sim  beneficio: recupera
  corte        1 dos 3 pilares ficam DEPOIS do corte do feed
               visivel: "PARE DE PERDER O SEU DIA: em 7 dias você recupera horas…"
  thumb        0% das palavras repetem o titulo
```

---

### Referência: o título já publicado, pela mesma régua
```
6 RITUAIS SECRETOS QUE OS ESTÓICOS USAVAM PARA LIDAR COM A ANSIEDADE (EFEITO IMEDIATO)
  86 caracteres · nota 65/100 · risco A
  imediatismo  sim  prazo: imediato
  curiosidade  sim  segredo: secreto
  resolucao    sim  beneficio: para
  corte        1 dos 3 pilares ficam DEPOIS do corte do feed
               visivel: "6 RITUAIS SECRETOS QUE OS ESTÓICOS USAVAM PARA LIDAR CO…"
  thumb        50% das palavras repetem o titulo  ← desperdicio
```


---

## 2 · O vencedor, e por quê

**C1** — `EM 7 DIAS VOCÊ RECUPERA HORAS QUE NINGUÉM TE DEVOLVE | 6 práticas estoicas sobre o tempo`

Seis candidatos empataram em 100/100. O desempate não foi opinião:

| Critério | Por que C1 |
|---|---|
| Frase-alvo literal no título | é o único 100/A que contém `práticas estoicas sobre o tempo` inteira |
| Trinca antes do caractere 55 | os 55 visíveis são `EM 7 DIAS VOCÊ RECUPERA HORAS QUE NINGUÉM TE DEVOLVE` — promessa completa, sem depender da cauda |
| Risco | A. C2 é B1 (pergunta) e é seguro também, mas o nicho pergunta pouco |
| Fidelidade ao roteiro | o vídeo diz literalmente *"a clareza, sozinha, já devolve horas"* e *"o tempo é o único bem que não tem devolução"* — o título é as duas frases juntas |
| Sufixo | `| 6 práticas estoicas…` cumpre a função que `| Estoicismo` cumpre em 8 dos 9 títulos do print 91 |

**Por que não os outros:**

- **C2** (B1) — a pergunta funciona, mas `?` num nicho contemplativo soa a
  canal de dica. Guardar para um episódio de tema polêmico.
- **C3** — 100/A, e a frase-alvo cabe. Mas afirma um hábito diário de Sêneca
  que o roteiro não sustenta: o roteiro cita a *carta 1 a Lucílio* e o *De
  Brevitate Vitae*, não uma rotina. É risco A pelo pontuador e **imprecisão
  histórica pela Constituição (Art. IV, sem invenção)**. Descartado por isso,
  não pela nota.
- **C4, C5** — 100/A e curtos, mas não contêm a frase-alvo completa. Bons
  substitutos se a decisão for por título curto.
- **C6** — 54 caracteres, o título inteiro cabe antes do corte. É o mais
  eficiente do lote e o mais fraco de SEO: nenhuma palavra do nicho nele.
  Vale como teste A/B contra C1.
- **C7, C8** — perdem um pilar depois do corte. É exatamente o defeito de
  `(EFEITO IMEDIATO)` que estamos corrigindo.

---

## 3 · Pacote pronto para publicar

### Frase-alvo

```
práticas estoicas sobre o tempo
```

Aparece nos três lugares exigidos: título (cauda), primeiros 150 caracteres da
descrição, primeira tag.

### Título

```
EM 7 DIAS VOCÊ RECUPERA HORAS QUE NINGUÉM TE DEVOLVE | 6 práticas estoicas sobre o tempo
```
88 caracteres · nota 100/100 · risco A · três pilares antes do caractere 55.

### Thumb

```
NENHUMA DELAS É ACORDAR CEDO
```
Repetição sobre o título: **0%**. A thumb mata a objeção que o título não teve
espaço para matar — e é a promessa que o roteiro cumpre literalmente:
*"Seis práticas, e nenhuma delas pede que você acorde mais cedo."*

### Descrição

Os primeiros 150 caracteres (o que aparece na busca) estão antes da primeira
quebra de linha e contêm a frase-alvo inteira.

```
6 práticas estoicas sobre o tempo, cada uma com um desafio de 7 dias. Nenhuma delas é acordar mais cedo: todas são sobre parar de perder o tempo que você já tem.

Sêneca tratou o tempo como propriedade — e daí tirou uma conclusão dura: quem não sabe onde o tempo foi parar não tem uma agenda cheia, tem uma conta que nunca fez. Marco Aurélio escrevia à noite, em campanha, a mesma coisa por outro caminho.

São seis operações de administração, não reflexões sobre a brevidade da vida. Todas têm prazo de sete dias.

CAPÍTULOS
0:00  A conta que ninguém faz
3:02  1 · Faça a conta antes de fazer o plano
5:15  2 · Corte o que rouba sem pedir
7:37  3 · Trate o adiamento como o único perigo
10:02 Três já são um método
11:14 4 · Faça uma coisa por vez, inteira
13:42 5 · Escolha a companhia com o mesmo critério
15:59 6 · Lembre do fim para escolher o dia
18:26 O que fazer se você só fizer uma coisa

FONTES CITADAS
Sêneca, "Sobre a brevidade da vida" (De Brevitate Vitae)
Sêneca, "Cartas a Lucílio", carta 1
Marco Aurélio, "Meditações"

Comenta aqui embaixo: hoje eu faço a conta do meu tempo.

#estoicismo #seneca #marcoaurelio
```

**Como os timestamps foram derivados:** contagem de palavras por seção do
roteiro ÷ 171,6 WPM (o ritmo medido do motor de voz `03-male-02`). Fecha em
19:53 contra os 19:57 do frontmatter — 4 segundos de desvio em 20 minutos.
**Conferir contra a locução real antes de publicar**; os capítulos são o único
item do pacote que muda se a narração mudar.

### Tags

19 tags · 395 caracteres · da mais específica para a mais genérica.

```
práticas estoicas sobre o tempo, estoicismo sobre o tempo, sêneca sobre o tempo, como não perder tempo estoicismo, sêneca a brevidade da vida, marco aurélio tempo, filosofia estoica tempo, como organizar o tempo estoicismo, parar de procrastinar estoicismo, adiamento sêneca, reflexões estoicas, práticas estoicas, hábitos estoicos, estoicismo diário, cartas a lucílio, sêneca, marco aurélio, epicteto, estoicismo
```

---

## 4 · De onde vieram as palavras-alvo

Corpus: os títulos legíveis nos quatro canais distintos dos prints (91, 92, 93,
94/95). O que se repete:

| Padrão observado | Exemplos |
|---|---|
| Sufixo de categoria após `\|` | `\| Estoicismo` em 8 de 9 títulos do print 91; `\| ESTOICISMO`, `\| Stoicism Philosophy` |
| Adjetivo `estoic-` colado ao substantivo | atitudes estoicas, reflexões estoicas, segredos estoicos, regra estoica, arte estoica |
| Numeral na frente | 5, 6, 7, 8, 10, 12 |
| Nome do autor como segundo `\|` | `\| Sêneca`, `\| A Filosofia de Nietzsche` |
| Cláusula de benefício com "para" | para vencer qualquer provocação, para nada destruir sua paz |
| Âncora de ritual | todas as manhãs, ao amanhecer, hábitos diários, empieza el día |

**O sinal mais direto que os prints dão sobre o nosso tema — e é desconfortável:**
o print 92 traz um concorrente exatamente sobre tempo — *"A 1 Regra Estoica que
Mudará como Você Usa o Seu Tempo | Sêneca"* — com **1,3 mil views em 2 semanas e
1 VPH**, o pior daquela grade, onde outro vídeo do mesmo canal marca 28 VPH.
É um ponto só, do canal de outra pessoa, e não prova nada sozinho. Mas registra
que o tema *tempo* não é o mais fácil do nicho, e que a embalagem dele
(afirmação genérica, sem prazo, sem objeção morta) é justamente a que estamos
evitando.

---

## 5 · Pendências e decisões para revisar

1. **Sufixo do título.** Optei por `| 6 práticas estoicas sobre o tempo` em vez
   do `| Estoicismo` que o nicho usa, porque a frase-alvo pesa mais que a
   categoria e as duas não cabem. Se preferir a categoria, C4 ou C5 aceitam o
   sufixo `| Estoicismo` sem perder nota.

2. **C6 como teste A/B.** 54 caracteres, título inteiro visível no feed, zero
   palavra de SEO. Se o canal vive de sugeridos (o normal em dark) e não de
   busca, C6 pode bater C1. Não temos como saber sem rodar.

3. **Capítulos.** Derivados por contagem de palavras, não pela locução.
   Reconferir depois do render.

4. **Estilo de thumb.** Cinco desenhos renderizados em
   `apps/canal-estoico/estilos/`; a folha de validação é
   `apps/canal-estoico/estilos/FOLHA-DE-VALIDACAO.html`. Recomendação e
   pendências em `apps/canal-estoico/PADRAO-VISUAL.md`.

5. **Léxico do pontuador.** Acrescentei gatilhos do nicho de utilidade a
   `apps/regra-de-3/pilares.py` (imperativo, ritual diário, prazo sem
   preposição, omissão de ensino, recuperação). Cada acréscimo está comentado
   com o porquê. Os quatro casos de referência do arquivo continuam com as
   mesmas notas — sem regressão. **O critério de risco não foi tocado.**
