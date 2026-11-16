# Embalagem — Abel Ferreira punido pelo STJD

**Job:** `2026-09-04-abel-stjd` · **Canal:** futebol (dark) · **Estágio:** packaging
**Gerado por:** `/pauta-futebol` → `/packaging` · **Pontuado por:** `apps/regra-de-3/pilares.py`

---

## Escolhido

> ## AGORA! Abel fora, e o Palmeiras não aceita o veredito

**Thumb:** `ABSOLVIÇÃO VIROU 2 JOGOS`

```
53 caracteres · nota 100/100 · risco A
  imediatismo  sim   "agora"
  curiosidade  sim   "não aceita" (contra-expectativa)
  resolucao    sim   "o veredito"
  corte        os três pilares cabem antes do caractere 55
  thumb        0% de repetição do título
```

**Por que este.** Os três pilares cabem inteiros no que o feed mostra — foi o
defeito que derrubou o CTR do canal estoico, onde `(EFEITO IMEDIATO)` ficou no
caractere 70. E a thumb não repete uma palavra do título: ela carrega o ângulo
mais forte da pauta, que o título não tem espaço para dizer.

---

## Promessa

> Em 45 segundos o espectador sabe que Abel pegou dois jogos por chutar um
> microfone, que fica fora contra o Botafogo no domingo, e que o Palmeiras já vai
> pedir efeito suspensivo para tê-lo de volta.

## Âncora

| Afirmação | Fonte |
|---|---|
| dois jogos de suspensão por chutar microfone | ge.globo — "Abel Ferreira é punido com dois jogos de suspensão por chutar microfone" |
| no empate com o Mirassol, 25ª rodada | mesma matéria |
| desfalca contra o Botafogo (domingo, 18h30) | ge.globo — "Palmeiras prepara mudanças na escalação para enfrentar Botafogo" |
| Palmeiras vai pedir efeito suspensivo | ge.globo — "Palmeiras vai recorrer e pedir efeito suspensivo" |
| **julgamento começou com pedido de absolvição e virou depois da pausa** | UOL / PVC — "Abel punido por dois jogos ficou de tamanho justo" |

A última linha é a que sustenta a thumb. Ela é **verificada**, e é por isso que
pode ir ao ar — a mesma frase sem essa fonte seria invenção.

---

## Os outros candidatos, e por que perderam

| Nota | Risco | Título | O que falhou |
|---|---|---|---|
| 80 | A | URGENTE! Abel punido, e o Palmeiras não aceita a decisão | 56 caract. — um pilar cai depois do corte |
| 80 | A | BOMBA! Abel suspenso e o Palmeiras não aceita o veredito | mesmo problema, por 1 caractere |
| 70 | B1 | URGENTE! STJD pune Abel e o Palmeiras não aceita | perde a resolução — não diz o que se ganha assistindo |
| 70 | A | AGORA! Abel suspenso e o Palmeiras não vai aceitar | "vai aceitar" enfraquece o imediatismo |
| 40 | A | A CASA CAIU! Abel suspenso e o Verdão já vai recorrer | sem curiosidade: a frase se resolve sozinha |

### O que foi barrado

```
Abel detona STJD: "isso é perseguição" e Palmeiras vai recorrer
  nota 30/100 · risco B3   ← DESCARTADO PELO MOTOR
  risco  FALA ENTRE ASPAS NÃO CONFIRMADA junto de nome próprio: "isso é perseguição"
```

Abel não disse isso. O motor conferiu contra `verificado` e barrou sozinho — a
recusa é mecânica, não editorial.

---

## Especificação da thumb

```yaml
texto_principal: 'ABSOLVIÇÃO VIROU 2 JOGOS'
texto_secundario: 'SEM ELE NO DOMINGO'
elemento_visual: 'Abel Ferreira à beira do campo + escudo do Palmeiras + martelo/mesa do STJD'
emocao: 'indignação contida'
layout: 'variante_confronto — Abel à esquerda, mesa do STJD à direita'
cores:
  fundo: '#0C240C'
  texto_principal: '#FCFCFC'
  realce: '#FCCC0C'      # só em "2 JOGOS" — o amarelo carrega UMA coisa
selo: 'bola do logo, canto inferior esquerdo'
sistema: 'workspaces/businesses/virals/creative-studio/canais/bora-de-bola/thumb-system.yaml'
```

> **Desbloqueado em 2026-09-04.** O canal **Bora de Bola** foi fundado —
> `channel-brief.yaml`, `thumb-system.yaml`, `voice-lock.yaml`,
> `title-patterns.md` e `fontes-confiaveis.md` existem. Este job deixa de ser só
> prova de pipeline e pode seguir para roteiro.
>
> Note que a cor do clube **saiu** da especificação: pelo sistema, cor de clube
> não domina o fundo. A thumb é do canal, não do time.

---

## Para o roteiro

O `@head-of-copy` recebe a promessa acima, não um resumo. A estrutura vem de
`ANALISE-REFERENCIA.md`:

| Trecho | Tempo | Conteúdo |
|---|---|---|
| Gancho | 0:00–0:45 | a punição inteira, em uma frase, nos primeiros 10 segundos |
| Números | 0:45–1:15 | 2 jogos, 25ª rodada, empate com o Mirassol, domingo 18h30 |
| Índice | 1:15–1:45 | três promessas: o recurso, o jogo com o Botafogo, o que virou no julgamento |
| Abertura | 1:45–2:10 | vinheta |
| CTA | 2:10–2:45 | com justificativa |
| Blocos | 2:45–11:30 | recurso → escalação sem Abel → **os bastidores do julgamento** |
| Fecho | 11:30–12:30 | citação do PVC e despedida |

Duração-alvo **10 a 13 min** a **134 palavras/min** ≈ 1.600 palavras. O motor de
voz fala a 171,6 — precisa ser desacelerado, ou o roteiro sai com 9m20.
