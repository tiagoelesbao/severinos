# Ecossistema de FX — os quatro grupos

Até aqui "transição", "animação de entrada" e "overlay" estavam no mesmo saco, e
por isso nenhum dos três tinha vocabulário próprio: `TransitionType` tinha quatro
valores, `AnimType` tinha exatamente os mesmos quatro, e movimento de câmera era
um único número (`kenBurns`) que nem chegava a ter direção na interface.

A separação é por **o que cada coisa faz**, e não por gosto de organização.

| Grupo | Escopo | Onde fica | Onde se edita |
|---|---|---|---|
| **Transição** | dois takes — o fim de um e o começo do outro | `clip.transitionIn` | inspector do clipe de vídeo |
| **Animação** | um elemento, sozinho — entrada e saída | `elemento.animateIn/Out` | inspector do elemento |
| **Efeito** | camada sobreposta, não altera o clipe | camada extra (`extraLayers`) | aba **Efeitos** do bin |
| **Câmera** | o próprio quadro se movendo | `clip.camera` | inspector do clipe de vídeo |

Fonte única: `src/lib/fxCatalog.ts`.

---

## 1 · Transições — 16, em quatro famílias

`corte` · `dissolve` `fade-preto` `fade-branco` · `push-esq/dir/cima/baixo`
`whip-esq/dir` `wipe-esq/dir` · `zoom-punch` `zoom-afasta` `blur-dissolve` `glitch`

**Como a composição emenda dois clipes.** Cada clipe começa `frames` antes do seu
ponto na timeline e é desenhado por cima do anterior, que ainda está tocando.
Então o que o renderer anima é sempre **o clipe que entra** — o que sai continua
visível por baixo, sem precisar saber de nada.

Duas consequências:

- transição que precisaria mexer nos dois lados (push, wipe) só mexe no que
  entra. No tempo curto em que dura, a leitura é a mesma;
- **fade pelo preto não é dissolve com preto no meio.** O que entra tem de
  esperar o anterior sumir, então ele tem uma cortina própria e duas fases.

## 2 · Animações — 10

`nenhuma` `fade` `sobe` `desce` `entra-esq` `entra-dir` `cresce` `encolhe` `pop` `desfoca`

Entrada e saída usam **a mesma tabela**, invertendo só o sentido. Antes cada uma
tinha seu `if`, e por isso "slide" entrava 14% pela esquerda e saía 14% para a
direita — assimetria que ninguém decidiu, só aconteceu.

Toda animação carrega fade junto: um elemento que só desliza e nunca desaparece
cruza a borda visível do quadro.

## 3 · Efeitos — 11 overlays

Gerados por `squads/oraclumtech-ai-creative-studio/assets/comfyui/gera_overlays.py`,
publicados em `public/library/overlays/`. Os ids **são os nomes de arquivo** —
não há mapa entre id e arquivo, porque um mapa seria mais uma coisa para sair de
sincronia.

| família | efeitos |
|---|---|
| atmosfera | partículas lentas · partículas densas · névoa · bolhas |
| película | grão de filme · riscos · vazamento quente ← · vazamento frio → · textura de papel |
| analógico | VHS · linhas de TV |

**O modo de mesclagem é o que faz o efeito existir.** Sem ele, o preto do overlay
apenas escurece a imagem em vez de sumir — é a queixa de "o efeito não aparece".
`screen` para overlay sobre preto (o padrão do gênero); `overlay`/`soft-light`
para textura em cinza médio; `multiply` para vinheta.

Um clique na aba **Efeitos** monta a camada inteira: modo de mesclagem certo,
opacidade calibrada por efeito, e a **repetição** para cobrir a peça — o arquivo
tem 10 s e a peça tem 20 minutos. Todos são gerados em loop perfeito (o movimento
é periódico e o último quadro encosta no primeiro), então repetir não deixa
emenda visível.

Prova visual: `assets/overlays/PROVA.jpg`, gerada por `prova_overlays.py`, que
reproduz em numpy exatamente a conta que o navegador faz com `mix-blend-mode`.

## 4 · Câmera — 10 movimentos

`parada` `zoom-in` `zoom-out` `pan-esq` `pan-dir` `tilt-cima` `tilt-baixo`
`push-diagonal` `deriva` `handheld`

Três coisas que o `kenBurns` não tinha:

**Direção nomeada.** O renderer já respeitava o sinal negativo, mas o clamp do
setter era `Math.max(0, …)` — o valor negativo nunca chegava até ele, e o slider
começava em zero. O zoom-out era literalmente inalcançável pela interface.

**Peso.** `calmo` · `medio` · `agressivo` multiplicam a amplitude por 0,6 / 1 /
1,9. É o parâmetro que faltava: um zoom pode ser o mesmo movimento em calmo e em
agressivo — o que muda é amplitude e curva. Sem isso, cada ajuste virava um
número mágico digitado à mão em cada clipe.

Nas transições, o peso também mexe na **duração** (×1,6 / ×1 / ×0,55). Agressivo
é mais curto, não só mais forte: um whip de 20 frames não é agressivo, é lento.

**Curva.** `linear` · `suave` (smoothstep) · `acelera` · `desacelera`.

### Duas regras que o catálogo garante

- **A escala nunca fica abaixo de 1.** Sob 1, o quadro encolhe e aparece o fundo
  do palco. Por isso `zoom-out` é modelado como "começa ampliado e volta ao
  natural", e não como "encolhe" — na tela o resultado é o mesmo e a borda fica
  coberta.
- **Todo movimento lateral carrega folga de escala.** Um pan sem folga mostra a
  borda do quadro. `escalaMinima` é o piso, aplicado antes do peso.

### Aplicar em todos, com sentido alternado

O botão no inspector aplica o movimento à peça inteira invertendo o sentido a
cada take. É isso que impede a peça de "respirar junto" — e é como a repetição de
uma mesma imagem no rodízio deixa de se denunciar.

---

## Compatibilidade

Os nomes antigos (`none` `slide` `zoom` `dissolve` / `fade`) continuam válidos em
timelines já salvas. `normalizaTransicao` e `normalizaAnimacao` traduzem **na
leitura**, e nenhum renderer conhece os nomes velhos.

`kenBurns` continua funcionando e é convertido por `cameraDoKenBurns` preservando
a amplitude exata — o preview de uma peça já aprovada não muda sozinho. Ao gravar
`camera`, o `kenBurns` é apagado: manter os dois deixaria a timeline com duas
fontes de verdade para a mesma coisa.

## Testes

```
node --test --experimental-strip-types src/lib/fxCatalog.test.ts
node --test --experimental-strip-types src/lib/animacoes.test.ts
node --test --experimental-strip-types src/lib/editorFx.test.ts
```
