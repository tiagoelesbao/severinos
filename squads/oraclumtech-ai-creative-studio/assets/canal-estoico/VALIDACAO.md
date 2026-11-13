# Inspeção do pack visual do canal — 39 imagens, 6 peças

> Abra as folhas `A1-cru.jpg` … `B3-cru.jpg`. Uma linha por peça, uma imagem por
> marcador `[img NN]` do roteiro correspondente.
>
> **Só as aprovadas recebem acabamento.** Acabar as 39 antes da sua inspeção
> custaria ~2 h na roda LITE ou ~4 h na PRO — e parte disso seria jogado fora.
>
> Resolução cheia: `ComfyUI/output/canal-estoico/{PECA}/cru/` (1344×768).

**Como preencher:** troque `[ ]` por `[x]`.

---

## Como inspecionar — a ordem importa

**Estrutural antes de textural.** Conte membros. Conte elementos repetidos. Pergunte
de cada objeto: *isto tem função na cena?*

Textura ruim se conserta com upscale. Anatomia e arquitetura erradas exigem geração
nova — e descobrir isso **depois** de gastar acabamento é jogar fora o tempo mais
caro do pipeline.

---

## O que eu já vejo de errado

Não vou te entregar 39 imagens dizendo que estão todas boas. Estas quatro me
incomodam, e prefiro apontar antes de você achar:

**`A1 · img 06` — estátua com braço estendido.** O braço direito está lá; **o
esquerdo não aparece**. Pode ser oclusão pelo drapeado, pode ser membro faltando.
É o tipo de coisa que passa numa olhada e não passa em tela cheia.

**`A2 · img 05` e `img 02` — as mãos não parecem mármore.** O prompt diz *"clearly
polished stone and not flesh"* e mesmo assim o modelo entregou mãos de carne com
iluminação de mármore. Como o canal inteiro é de pedra, **inconsistência de material
é problema de identidade**, não de estética.

**`A2 · img 04` — o pergaminho virou mármore.** Pedi papiro sobre superfície de
mármore e o modelo fez tudo de pedra. O objeto ficou bonito e é outra coisa.

**`B1 · img 01` — "alvorada no mármore" ficou abstrato demais.** Lê como um plano
azul escuro. Serve de respiro entre cenas, mas não sustenta 20 segundos sozinho.

---

## Aprovação por peça

Para cada peça: aprove em bloco, ou liste os números que devem ser refeitos.

### `A1` · A ordem que muda tudo — 7 imagens

- [ ] Aprovado em bloco
- [ ] Aprovado, exceto os números abaixo
- [ ] Refazer a peça inteira

**Refazer (números):**
```

```
**Observação:**
```

```

### `A2` · O que não depende de você — 7 imagens

- [ ] Aprovado em bloco
- [ ] Aprovado, exceto os números abaixo
- [ ] Refazer a peça inteira

**Refazer (números):**
```

```
**Observação:**
```

```

### `A3` · A morte como conselheira — 7 imagens

- [ ] Aprovado em bloco
- [ ] Aprovado, exceto os números abaixo
- [ ] Refazer a peça inteira

**Refazer (números):**
```

```
**Observação:**
```

```

### `B1` · Três reflexões para escutar toda manhã — 6 imagens

- [ ] Aprovado em bloco
- [ ] Aprovado, exceto os números abaixo
- [ ] Refazer a peça inteira

**Refazer (números):**
```

```
**Observação:**
```

```

### `B2` · Três reflexões para os dias difíceis — 6 imagens

- [ ] Aprovado em bloco
- [ ] Aprovado, exceto os números abaixo
- [ ] Refazer a peça inteira

**Refazer (números):**
```

```
**Observação:**
```

```

### `B3` · Três reflexões para antes de dormir — 6 imagens

- [ ] Aprovado em bloco
- [ ] Aprovado, exceto os números abaixo
- [ ] Refazer a peça inteira

**Refazer (números):**
```

```
**Observação:**
```

```

---

## Uma decisão de custo que é sua

Qual roda para as aprovadas?

| | Cadeia | 39 imagens |
|---|---|---|
| **LITE** | upscale 2× → 2688×1536 | ~1,9 h |
| **PRO** | detailer + upscale 3× → 4032×2304 | ~3,9 h |

O detailer só atua onde há **rosto**, e neste pack isso é menos da metade das
imagens — nas outras a roda PRO entrega só o upscale maior. Duas saídas razoáveis:

- [ ] PRO em tudo — o canal é o produto, e a máquina roda de madrugada
- [ ] PRO nas imagens com rosto, LITE no resto — mesmo resultado, metade do tempo
- [ ] LITE em tudo — 2688×1536 já cobre 1080p com folga de zoom

**Minha recomendação é a segunda.** Onde não há rosto, PRO e LITE diferem só pelo
fator de ampliação, e 2688×1536 já permite empurrar zoom quase 2× numa timeline
1080p sem amolecer.

---

## O que trava sem isso

A composição no `video-studio` precisa das imagens **acabadas** para montar o
timeline com Ken Burns em resolução real. Narração e trilha já estão prontas; as
imagens são o último insumo.
