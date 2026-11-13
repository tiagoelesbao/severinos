# Gate de Gênero — Nicho Series (`nicho-series` · P3)

> **Gênero:** short film / minissérie / sketch / sátira com personagens de bolha.
> **Objetivo:** retenção e crescimento de página; funil para a Oraclum.
> **Executor:** `@qa-critic` · **Pré-requisito:** laudo `CLEAR` do `@fact-checker`.
> **Roda junto com:** `gate-transversal-entrega.md` (base comum — não repetida aqui).
> **Dimensões críticas da rubrica:** D1 conceito · D3 timing · D6 consistência entre episódios.

---

## Como ler

`BLOQUEANTE` = reprovou, **FAIL**. `BLOQUEANTE NON-WAIVABLE` = nem o `@studio-chief` derruba.
`ATENÇÃO` = reprovou, **CONCERNS**. Todo item tem **Teste** e **Falha se**.

**Este gate avalia duas coisas separadas:**
- **Bloco A** — a qualidade do **Pacote de Direção** entregue ao operador humano.
  Numa série, pacote vago é FALHA mesmo com asset bom: o episódio 4 precisa do mesmo
  personagem do episódio 1, e isso só se sustenta com direção reproduzível.
- **Blocos B a G** — a qualidade do que o humano **devolveu** e do episódio montado.

> **Risco central deste gênero.** É o pipeline que mais se aproxima de dano a terceiro.
> Sátira de **comportamento** é legítima; ataque a **pessoa nomeável** é processo.
> O Bloco E é o mais duro do estúdio e tem itens NON-WAIVABLE.

---

## Bloco A — Pacote de Direção específico da série (NS-PD)

- [ ] **NS-PD-01** · `BLOQUEANTE` — A bíblia de personagem existe e é anterior ao primeiro still do episódio.
  **Teste:** existe `character-bible.yaml` por personagem recorrente, com data anterior aos pacotes; cada `asset_direction` a referencia por caminho e versão.
  **Falha se:** o episódio foi dirigido sem bíblia, ou os pacotes não a citam.

- [ ] **NS-PD-02** · `BLOQUEANTE` — O pacote traz a âncora de consistência **e o valor usado**.
  **Teste:** `tecnica` declara o mecanismo (character sheet de referência, seed travada, imagem-âncora) e `parametros` registra o valor concreto (seed, arquivo de referência).
  **Falha se:** o mecanismo está citado sem o valor — sem o valor, o episódio seguinte não reproduz o personagem.

- [ ] **NS-PD-03** · `BLOQUEANTE` — O pacote reusa as âncoras dos episódios anteriores.
  **Teste:** comparar as referências/seeds citadas com as registradas nos episódios anteriores da série.
  **Falha se:** o episódio criou âncora nova para um personagem que já existia, sem registro de por quê.

- [ ] **NS-PD-04** · `BLOQUEANTE` — Wardrobe e cenário recorrentes estão no prompt, não subentendidos.
  **Teste:** o prompt de cada plano descreve a roupa e o ambiente do personagem conforme a bíblia.
  **Falha se:** o prompt confia que "o modelo lembra" — não lembra.

- [ ] **NS-PD-05** · `BLOQUEANTE` — O pacote de voz mantém o timbre do personagem entre episódios.
  **Teste:** o `asset_direction` de VO registra a voz/preset usada nos episódios anteriores e a reaproveita.
  **Falha se:** a voz do personagem mudou entre episódios sem justificativa narrativa.

- [ ] **NS-PD-06** · `BLOQUEANTE` — Os pacotes de planos de comédia especificam o **tempo**, não só a imagem.
  **Teste:** planos de piada trazem duração-alvo e o que precisa acontecer antes do corte (reação, beat de silêncio, retorno ao personagem).
  **Falha se:** o pacote entrega só a imagem, deixando o timing para a montagem descobrir sozinha.

- [ ] **NS-PD-07** · `ATENÇÃO` — `armadilhas_conhecidas` cobre deriva de personagem.
  **Teste:** os pacotes mencionam deriva de rosto entre gerações, mudança de idade aparente e alteração de wardrobe.
  **Falha se:** nenhum pacote antecipa o problema central do gênero.

- [ ] **NS-PD-08** · `ATENÇÃO` — Existe pacote para a capa/thumb do episódio.
  **Teste:** o `image-lab` foi acionado como sub-rotina e há `asset_direction` para a capa.
  **Falha se:** a capa foi improvisada a partir de um frame do vídeo sem direção própria.

---

## Bloco B — Consistência de personagem entre episódios (NS-CP)

- [ ] **NS-CP-01** · `BLOQUEANTE` — O personagem é reconhecível como o mesmo do episódio anterior.
  **Teste:** colocar lado a lado um frame frontal deste episódio e um do anterior; comparar formato de rosto, olhos, cabelo, idade aparente, tom de pele.
  **Falha se:** um espectador que não acompanha a série diria que são pessoas diferentes.

- [ ] **NS-CP-02** · `BLOQUEANTE` — Consistência interna ao episódio.
  **Teste:** comparar 3 planos distintos do mesmo personagem dentro do episódio.
  **Falha se:** há deriva perceptível entre planos consecutivos.

- [ ] **NS-CP-03** · `BLOQUEANTE` — Wardrobe conforme a bíblia (ou mudança justificada na história).
  **Teste:** comparar roupa e acessórios com a bíblia; se mudou, existe motivo narrativo no roteiro.
  **Falha se:** mudou sem motivo, ou mudou dentro da mesma cena.

- [ ] **NS-CP-04** · `BLOQUEANTE` — Voz do personagem estável entre episódios.
  **Teste:** ouvir uma fala deste episódio e uma do anterior.
  **Falha se:** timbre, idade vocal ou sotaque mudaram sem motivo de história.

- [ ] **NS-CP-05** · `ATENÇÃO` — Cenário recorrente estável.
  **Teste:** comparar o ambiente-base entre episódios (cor de parede, móveis, layout).
  **Falha se:** o mesmo ambiente virou outro lugar sem elipse.

- [ ] **NS-CP-06** · `ATENÇÃO` — Bordão, tique ou marca do personagem preservados.
  **Teste:** conferir contra a bíblia os traços de comportamento declarados.
  **Falha se:** o personagem perdeu o que o tornava reconhecível.

---

## Bloco C — Arco fechado no episódio (NS-AR)

- [ ] **NS-AR-01** · `BLOQUEANTE` — O episódio tem começo, virada e desfecho próprios.
  **Teste:** apontar o timecode dos três momentos. O desfecho precisa resolver a situação apresentada no começo **deste** episódio.
  **Falha se:** falta algum dos três, ou o desfecho depende de assistir ao episódio seguinte.

- [ ] **NS-AR-02** · `BLOQUEANTE` — O episódio funciona para quem nunca viu a série.
  **Teste:** assistir sem contexto: dá para entender quem é o personagem, qual é a situação e por que ela é engraçada/interessante?
  **Falha se:** o episódio exige conhecimento prévio para fazer sentido. Em rede social a maioria da audiência chega no meio.

- [ ] **NS-AR-03** · `BLOQUEANTE` — A situação é apresentada nos primeiros 15% da duração.
  **Teste:** marcar quando o espectador entende o que está acontecendo; comparar com 15% do total.
  **Falha se:** passa disso. Setup longo mata retenção em short-form.

- [ ] **NS-AR-04** · `ATENÇÃO` — O conflito escala, não repete.
  **Teste:** listar os beats; cada um deve elevar, complicar ou virar a situação.
  **Falha se:** há dois ou mais beats que apenas repetem a mesma piada com outras palavras.

- [ ] **NS-AR-05** · `ATENÇÃO` — O desfecho não é explicação.
  **Teste:** o final resolve por ação, imagem ou virada, não por um personagem explicando a moral.
  **Falha se:** o episódio termina com alguém verbalizando a lição.

---

## Bloco D — Gancho para o próximo (NS-GN)

- [ ] **NS-GN-01** · `BLOQUEANTE` — Existe gancho para o próximo episódio.
  **Teste:** identificar o dispositivo: pergunta aberta, elemento novo introduzido, promessa explícita, situação suspensa.
  **Falha se:** o episódio fecha completamente sem nenhuma razão para voltar.

- [ ] **NS-GN-02** · `BLOQUEANTE` — O gancho não anula o desfecho do episódio.
  **Teste:** conferir que o arco de NS-AR-01 fecha **antes** do gancho.
  **Falha se:** o gancho substituiu o desfecho — isso é episódio interrompido, não série.

- [ ] **NS-GN-03** · `ATENÇÃO` — O gancho está nos últimos 15% da peça.
  **Teste:** medir o timecode.
  **Falha se:** o gancho aparece cedo demais e é esquecido, ou depois do CTA/assinatura.

- [ ] **NS-GN-04** · `ATENÇÃO` — O gancho é cumprível.
  **Teste:** conferir contra o plano da temporada/próximo episódio.
  **Falha se:** promete algo que não existe no planejamento — gancho não cumprido queima a audiência recorrente.

---

## Bloco E — Referências de bolha sem difamação nem violação (NS-BB)

> Aplicar o **teste de três perguntas** do `@fact-checker` a cada personagem inspirado em
> gente real. Este bloco é o mais restritivo do estúdio.

- [ ] **NS-BB-01** · `BLOQUEANTE NON-WAIVABLE` — A sátira atinge um comportamento/arquétipo, não uma pessoa nomeável.
  **Teste:** o personagem tem nome fictício, bordão original e não é apresentado como alguém real.
  **Falha se:** cita nome, @handle ou apelido de pessoa real como alvo.

- [ ] **NS-BB-02** · `BLOQUEANTE NON-WAIVABLE` — Nenhuma imputação de fato desabonador a pessoa real.
  **Teste:** varrer o roteiro por acusações de crime, fraude, golpe, sonegação, mentira a clientes ou conduta ilícita associadas a alguém identificável.
  **Falha se:** encontrar qualquer uma sem fonte primária **e** aval do `@studio-chief`.

- [ ] **NS-BB-03** · `BLOQUEANTE NON-WAIVABLE` — O personagem não é inequivocamente identificável.
  **Teste:** somar os indicadores — semelhança física, bordão característico, nicho específico, contexto/cenário reconhecível. Três ou mais apontando para a mesma pessoa real = identificação.
  **Falha se:** três ou mais indicadores convergem, mesmo sem citar o nome.

- [ ] **NS-BB-04** · `BLOQUEANTE` — A peça está marcada como ficção/paródia.
  **Teste:** existe sinal de ficcionalidade — na peça, no título ou na caption declarada no manifesto (caso AID-5).
  **Falha se:** a peça pode ser lida como registro real de alguém.

- [ ] **NS-BB-05** · `BLOQUEANTE` — Nenhuma marca de terceiro é ridicularizada de forma identificável.
  **Teste:** varrer frames e falas por logo, embalagem, nome de empresa ou interface reconhecível associados à piada.
  **Falha se:** encontrar. Sátira de categoria é permitida; sátira de marca nomeada, não.

- [ ] **NS-BB-06** · `ATENÇÃO` — A referência de bolha é reconhecível pelo público-alvo.
  **Teste:** a piada depende de um código do nicho (jargão, ritual, tipo social) que o avatar do brief reconhece.
  **Falha se:** a referência é genérica e funcionaria em qualquer nicho — perde o valor de pertencimento, que é o motor do gênero.

- [ ] **NS-BB-07** · `ATENÇÃO` — A sátira não vira agressão a grupo protegido.
  **Teste:** conferir se a piada se apoia em origem, gênero, orientação, religião, deficiência ou etnia.
  **Falha se:** sim — além do risco de plataforma, contradiz o arquétipo da marca.

---

## Bloco F — Timing de comédia e ritmo (NS-TM)

- [ ] **NS-TM-01** · `BLOQUEANTE` — Cada punchline tem o beat de respiro antes ou depois, conforme a decupagem.
  **Teste:** medir o intervalo entre o setup e a punchline, e o espaço após ela.
  **Falha se:** a punchline é atropelada pelo corte seguinte, ou o silêncio se estende tanto que a piada esvazia.

- [ ] **NS-TM-02** · `BLOQUEANTE` — O corte não antecipa a piada.
  **Teste:** conferir se a montagem, a legenda ou o texto em tela revelam o desfecho antes da fala.
  **Falha se:** a legenda exibe a punchline antes de ser dita — o erro mais comum em autolegenda.

- [ ] **NS-TM-03** · `BLOQUEANTE` — Nenhum bloco morto.
  **Teste:** identificar trechos sem evento novo acima de 2× a duração média de plano.
  **Falha se:** existe algum.

- [ ] **NS-TM-04** · `BLOQUEANTE` — Cortes limpos.
  **Teste:** revisar cada ponto de corte: frame duplicado, corte no meio de sílaba, flash preto, salto de posição.
  **Falha se:** existe qualquer um.

- [ ] **NS-TM-05** · `ATENÇÃO` — A reação existe onde a piada precisa dela.
  **Teste:** para cada punchline, verificar se há plano de reação (do personagem ou visual).
  **Falha se:** a piada acontece e a peça segue adiante sem reagir.

- [ ] **NS-TM-06** · `ATENÇÃO` — A trilha e os SFX apoiam o timing sem denunciá-lo.
  **Teste:** conferir se há stinger cômico sublinhando toda piada.
  **Falha se:** o áudio "explica" a graça em vez de apoiá-la.

---

## Bloco G — Asset devolvido pelo humano (NS-AS)

- [ ] **NS-AS-01** · `BLOQUEANTE` — Todo asset passou nos critérios de aceite do pacote.
  **Teste:** marcar sim/não por critério em cada asset usado.
  **Falha se:** asset reprovado entrou no master sem waiver registrado.

- [ ] **NS-AS-02** · `BLOQUEANTE` — As âncoras de consistência efetivamente usadas foram registradas.
  **Teste:** a rastreabilidade traz seed/imagem de referência de cada geração de personagem.
  **Falha se:** o operador acertou o personagem e não registrou como — a série perde a receita.

- [ ] **NS-AS-03** · `BLOQUEANTE` — Zero artefato de IA em rosto e mãos nos planos fechados.
  **Teste:** revisar frames em que rosto ou mão ocupam mais de 1/4 do quadro.
  **Falha se:** há deformação perceptível em exibição normal.

- [ ] **NS-AS-04** · `ATENÇÃO` — Assets aprovados foram promovidos a referência da série.
  **Teste:** o still de personagem aprovado foi arquivado como âncora para os próximos episódios.
  **Falha se:** não foi — o próximo episódio recomeça do zero.

- [ ] **NS-AS-05** · `ATENÇÃO` — Retakes foram dirigidos com mudança registrada.
  **Teste:** `asset_id` com múltiplas rodadas tem registro do que mudou.
  **Falha se:** 3+ tentativas idênticas no escuro.

---

## Evidência (preenchida pelo `@qa-critic`)

| Campo | Valor |
|:---|:---|
| Série / episódio / duração | |
| Personagens recorrentes (bíblia + versão) | |
| Âncoras de consistência usadas | |
| Situação apresentada em (timecode) | |
| Gancho em (timecode) | |
| Teste de 3 perguntas (resultado) | |
| Bloqueantes reprovados (IDs) | |
| Atenções reprovadas (IDs) | |
| Rubrica D1 / D3 / D6 | |
| Gate transversal | PASS · CONCERNS · FAIL |

## Veredito do gênero

- **Resultado:** `PASS` · `CONCERNS` · `FAIL` · `WAIVED`
- **Regra:** qualquer `BLOQUEANTE` reprovado → FAIL. Só `ATENÇÃO` reprovada → CONCERNS.
  Itens `NON-WAIVABLE` do Bloco E não aceitam waiver em nenhuma hipótese.
- **Entrega exige:** este gate **e** `gate-transversal-entrega.md` aprovados.
