# Gate de Gênero — Brand Film (`brand-film` · P1)

> **Gênero:** campanha / comercial de produto. Peça-vitrine. Objetivo: branding e desejo.
> **Executor:** `@qa-critic` · **Pré-requisito:** laudo `CLEAR` do `@fact-checker`.
> **Roda junto com:** `gate-transversal-entrega.md` (base comum — não repetida aqui).
> **Dimensões críticas da rubrica:** D1 conceito · D2 execução · D4 marca · D6 continuidade.

---

## Como ler

`BLOQUEANTE` = reprovou, **FAIL**. `BLOQUEANTE NON-WAIVABLE` = nem o `@studio-chief` derruba.
`ATENÇÃO` = reprovou, **CONCERNS**. Todo item tem **Teste** e **Falha se**.

**Este gate avalia duas coisas separadas:**
- **Bloco A** — a qualidade do **Pacote de Direção** entregue ao operador humano.
  Pacote vago é FALHA **mesmo que o asset tenha saído bom**: acerto sem direção não se repete.
- **Blocos B a G** — a qualidade do que o humano **devolveu** e da peça montada.

---

## Bloco A — Pacote de Direção específico do brand film (BF-PD)

- [ ] **BF-PD-01** · `BLOQUEANTE` — Todo `asset_direction` de still cita o plano do storyboard que ele serve.
  **Teste:** o campo `destino` aponta um `beat_n`/`plano` existente em `storyboard.yaml`.
  **Falha se:** há pacote órfão (não serve nenhum plano) ou plano sem pacote.

- [ ] **BF-PD-02** · `BLOQUEANTE` — O pacote traduz o look-book em parâmetro, não em adjetivo.
  **Teste:** o `prompt` carrega decisão fotográfica nomeável — tipo de lente ou distância focal equivalente, qualidade e direção de luz, hora do dia, profundidade de campo, paleta com referência de cor.
  **Falha se:** o prompt usa apenas rótulos ("cinematográfico", "premium", "estética Apple") sem os parâmetros que produzem esse resultado.

- [ ] **BF-PD-03** · `BLOQUEANTE` — O pacote carrega o `art-spec`: cenário, props, wardrobe e tipografia do plano.
  **Teste:** cada elemento cênico que aparece no plano está descrito no prompt ou no campo `tecnica`.
  **Falha se:** o plano tem produto/prop/wardrobe relevante que o prompt não menciona — o operador vai improvisar e a continuidade quebra.

- [ ] **BF-PD-04** · `BLOQUEANTE` — Para o produto real, o pacote diz como preservar fidelidade.
  **Teste:** existe instrução explícita de referência de produto (imagem de referência, ângulo, cor exata, rótulo legível) e o `criterio_de_aceite` inclui "o produto corresponde ao real".
  **Falha se:** o produto é gerado livremente pelo modelo sem âncora de referência.
  **Por quê:** produto alterado por IA em peça publicitária é problema de fidelidade, não de estética.

- [ ] **BF-PD-05** · `BLOQUEANTE` — Os takes usam I2V a partir de still aprovado, ou declaram por que não.
  **Teste:** cada `asset_direction` de take aponta o still de origem aprovado; se for T2V direto, o campo `tecnica` justifica.
  **Falha se:** há take em T2V sem justificativa. T2V no escuro num brand film gera deriva de look entre planos.

- [ ] **BF-PD-06** · `BLOQUEANTE` — `armadilhas_conhecidas` cobre as três falhas caras do gênero.
  **Teste:** o conjunto de pacotes menciona, quando aplicável: deriva de wardrobe/cenário entre planos, texto/logo alucinado no frame, e deformação em mão/rosto em plano fechado.
  **Falha se:** nenhum pacote antecipa nenhuma delas em peça que tem pessoa, marca ou plano fechado.

- [ ] **BF-PD-07** · `ATENÇÃO` — O pacote define a ordem de geração dos planos.
  **Teste:** existe indicação de qual plano gerar primeiro (normalmente o plano-âncora de look) para servir de referência aos demais.
  **Falha se:** não há ordem. Gerar na ordem do roteiro é o caminho mais curto para 6 looks diferentes.

- [ ] **BF-PD-08** · `BLOQUEANTE` — O pacote de áudio/VO existe e dirige a locução.
  **Teste:** o `asset_direction` de voz traz referência de entonação, ritmo, intenção por trecho e o texto exato a ser lido.
  **Falha se:** o operador recebeu só o texto, sem direção de interpretação.

---

## Bloco B — Big idea e conceito (BF-ID)

- [ ] **BF-ID-01** · `BLOQUEANTE` — A peça tem uma ideia enunciável em uma frase que **não** é a descrição do formato.
  **Teste:** escrever a frase. Ela precisa conter uma tensão, virada ou proposição — não a mecânica da peça.
  **Falha se:** a melhor frase possível é "um filme mostrando o produto com cortes bonitos e locução".

- [ ] **BF-ID-02** · `BLOQUEANTE` — A ideia sobrevive à troca de marca.
  **Teste:** substituir o logo final pelo de um concorrente. A peça deveria ficar **estranha**.
  **Falha se:** a peça funciona igual com qualquer marca — é um formato genérico, não uma ideia da marca.

- [ ] **BF-ID-03** · `BLOQUEANTE` — A ideia aparece nos primeiros 25% da duração.
  **Teste:** marcar o timecode em que o espectador entende do que se trata; comparar com 25% da duração total.
  **Falha se:** a compreensão só chega depois disso sem que a peça tenha construído um enigma deliberado (e, se construiu, o enigma precisa estar declarado no brief).

- [ ] **BF-ID-04** · `ATENÇÃO` — A ideia se apoia num insight humano do brief, não numa característica de produto.
  **Teste:** rastrear a ideia até o campo `insight` do brief.
  **Falha se:** a ideia é a lista de features com trilha bonita por cima.

- [ ] **BF-ID-05** · `BLOQUEANTE` — A peça entrega a promessa declarada no brief.
  **Teste:** ler o objetivo de negócio e o KPI do brief; a peça endereça o que foi contratado.
  **Falha se:** a peça é boa mas responde a outro briefing.

---

## Bloco C — Coerência de look (BF-LK)

- [ ] **BF-LK-01** · `BLOQUEANTE` — Paleta consistente entre planos.
  **Teste:** amostrar 1 frame por plano; comparar as dominantes com a paleta do look-book (tolerância de variação declarada no look-book).
  **Falha se:** algum plano foge da paleta sem intenção narrativa registrada no storyboard.

- [ ] **BF-LK-02** · `BLOQUEANTE` — Direção e qualidade de luz coerentes.
  **Teste:** por plano, identificar de onde vem a luz principal e se é dura ou difusa; comparar com o look-book.
  **Falha se:** dois planos consecutivos da mesma cena têm luz vindo de lados opostos, ou alternam entre dura e difusa sem motivo de cena.

- [ ] **BF-LK-03** · `BLOQUEANTE` — Tratamento de imagem (grade) uniforme.
  **Teste:** comparar contraste, saturação e temperatura entre os planos.
  **Falha se:** dá para apontar em qual plano "mudou o filtro".

- [ ] **BF-LK-04** · `ATENÇÃO` — Escala de plano variada e intencional.
  **Teste:** listar a escala de cada plano (geral, médio, close, detalhe); conferir contra a decupagem.
  **Falha se:** a peça inteira vive na mesma escala, ou a variação não corresponde ao que a decupagem previa.

- [ ] **BF-LK-05** · `ATENÇÃO` — Movimento de câmera com propósito declarado.
  **Teste:** cada movimento tem um motivo na decupagem (revelar, acompanhar, aproximar, criar tensão).
  **Falha se:** há movimento constante e uniforme aplicado por padrão em todos os planos.

- [ ] **BF-LK-06** · `BLOQUEANTE` — Zero artefato de IA visível em plano de destaque.
  **Teste:** revisar frame a frame os planos de close e os que ficam mais de 1,5 s em tela: mãos, dedos, olhos, texto no cenário, geometria de objeto, reflexo.
  **Falha se:** há artefato perceptível em exibição normal (não em pausa quadro a quadro) em qualquer plano de destaque.

---

## Bloco D — Continuidade (BF-CT)

- [ ] **BF-CT-01** · `BLOQUEANTE` — Wardrobe idêntico dentro da mesma cena.
  **Teste:** comparar roupa, cor, textura e acessórios do personagem entre planos da mesma cena.
  **Falha se:** há mudança perceptível sem elipse narrativa.

- [ ] **BF-CT-02** · `BLOQUEANTE` — Cenário e props estáveis.
  **Teste:** comparar objetos de fundo e sua posição entre planos consecutivos da mesma cena.
  **Falha se:** objeto some, aparece ou muda de lugar sem corte de tempo justificado.

- [ ] **BF-CT-03** · `BLOQUEANTE` — O produto é o mesmo produto em todos os planos.
  **Teste:** comparar formato, rótulo, cor e proporção do produto em cada aparição.
  **Falha se:** há qualquer variação. Produto instável invalida a peça publicitária.

- [ ] **BF-CT-04** · `ATENÇÃO` — Eixo e direção de olhar preservados.
  **Teste:** verificar se a regra dos 180° foi mantida dentro de cada cena.
  **Falha se:** houve salto de eixo sem plano neutro de passagem.

- [ ] **BF-CT-05** · `ATENÇÃO` — Consistência de rosto do personagem entre planos.
  **Teste:** comparar traços em 3 planos distintos do mesmo personagem.
  **Falha se:** a identidade facial deriva a ponto de parecer outra pessoa.

---

## Bloco E — Sound design intencional (BF-SD)

- [ ] **BF-SD-01** · `BLOQUEANTE` — A peça tem camada de som além da trilha.
  **Teste:** listar os elementos de áudio presentes: trilha, SFX, ambiência, VO.
  **Falha se:** existe apenas trilha musical colada por cima. Trilha sozinha é decisão de baixar a percepção de produção.

- [ ] **BF-SD-02** · `BLOQUEANTE` — Cada SFX está ancorado num evento de imagem.
  **Teste:** para cada SFX, existe a ação correspondente no frame, no mesmo timecode (±100 ms).
  **Falha se:** há SFX solto sem evento, ou evento importante (impacto, revelação, clique) sem som.

- [ ] **BF-SD-03** · `BLOQUEANTE` — Locução inteligível sobre a trilha.
  **Teste:** ouvir em fone e em alto-falante de celular; toda palavra é compreensível sem legenda.
  **Falha se:** alguma palavra exige legenda para ser entendida, ou não há ducking onde a trilha compete com a VO.

- [ ] **BF-SD-04** · `ATENÇÃO` — A trilha acompanha a curva dramática.
  **Teste:** comparar os pontos de virada da peça com as mudanças de intensidade da trilha.
  **Falha se:** a trilha é plana do início ao fim numa peça que tem virada.

- [ ] **BF-SD-05** · `ATENÇÃO` — O silêncio foi usado onde a decupagem previa.
  **Teste:** conferir os pontos de respiro previstos no `sound_design`.
  **Falha se:** a peça é uma parede sonora contínua, sem nenhum respiro.

- [ ] **BF-SD-06** · `BLOQUEANTE` — Mixagem sem clipping e com fala à frente.
  **Teste:** medir pico verdadeiro (≤ −1 dBTP) e conferir que a VO fica acima da trilha em toda a peça.
  **Falha se:** há clipping, ou a trilha cobre a VO em algum trecho.

---

## Bloco F — Packshot e assinatura de marca (BF-PK)

- [ ] **BF-PK-01** · `BLOQUEANTE` — A peça tem assinatura de marca identificável.
  **Teste:** existe um momento em que a marca aparece de forma deliberada (packshot, logo, assinatura sonora).
  **Falha se:** a marca só aparece de passagem em lower-third no meio, ou não aparece.

- [ ] **BF-PK-02** · `BLOQUEANTE` — O logo permanece tempo suficiente para ser lido.
  **Teste:** medir o tempo em tela do logo na assinatura final.
  **Falha se:** menos de 1,0 s em peça de até 30 s, ou menos de 1,5 s em peça mais longa.

- [ ] **BF-PK-03** · `BLOQUEANTE` — O logo está na versão correta e sobre fundo adequado.
  **Teste:** comparar com o `brand-config`: versão (positiva/negativa/monocromática), proporção original, área de respiro mínima.
  **Falha se:** o logo foi distorcido, recolorido, aplicado sobre fundo de contraste insuficiente, ou está com respiro menor que o especificado.

- [ ] **BF-PK-04** · `BLOQUEANTE` — O packshot mostra o produto de forma fiel e legível.
  **Teste:** o produto aparece inteiro, com rótulo legível na resolução de entrega, sem corte de borda.
  **Falha se:** o produto está cortado, ilegível ou visualmente alterado.
  **N/A quando:** a campanha é de marca sem produto físico — declarar.

- [ ] **BF-PK-05** · `ATENÇÃO` — A assinatura sonora acompanha a visual, quando a marca tem uma.
  **Teste:** conferir se o `brand-config` define assinatura sonora e se ela foi aplicada.
  **Falha se:** a marca tem e a peça não usou.

- [ ] **BF-PK-06** · `ATENÇÃO` — Elementos legais/obrigatórios presentes e legíveis.
  **Teste:** avisos, selos ou textos obrigatórios exigidos pelo cliente aparecem com tempo de leitura suficiente (mínimo 1 s por linha curta).
  **Falha se:** o texto obrigatório aparece ilegível ou por tempo insuficiente.

---

## Bloco G — Ritmo (BF-RT)

- [ ] **BF-RT-01** · `BLOQUEANTE` — A duração de cada plano tem intenção, não é uniforme por descuido.
  **Teste:** listar a duração de todos os planos; calcular a variação.
  **Falha se:** todos os planos têm a mesma duração (dentro de ±10%) sem que isso seja um partido declarado na decupagem.

- [ ] **BF-RT-02** · `BLOQUEANTE` — Nenhum bloco morto.
  **Teste:** identificar trechos sem evento novo (corte, movimento, mudança de som, informação) acima de 2× a duração média de plano.
  **Falha se:** existe algum. Bloco morto em peça-vitrine é onde o espectador sai.

- [ ] **BF-RT-03** · `BLOQUEANTE` — Cortes limpos.
  **Teste:** revisar cada ponto de corte: frame duplicado, flash de frame preto, corte no meio de sílaba, salto de posição.
  **Falha se:** existe qualquer um desses defeitos em qualquer corte.

- [ ] **BF-RT-04** · `ATENÇÃO` — O ritmo acelera ou desacelera conforme a curva prevista.
  **Teste:** comparar a cadência real por bloco com a `pacing_curve` da decupagem.
  **Falha se:** a curva planejada não se realiza e não há registro da mudança de decisão.

- [ ] **BF-RT-05** · `ATENÇÃO` — A peça termina de forma resolvida.
  **Teste:** o último plano tem fechamento (visual, sonoro ou de sentido), não corte seco no meio de um movimento.
  **Falha se:** a peça simplesmente para.

---

## Bloco H — Asset devolvido pelo humano (BF-AS)

- [ ] **BF-AS-01** · `BLOQUEANTE` — Todo asset usado no master passou pelo `criterio_de_aceite` do seu pacote.
  **Teste:** para cada asset, marcar sim/não em cada critério do `asset_direction`.
  **Falha se:** algum asset entrou no master reprovando um critério de aceite sem waiver registrado.

- [ ] **BF-AS-02** · `BLOQUEANTE` — Resolução nativa do asset é igual ou maior que a resolução de entrega.
  **Teste:** conferir dimensões do arquivo original devolvido.
  **Falha se:** algum asset foi ampliado além de 100% da resolução nativa sem etapa de upscale declarada no `pos_processamento`.

- [ ] **BF-AS-03** · `BLOQUEANTE` — Nenhum asset entregue traz marca d'água, logo da ferramenta ou legenda de plataforma.
  **Teste:** inspecionar bordas e cantos de cada asset.
  **Falha se:** encontrar qualquer marca d'água ou selo residual.

- [ ] **BF-AS-04** · `ATENÇÃO` — O número de variações geradas bate com o pedido do pacote.
  **Teste:** contar arquivos por `asset_id` (aprovadas + descartadas registradas).
  **Falha se:** foi gerada uma única variação onde o pacote pedia N ≥ 2.

- [ ] **BF-AS-05** · `ATENÇÃO` — Retakes foram dirigidos, não repetidos no escuro.
  **Teste:** para cada `asset_id` com mais de uma rodada, existe registro do que mudou na direção entre elas.
  **Falha se:** houve 3+ tentativas com a mesma direção e o mesmo prompt.

---

## Evidência (preenchida pelo `@qa-critic`)

| Campo | Valor |
|:---|:---|
| Job / cliente / duração | |
| Big idea em uma frase | |
| Planos totais / com pacote de direção | |
| Bloqueantes reprovados (IDs) | |
| Atenções reprovadas (IDs) | |
| Rubrica D1 / D2 / D4 / D6 | |
| Gate transversal | PASS · CONCERNS · FAIL |

## Veredito do gênero

- **Resultado:** `PASS` · `CONCERNS` · `FAIL` · `WAIVED`
- **Regra:** qualquer `BLOQUEANTE` reprovado → FAIL. Só `ATENÇÃO` reprovada → CONCERNS.
- **Entrega exige:** este gate **e** `gate-transversal-entrega.md` aprovados.
