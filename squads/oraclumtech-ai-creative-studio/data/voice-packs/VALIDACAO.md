# Validação do banco de vozes

> Marque **um** dos três estados por amostra. Se marcar **Validado com observação**,
> preencha o campo de observação logo abaixo — é ele que vira regra no squad.
>
> Todas as amostras dizem a MESMA frase, para a comparação ser justa:
> *"Marco Aurélio governava o maior império do mundo. E escrevia, todas as noites,
> um diário que nunca pretendeu publicar. Nele, não há ordens. Há dúvidas. O homem
> mais poderoso de Roma passava as madrugadas tentando convencer a si mesmo a ser
> melhor no dia seguinte."*
>
> **O que o WER não mede:** sotaque, timbre, emoção, naturalidade das pausas.
> Isso é exatamente o que esta validação captura.

**Como preencher:** troque `[ ]` por `[x]`.

---

## 🎯 As duas decisões que mais importam

Se você só tiver tempo para duas, sejam estas — elas decidem o pack de locução.

### `01-voz-casa-ptbr` · modelo PT-BR dedicado, sem clonagem
`01-voz-casa-ptbr/amostras/modelo-ptbr__estoico.mp3` · WER **4,4%** · publicável ✅

- [X] Validado
- [ ] Validado com observação
- [ ] Rejeitado

**Observação:**
```
(o sotaque soa brasileiro? o registro serve para estoicismo?)
```
Tudo ficou muito bom
---

### `02-voz-casa-23lang` · modelo genérico, voz que você já aprovou
`02-voz-casa-23lang/amostras/modelo-23lang__estoico.mp3` · WER **0,0%** · publicável ✅

- [ ] Validado
- [X] Validado com observação
- [ ] Rejeitado

**Observação:**
```
apenas timing-stretch_to_fit ficou estranho, parecendo audio atrasado com delay. mas a voz e personagem estao aprovados tambem
```

---

## 🎙️ Vozes masculinas publicáveis

### `03-male-02` · modelo 23-Lang
`03-male-02/amostras/modelo-23lang__estoico.mp3` · publicável ✅

- [X] Validado
- [ ] Validado com observação
- [ ] Rejeitado

**Observação:**
```

```

### `03-male-02` · modelo PT-BR
`03-male-02/amostras/modelo-ptbr__estoico.mp3` · WER **4,4%** · publicável ✅
*Mesma voz da anterior, modelo diferente — compare as duas para isolar o efeito do modelo.*

- [X] Validado
- [ ] Validado com observação
- [ ] Rejeitado

**Observação:**
```

```

### `04-male-01`
`04-male-01/amostras/modelo-23lang__estoico.mp3` · publicável ✅

- [ ] Validado
- [ ] Validado com observação
- [X] Rejeitado

**Observação:**
```

```

### `05-chadwick`
`05-chadwick/amostras/modelo-23lang__estoico.mp3` · publicável ✅

- [ ] Validado
- [ ] Validado com observação
- [X] Rejeitado

**Observação:**
```

```

### `06-en-man`
`06-en-man/amostras/modelo-23lang__estoico.mp3` · publicável ✅

- [ ] Validado
- [X] Validado com observação
- [ ] Rejeitado

**Observação:**
```
Algumas palavras e entonacoes erraram a silaba tonica ou ficaram com certa distorcao

```

---

## 👩 Vozes femininas publicáveis

### `09-female-01` · modelo 23-Lang
`09-female-01/amostras/modelo-23lang__estoico.mp3` · publicável ✅

- [X] Validado
- [ ] Validado com observação
- [ ] Rejeitado

**Observação:**
```

```

### `09-female-01` · modelo F5-TTS
`09-female-01/amostras/modelo-f5ptbr__estoico.mp3` · publicável ✅
*Mesma voz, engine diferente. O F5 é ~9x mais rápido.*

- [ ] Validado
- [ ] Validado com observação
- [X] Rejeitado

**Observação:**
```
muito ruim.
```

### `08-f5-ptbr` · referência PT-BR
`08-f5-ptbr/amostras/modelo-f5ptbr__estoico.mp3` · WER **5,3%** · publicável ✅

- [ ] Validado
- [X] Validado com observação
- [ ] Rejeitado

**Observação:**
```
A textura e entonacao ficou com qualidade menor que o lang, é a mesma voz de novela feminina que fizemos antes. Teve um leve erro de entonacao um pouco ruim no comeco mas nog eral ficou igual, porem, se quisermos qulidade maxima em algo to fluxo oficial é a voz aoficial que fizemos antes, se desejarmos velocidade ou algo simples e adaptado teremos essa opcao lite tambem como possibilidade pro usuario escolher na hhora de planejar e executar as geracoes
```

---

## 🔊 Modos de timing — a mesma voz, três tratamentos de pausa

Estas três usam a **mesma voz** (`02-voz-casa-23lang`). O que muda é como o áudio
se encaixa no tempo do SRT. É aqui que você avalia a fluidez que criticou antes.

### `smart_natural` — o padrão proposto
`02-voz-casa-23lang/amostras/timing-smart_natural.mp3`

- [X] Validado
- [ ] Validado com observação
- [ ] Rejeitado

**Observação:**
```

```

### `pad_with_silence`
`02-voz-casa-23lang/amostras/timing-pad_with_silence.mp3`

- [X] Validado
- [ ] Validado com observação
- [ ] Rejeitado

**Observação:**
```

```

### `stretch_to_fit` — suspeito de distorcer
`02-voz-casa-23lang/amostras/timing-stretch_to_fit.mp3` · WER **15,8%**
*Medição já indica degradação. Confirme de ouvido.*

- [ ] Validado
- [ ] Validado com observação
- [X] Rejeitado

**Observação:**
```
atrasa a fala e distorce um pouco
```

---

## 🧪 Clonagem — estudo, não publicável

Compare primeiro com o original: `07-narrador-estoico-clonado/00-ORIGINAL-do-video.mp3`

### Clone · modelo 23-Lang · referência de 14s
`07-narrador-estoico-clonado/amostras/modelo-23lang__ref-video1-14s.mp3` · WER **8,9%**

- [ ] Validado
- [x] Validado com observação
- [ ] Rejeitado

**Observação:**
```
as palavvras seguintes ficaram erradas ou com sotaque entonacao estrangeiro estranho:

Maior - Fficou com o R final com soqtaque errado deformando um pouco a palavra
noites - ficou com sotaque de portugues de portugal
Diiaqrio que - sotaque portugues portugal
```

### Clone · modelo 23-Lang · referência de 20s
`07-narrador-estoico-clonado/amostras/modelo-23lang__ref-video2-20s.mp3` · WER **8,9%**

- [X] Validado
- [ ] Validado com observação
- [ ] Rejeitado

**Observação:**
```

```

### Clone · modelo PT-BR · referência de 20s
`07-narrador-estoico-clonado/amostras/modelo-ptbr__ref-video2-20s.mp3` · WER **20,0%**
*Piorou com o modelo dedicado — resultado não explicado.*

- [ ] Validado
- [X] Validado com observação
- [ ] Rejeitado

**Observação:**
```
Pausas e entonacoes erradas em determinados momentos, a primeira faze gomarco aurelio governava o maior imperio do mundo ficou com um ponto final, que atrapalhou a continuidade com proximas palavras, qe subsequentemente ficou com a entonacao toda estranha para "e escrevia todas as noites". tepois a palabvre nele seguida de uma pausa sem sentido tambem para continuar com "ha duvidas".
```

---

## 🚫 Restritas — só para calibrar registro, nunca publicar

Servem para você me dizer **qual registro grave você quer**, para eu buscar por
meio legítimo.

### `90-RESTRITA-morgan-freeman`
- [ ] É o registro que eu quero
- [X] Perto, mas não é
- [ ] Não é isso

**Observação:**
```
Voz ta boa mas entonacoes ruins ainda nao seguindo lecala  coerencia das frases
```

### `91-RESTRITA-attenborough` · WER 5,3%
- [ ] É o registro que eu quero
- [X] Perto, interessante aprimorar
- [ ] Não é isso

**Observação:**
```
leve sotaque ainda mas acho que salva para aprimoramento ainda e testes
```

### `92-RESTRITA-eastwood`
- [ ] É o registro que eu quero
- [X] Perto, mas não é
- [ ] Não é isso

**Observação:**
```
Algumas palavras ficaram estranhas com sotaque ou alguma anomalia, mas é aproveitavel talvez mpara mais aprimoramentos

```

---

## Decisão final

nao teremos voz canonica ainda, cada caso é um caso, teremos um portivfolio validado, um para geracoes oficiais  outros para geeracoes de estudo com as vozes clonadas aprovadas para prosseguirmos, com mais estudo e refino acho que vamos chegar em um resultado muito bom e consistente.
