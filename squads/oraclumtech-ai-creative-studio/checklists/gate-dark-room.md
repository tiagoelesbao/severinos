# Gate de Gênero — Dark Room (`dark-room` · P5)

> **Gênero:** canal dark sem rosto (YouTube long/short, TikTok, Instagram). VO + b-roll de IA + motion.
> **Objetivo:** escala e monetização de canal sem exposição pessoal.
> **Executor:** `@qa-critic` · **Pré-requisito:** laudo `CLEAR` do `@fact-checker`.
> **Roda junto com:** `gate-transversal-entrega.md` (base comum — não repetida aqui).
> **Dimensões críticas da rubrica:** D2 execução · D3 retenção · D5 clareza de ação.

---

## Como ler

`BLOQUEANTE` = reprovou, **FAIL**. `BLOQUEANTE NON-WAIVABLE` = nem o `@studio-chief` derruba.
`ATENÇÃO` = reprovou, **CONCERNS**. Todo item tem **Teste** e **Falha se**.

**Este gate avalia duas coisas separadas:**
- **Bloco A** — a qualidade do **Pacote de Direção** entregue ao operador humano.
  Este é o gênero de maior volume: pacote vago é FALHA mesmo com asset bom, porque o
  canal depende de repetir o acerto dezenas de vezes.
- **Blocos B a G** — a qualidade do que o humano **devolveu** e do vídeo montado.

> **Risco central deste gênero.** Canal dark é onde a plataforma mais desmonetiza. Duas
> causas dominam: **conteúdo reciclado sem valor agregado** e **produção em massa sem
> curadoria**. O Bloco F trata disso e tem itens NON-WAIVABLE.

---

## Bloco A — Pacote de Direção específico do dark room (DR-PD)

- [ ] **DR-PD-01** · `BLOQUEANTE` — Cada bloco do roteiro tem seu b-roll dirigido, não um pool genérico.
  **Teste:** o `destino` de cada `asset_direction` aponta um trecho específico da VO (timecode ou parágrafo).
  **Falha se:** os pacotes produzem um banco genérico de imagens "sobre o tema" para colar em qualquer lugar.

- [ ] **DR-PD-02** · `BLOQUEANTE` — O prompt descreve uma **cena específica**, não o conceito abstrato.
  **Teste:** o prompt tem sujeito, ação e ambiente concretos.
  **Falha se:** o prompt é um conceito ("inovação", "crescimento", "tecnologia") — isso devolve exatamente o b-roll genérico que este gate reprova no Bloco C.

- [ ] **DR-PD-03** · `BLOQUEANTE` — O pacote define a rota de movimento de cada asset.
  **Teste:** cada plano declara se será I2V, animação de câmera sobre still (Ken Burns/parallax) ou composição em After Effects — e com qual intensidade.
  **Falha se:** a rota não está declarada e o operador decide sozinho, produzindo movimento desigual ao longo do vídeo.

- [ ] **DR-PD-04** · `BLOQUEANTE` — O pacote de VO dirige interpretação por bloco.
  **Teste:** o `asset_direction` de voz traz o texto exato, o ritmo e a intenção por bloco (abertura, desenvolvimento, virada, fechamento).
  **Falha se:** o operador recebeu o roteiro inteiro sem marcação de intenção — resultado é VO plana de 8 minutos.

- [ ] **DR-PD-05** · `BLOQUEANTE` — Existe pacote dedicado para a thumbnail.
  **Teste:** há `asset_direction` de thumb com destino, texto que entrará na imagem e critério de legibilidade.
  **Falha se:** a thumb saiu de um frame do vídeo sem direção própria.

- [ ] **DR-PD-06** · `ATENÇÃO` — `armadilhas_conhecidas` cobre as falhas típicas do b-roll gerado.
  **Teste:** os pacotes mencionam texto alucinado em placas/telas, rosto deformado em plano médio e movimento derretendo em I2V longo.
  **Falha se:** nenhum pacote antecipa nenhuma delas.

- [ ] **DR-PD-07** · `ATENÇÃO` — O pacote declara a duração-alvo de cada asset.
  **Teste:** cada take tem a duração que o bloco de VO exige.
  **Falha se:** todos os takes têm a mesma duração padrão, obrigando a montagem a esticar ou cortar no susto.

---

## Bloco B — VO inteligível (DR-VO)

- [ ] **DR-VO-01** · `BLOQUEANTE` — Toda palavra é compreensível sem legenda.
  **Teste:** ouvir a peça inteira em alto-falante de celular, sem legenda, em volume médio.
  **Falha se:** alguma palavra exige legenda ou repetição para ser entendida.

- [ ] **DR-VO-02** · `BLOQUEANTE` — Pronúncia correta de nomes próprios, marcas e termos técnicos.
  **Teste:** listar os termos críticos do roteiro e conferir um a um.
  **Falha se:** há qualquer erro de pronúncia em termo-chave — o erro mais frequente de VO sintética.

- [ ] **DR-VO-03** · `BLOQUEANTE` — Sem artefato de síntese audível.
  **Teste:** ouvir procurando corte metálico entre frases, respiração artificial repetida, sílaba engolida, mudança de timbre no meio do bloco.
  **Falha se:** há artefato perceptível em exibição normal.

- [ ] **DR-VO-04** · `BLOQUEANTE` — VO acima da trilha em toda a peça, com ducking funcionando.
  **Teste:** conferir os trechos de pico da trilha.
  **Falha se:** a trilha cobre a VO em algum ponto, ou o ducking corta bruscamente a música.

- [ ] **DR-VO-05** · `ATENÇÃO` — A entonação varia conforme a marcação do pacote.
  **Teste:** comparar a intenção declarada por bloco com o resultado.
  **Falha se:** a VO é uniforme do início ao fim num vídeo com virada.

- [ ] **DR-VO-06** · `ATENÇÃO` — Pausas nos pontos de respiro previstos.
  **Teste:** conferir se há pausa entre blocos temáticos.
  **Falha se:** a locução é um fluxo contínuo sem respiro em peça longa.

---

## Bloco C — B-roll não-genérico (DR-BR)

- [ ] **DR-BR-01** · `BLOQUEANTE` — Cada asset ilustra **o que está sendo dito naquele momento**.
  **Teste:** amostrar 5 pontos do vídeo; em cada um, a imagem corresponde à frase da VO.
  **Falha se:** em algum ponto a imagem é decorativa e poderia estar em qualquer outro trecho.

- [ ] **DR-BR-02** · `BLOQUEANTE` — Nenhum clichê visual de banco de imagem.
  **Teste:** varrer por: aperto de mão corporativo, gráfico de barras subindo genérico, cérebro digital com circuitos, rede neural azul flutuante, pessoa apontando para tela vazia, robô humanoide.
  **Falha se:** encontrar qualquer um — e, para a Oraclum, "robô apertando mão humana" e "IA como mágica" são violação declarada de `restricoes.nunca_fazer`.

- [ ] **DR-BR-03** · `BLOQUEANTE` — Nenhuma imagem repetida sem intenção.
  **Teste:** listar os assets e contar repetições.
  **Falha se:** o mesmo asset aparece 3+ vezes sem função de recorrência declarada na decupagem.

- [ ] **DR-BR-04** · `BLOQUEANTE` — Sem texto alucinado legível nos frames.
  **Teste:** revisar frames com placas, telas, livros, letreiros.
  **Falha se:** há texto ilegível/inventado visível em plano que fica mais de 1 s em tela.

- [ ] **DR-BR-05** · `BLOQUEANTE` — Movimento sem derretimento.
  **Teste:** revisar os takes de I2V, especialmente os mais longos, procurando deformação progressiva de geometria, rosto ou objeto.
  **Falha se:** há derretimento perceptível em exibição normal.

- [ ] **DR-BR-06** · `ATENÇÃO` — Coerência visual entre assets do mesmo bloco.
  **Teste:** comparar paleta, grão e tratamento dentro de cada bloco temático.
  **Falha se:** o bloco parece uma colagem de fontes diferentes sem partido declarado.

- [ ] **DR-BR-07** · `ATENÇÃO` — Uso de screen capture real onde a informação é técnica.
  **Teste:** trechos que explicam ferramenta/processo usam captura real em vez de recriação.
  **Falha se:** o vídeo "ilustra" um software com imagem inventada quando a captura real existia.

---

## Bloco D — Retenção por bloco (DR-RE)

- [ ] **DR-RE-01** · `BLOQUEANTE` — A promessa do título é entregue nos primeiros 10% da duração.
  **Teste:** marcar o timecode em que o vídeo começa a cumprir o que o título prometeu.
  **Falha se:** o vídeo enrola além de 10% antes de tocar no assunto do título.

- [ ] **DR-RE-02** · `BLOQUEANTE` — Nenhum bloco sem evento.
  **Teste:** dividir o vídeo em blocos de 30 s (long-form) ou 10 s (short-form); cada bloco precisa de pelo menos um evento — troca de asset, mudança de ritmo, informação nova, motion, mudança de som.
  **Falha se:** existe bloco sem nenhum evento.

- [ ] **DR-RE-03** · `BLOQUEANTE` — Nenhum asset em tela além do limite sem movimento.
  **Teste:** medir o tempo de cada asset estático em tela.
  **Falha se:** algum asset fica mais de 5 s sem movimento de câmera, corte ou motion sobreposto.

- [ ] **DR-RE-04** · `BLOQUEANTE` — Cortes limpos.
  **Teste:** revisar cada ponto de corte: frame duplicado, corte no meio de sílaba, flash preto.
  **Falha se:** existe qualquer um.

- [ ] **DR-RE-05** · `ATENÇÃO` — Existe open loop declarado nos primeiros 20%.
  **Teste:** identificar a pergunta ou promessa suspensa que sustenta a permanência.
  **Falha se:** não há nenhuma em peça longa.

- [ ] **DR-RE-06** · `ATENÇÃO` — O open loop é fechado antes do fim.
  **Teste:** localizar o pagamento da promessa.
  **Falha se:** foi aberto e nunca pago — queima a audiência do canal.

- [ ] **DR-RE-07** · `ATENÇÃO` — A duração corresponde à densidade do conteúdo.
  **Teste:** comparar a quantidade de informação distinta com a duração.
  **Falha se:** o vídeo foi esticado para atingir um tempo-alvo, repetindo a mesma ideia.

---

## Bloco E — Thumb e título coerentes (DR-TT)

- [ ] **DR-TT-01** · `BLOQUEANTE` — A thumb representa o conteúdo real do vídeo.
  **Teste:** o elemento central da thumb existe e é tratado no vídeo.
  **Falha se:** a thumb mostra algo que o vídeo não entrega.

- [ ] **DR-TT-02** · `BLOQUEANTE` — O título não promete além do que o vídeo cumpre.
  **Teste:** conferir a promessa do título contra o conteúdo.
  **Falha se:** há exagero, superlativo sem lastro ou promessa não cumprida.

- [ ] **DR-TT-03** · `BLOQUEANTE` — Texto da thumb legível em miniatura.
  **Teste:** reduzir a thumb para 320×180 (ou 168×300 em vertical) e ler.
  **Falha se:** o texto não é legível, ou passa de 5 palavras.

- [ ] **DR-TT-04** · `BLOQUEANTE` — Thumb e título não se repetem, se complementam.
  **Teste:** ler os dois juntos.
  **Falha se:** a thumb apenas escreve o título de novo — desperdiça o espaço de atração.

- [ ] **DR-TT-05** · `ATENÇÃO` — Thumb com contraste e ponto focal claros.
  **Teste:** em miniatura, identificar o ponto focal em menos de 1 segundo.
  **Falha se:** a imagem é uniforme, poluída ou sem hierarquia.

- [ ] **DR-TT-06** · `ATENÇÃO` — Thumb dentro da identidade da série/canal.
  **Teste:** comparar com as thumbs anteriores do canal (fonte, tratamento, posição do texto).
  **Falha se:** destoa sem motivo declarado.

---

## Bloco F — Política de monetização e conteúdo reciclado (DR-MN)

- [ ] **DR-MN-01** · `BLOQUEANTE NON-WAIVABLE` — Nenhum trecho de obra de terceiro sem licença.
  **Teste:** listar todo footage, música, SFX e imagem de origem externa; conferir licença nominal com escopo.
  **Falha se:** há material de terceiro sem comprovante — é a causa nº 1 de desmonetização e de strike.

- [ ] **DR-MN-02** · `BLOQUEANTE NON-WAIVABLE` — O vídeo agrega valor sobre qualquer material reaproveitado.
  **Teste:** se há material de terceiro licenciado, verificar o que o vídeo acrescenta: comentário original, análise, edição transformadora, contexto novo.
  **Falha se:** o vídeo é recompilação com VO por cima descrevendo o que já se vê.

- [ ] **DR-MN-03** · `BLOQUEANTE` — O roteiro é original, não paráfrase de uma única fonte.
  **Teste:** comparar a estrutura com a fonte principal do dossiê de referência.
  **Falha se:** o roteiro segue a mesma sequência de argumentos de uma única fonte, trocando as palavras.

- [ ] **DR-MN-04** · `BLOQUEANTE` — Disclosure de IA quando a peça recria evento ou situação como documental.
  **Teste:** aplicar o caso AID-2 do `@fact-checker`.
  **Falha se:** a peça apresenta b-roll gerado como se fosse registro real de um acontecimento.

- [ ] **DR-MN-05** · `BLOQUEANTE` — Nenhum conteúdo vedado pela política do canal.
  **Teste:** varrer por promessa de ganho financeiro, alegação de saúde, conteúdo chocante e afirmação sobre pessoa real sem fonte.
  **Falha se:** encontrar qualquer um.

- [ ] **DR-MN-06** · `ATENÇÃO` — Créditos de fonte presentes onde a licença exige.
  **Teste:** conferir a exigência de atribuição de cada licença e a presença do crédito na peça ou na descrição.
  **Falha se:** a licença exige e o crédito não está.

- [ ] **DR-MN-07** · `ATENÇÃO` — A descrição do vídeo lista as fontes usadas.
  **Teste:** conferir o kit de publicação.
  **Falha se:** o vídeo cita dados e a descrição não traz nenhuma fonte.

---

## Bloco G — Asset devolvido pelo humano (DR-AS)

- [ ] **DR-AS-01** · `BLOQUEANTE` — Todo asset passou nos critérios de aceite do pacote.
  **Teste:** marcar sim/não por critério em cada asset usado.
  **Falha se:** asset reprovado entrou no master sem waiver registrado.

- [ ] **DR-AS-02** · `BLOQUEANTE` — Resolução nativa igual ou maior que a de entrega.
  **Teste:** conferir dimensões dos originais.
  **Falha se:** houve ampliação além de 100% sem upscale declarado.

- [ ] **DR-AS-03** · `BLOQUEANTE` — Nenhuma marca d'água de ferramenta ou de banco.
  **Teste:** inspecionar bordas e cantos de cada asset.
  **Falha se:** encontrar.

- [ ] **DR-AS-04** · `ATENÇÃO` — Assets descartados registrados com motivo.
  **Teste:** conferir o registro de descarte por `asset_id`.
  **Falha se:** não há — num canal de volume, é assim que a armadilha do modelo vira conhecimento.

- [ ] **DR-AS-05** · `ATENÇÃO` — O tempo por asset gerado está dentro do orçamento do job.
  **Teste:** comparar o número de gerações com o previsto pelo `exec-producer`.
  **Falha se:** estourou sem registro — no dark room, custo por asset define a viabilidade do canal.

---

## Evidência (preenchida pelo `@qa-critic`)

| Campo | Valor |
|:---|:---|
| Canal / formato / duração | |
| Assets de b-roll (gerados / licenciados) | |
| Promessa do título cumprida em (timecode) | |
| Open loop aberto / fechado | |
| Blocos sem evento (qtd) | |
| Bloqueantes reprovados (IDs) | |
| Atenções reprovadas (IDs) | |
| Rubrica D2 / D3 / D5 | |
| Gate transversal | PASS · CONCERNS · FAIL |

## Veredito do gênero

- **Resultado:** `PASS` · `CONCERNS` · `FAIL` · `WAIVED`
- **Regra:** qualquer `BLOQUEANTE` reprovado → FAIL. Só `ATENÇÃO` reprovada → CONCERNS.
  Itens `NON-WAIVABLE` do Bloco F não aceitam waiver em nenhuma hipótese.
- **Entrega exige:** este gate **e** `gate-transversal-entrega.md` aprovados.
