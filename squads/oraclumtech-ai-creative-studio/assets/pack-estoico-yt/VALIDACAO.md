# Validação do pack estoico 16:9 — escolha de semente

> **As 12 já passaram pelo acabamento PRO.** Como você não tinha escolhido semente
> e a máquina estava livre, rodei todas — assim você escolhe entre peças prontas, e
> não entre promessas.
>
> Abra `folha-de-contato-pro.jpg` para escolher, e `folha-de-contato-cru.jpg` se
> quiser comparar com a geração. **Escolha UMA semente por cena.**
>
> Resolução cheia: `ComfyUI/output/pack-estoico-yt/pro/` (4032×2304) e
> `.../cru/` (1344×768).

**Como preencher:** troque `[ ]` por `[x]`.

---

## O que mudou desde o pack quadrado

| | v1 (quadrado) | v2 (este) |
|---|---|---|
| Formato | 1024×1024 | **1344×768 (16:9)** — vai virar vídeo horizontal |
| Upscale | 2× → 2048 | **3× → 4032×2304** — cobre 4K com folga para o editor empurrar zoom e pan |
| Poeira no ar | estava no prompt | **removida** — o ruído ao redor do rosto era eu que pedia |
| Anomalias | 4 estruturais | prompt endurecido contra cada uma |
| Sementes | 1 | **3 por cena** — o método é volume + escolha sua |

---

## As quatro anomalias que você marcou, e o que fiz com cada uma

**Perna extra (filósofo).** Passei a dizer o número no prompt — *"exactly two legs
with both bare feet resting flat on the plinth"* — e listei `third leg, duplicated
leg, extra limb` no negativo. Contar em voz alta é barato.

**Cunha escura sob a base (busto).** O prompt não dizia em que o busto se apoiava.
Sem apoio nomeado, o modelo improvisa uma forma escura contra o fundo preto. Agora
o pedestal está nomeado e descrito.

**Objeto irreconhecível (mãos).** `"unrolled scroll"` descreve um **estado**, não uma
**forma** — e o modelo resolveu o estado e perdeu o objeto. Passei a descrever a
silhueta: pergaminho aberto, plano, com bastões de madeira nas pontas.

**Coluna extra (templo).** Elemento repetido é resolvido por padrão, não por
estrutura, e na borda o padrão é cortado pela metade. Agora exijo a regra:
*"every column standing on its own base and reaching the entablature above"*.

**E uma quinta, que só apareceu na correção:** a primeira tentativa do pergaminho
consertou a forma mas **escreveu texto** no papel, porque eu pedi *"showing its
written surface"*. Texto ilegível de IA é a pior anomalia do catálogo — é a única
que o espectador consegue *ler*. Refiz pedindo pergaminho **em branco**. Se um dia
esse pergaminho precisar de texto, ele entra depois como tipografia de verdade.

---

## Escolha

### `y01` · Filósofo sentado

- [ ] semente 1
- [ ] semente 2
- [ ] semente 3
- [ ] nenhuma serve — gerar mais

**Observação:**
```

```

### `y02` · Busto em perfil

- [ ] semente 1
- [ ] semente 2
- [ ] semente 3
- [ ] nenhuma serve — gerar mais

**Observação:**
```

```

### `y03` · Mãos com pergaminho

- [ ] semente 1
- [ ] semente 2
- [ ] semente 3
- [ ] nenhuma serve — gerar mais

**Observação:**
```

```

### `y04` · Templo noturno

- [ ] semente 1
- [ ] semente 2
- [ ] semente 3
- [ ] nenhuma serve — gerar mais

**Observação:**
```

```

---

## O que já foi respondido, e o que ainda é seu

### O `refinado` valia a pena? — respondido, e a resposta é sim

Você perguntou; eu medi e depois mostrei. `lite-vs-pro.jpg` põe as três lado a lado
em zoom 100%. O LITE já é um salto grande sobre o cru; o PRO acrescenta grão de
pedra fino e o rosto redesenhado.

Ficaram as **duas rodas**, como você pediu:

| | Cadeia | Custo | Saída |
|---|---|---|---|
| **LITE** | cru → upscale 2× | 175 s | 2688×1536 |
| **PRO** | cru → detailer → upscale 3× | 360 s | 4032×2304 |

A mesma crua alimenta as duas e nada é regerado — a escolha de roda pode acontecer
depois da escolha de semente.

### Resolução — executada em 4032×2304

Cobre 4K com sobra, e a sobra é de propósito: numa timeline 1080p o Ken Burns
empurra quase 2× sem a imagem amolecer.

**Para o vídeo (I2V com Wan)** o quadro de origem **não** é o de 4K — o Wan trabalha
por volta de 1280×704. O que alimenta o vídeo é o `cru` redimensionado. Upscalar
antes do I2V é gastar tempo que o modelo joga fora.

### O que ainda depende de você

**A escolha de semente**, acima. É a única coisa que trava o próximo passo.
