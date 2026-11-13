# Gate Transversal de Entrega — vale para TODA peça do estúdio

> **Executor:** `@qa-critic` (veredito) com pré-requisito de `@fact-checker` (bloqueio)
> **Quando rodar:** no estágio `gate`, depois do `factcheck` e antes do `delivery`.
> **Escopo:** todos os pipelines (P1 brand-film, P2 ugc-ads, P3 nicho-series,
> P4 oraclum-institucional, P5 dark-room, P6 image-lab).
> **Relação com os gates de gênero:** este arquivo é a **base comum**. O gate do gênero
> roda em cima dele e NÃO repete estes itens. Peça só é entregue com os dois aprovados.

---

## Como ler este checklist

| Marca | Significado | Efeito no veredito |
|:---|:---|:---|
| `BLOQUEANTE` | Falha impede a entrega | Um item reprovado → **FAIL** |
| `BLOQUEANTE NON-WAIVABLE` | Falha impede a entrega e **não aceita waiver** | Nem o `@studio-chief` derruba |
| `ATENÇÃO` | Falha degrada a peça mas não impede a entrega | Um item reprovado → **CONCERNS** |

**Regra de escrita dos itens.** Todo item tem um **Teste** (o que fazer para verificar) e
um **Falha se** (a condição objetiva de reprovação). Item que não pode ser respondido com
sim/não por um terceiro que não participou da produção está mal escrito e vai para o
backlog de checklist — não reprova a peça atual.

**Proibido neste arquivo:** "está bom", "tem qualidade", "ficou profissional",
"parece bem feito". Se o critério não tem teste, não é critério.

---

## Bloco 0 — Pré-condições do gate (PC)

- [ ] **TR-PC-01** · `BLOQUEANTE NON-WAIVABLE` — Existe laudo do `@fact-checker` para esta versão da peça.
  **Teste:** existe `{job}/15-gate/factcheck-report.md` cuja data seja **posterior** ao último arquivo alterado do master.
  **Falha se:** o laudo não existe, ou é anterior à última alteração da peça (laudo velho não vale para peça nova).

- [ ] **TR-PC-02** · `BLOQUEANTE NON-WAIVABLE` — O laudo não está em estado `BLOCKED`.
  **Teste:** ler o campo de veredito do laudo.
  **Falha se:** veredito = `BLOCKED` ou `BLOCKED_NON_WAIVABLE`. Neste caso o gate encerra imediatamente com FAIL, sem rodar os demais blocos.

- [ ] **TR-PC-03** · `BLOQUEANTE` — Condições pendentes de um `CLEAR_CONDICIONADO` foram cumpridas.
  **Teste:** para cada condição listada no laudo, existe evidência do cumprimento (arquivo novo, timecode corrigido, documento anexado).
  **Falha se:** alguma condição está sem evidência, ou a evidência é apenas a afirmação de que foi feito.

- [ ] **TR-PC-04** · `BLOQUEANTE` — O `delivery-manifest.yaml` do job existe e está preenchido.
  **Teste:** abrir `{job}/16-delivery/delivery-manifest.yaml`; todos os campos obrigatórios do template estão preenchidos (nenhum `TODO`, `<...>`, `null` em campo obrigatório).
  **Falha se:** o manifesto não existe, ou tem campo obrigatório vazio, ou lista arquivos que não estão em disco.

---

## Bloco 1 — Qualidade do Pacote de Direção (PD)

> **Por que este bloco existe.** Pela Regra de Ouro (§3.1 do blueprint), o estúdio **não gera**
> imagem, vídeo nem voz: ele **dirige** a geração, que é humana. O produto dos agentes de
> execução é o **Pacote de Direção** (§3.2). Portanto o pacote é avaliado como entregável de
> primeira classe: **um pacote vago é FALHA mesmo que o asset tenha saído bom por sorte.**
> Um asset bom com pacote ruim não é reproduzível — na próxima peça o acerto não se repete.

- [ ] **TR-PD-01** · `BLOQUEANTE` — Existe um `asset_direction` para cada asset que foi gerado por humano.
  **Teste:** contar os assets entregues em `{job}/11-stills/entregues/`, `{job}/12-takes/entregues/` e `{job}/13-audio/entregues/`; contar os blocos `asset_direction` nos arquivos `_direction/{asset-id}.yaml`. Os conjuntos de `asset_id` devem coincidir.
  **Falha se:** existe asset entregue sem `asset_direction` correspondente, ou `asset_direction` sem asset (direção que ninguém executou e ninguém cancelou).

- [ ] **TR-PD-02** · `BLOQUEANTE` — O campo `prompt` é colável sem edição.
  **Teste:** ler cada `prompt` procurando marcadores de preenchimento: `<`, `>`, `{{`, `}}`, `[inserir`, `TODO`, `XXX`, `...`, `descrever aqui`.
  **Falha se:** qualquer `prompt` contém marcador de preenchimento, ou instrui o operador a "adaptar conforme necessário" sem dar o texto final.

- [ ] **TR-PD-03** · `BLOQUEANTE` — `ferramenta_recomendada` nomeia ferramenta **e** modelo/versão, e traz alternativa com motivo.
  **Teste:** o campo cita um nome próprio de ferramenta e uma identificação de modelo/versão; existe uma alternativa nomeada e uma frase dizendo **por que** ela é a segunda escolha.
  **Falha se:** o campo diz apenas a categoria ("um gerador de imagem", "IA de vídeo"), ou não há alternativa, ou a alternativa vem sem justificativa.

- [ ] **TR-PD-04** · `BLOQUEANTE` — `parametros` traz o mínimo operacional do tipo de asset.
  **Teste:** por tipo —
  · **imagem:** aspect ratio, resolução-alvo, seed (valor ou "livre" declarado);
  · **vídeo:** aspect, duração em segundos, fps, intensidade de movimento, still de origem (I2V) ou declaração explícita de T2V;
  · **voz:** voz/preset, idioma, ritmo, e referência de entonação.
  **Falha se:** qualquer campo do mínimo está ausente ou escrito como faixa vaga ("mais ou menos 5s", "resolução alta").

- [ ] **TR-PD-05** · `BLOQUEANTE` — `tecnica` tem no mínimo 2 itens e cada um descreve um **como**, não um adjetivo.
  **Teste:** cada item começa com uma ação executável (gerar, usar, travar, referenciar, dividir, encadear) e diz em que ordem.
  **Falha se:** os itens são qualidades desejadas ("cinematográfico", "orgânico", "com bom enquadramento") em vez de procedimento; ou há menos de 2 itens.

- [ ] **TR-PD-06** · `BLOQUEANTE` — `armadilhas_conhecidas` tem no mínimo 2 itens específicos **daquele** modelo.
  **Teste:** cada armadilha nomeia um defeito concreto e o contorno ("mão em primeiro plano deforma → enquadrar acima do punho ou esconder a mão atrás do produto").
  **Falha se:** as armadilhas são genéricas de IA em geral sem contorno, ou o campo repete a mesma armadilha em todos os assets sem relação com o que cada plano pede.

- [ ] **TR-PD-07** · `BLOQUEANTE` — `criterio_de_aceite` é binário e verificável por quem não participou da direção.
  **Teste:** cada critério pode ser respondido com sim/não olhando o arquivo devolvido. Ex.: "o produto aparece inteiro, sem corte de borda" (sim/não) vs. "o produto está bonito" (opinião).
  **Falha se:** existe critério com adjetivo de gosto ("bonito", "impactante", "premium", "clean") sem tradução em teste observável.

- [ ] **TR-PD-08** · `ATENÇÃO` — `quantas_variacoes` é um inteiro ≥ 2.
  **Teste:** ler o campo.
  **Falha se:** o campo está ausente, é 1, ou é uma faixa aberta ("quantas precisar").
  **Por quê:** variação única elimina a escolha, que é justamente onde entra o feeling humano.

- [ ] **TR-PD-09** · `ATENÇÃO` — `pos_processamento` está declarado, inclusive quando não há.
  **Teste:** o campo lista as etapas (upscale, corte, grade, limpeza) ou diz explicitamente `nenhum`.
  **Falha se:** o campo está ausente. Ausência silenciosa faz o operador inventar ou pular.

- [ ] **TR-PD-10** · `BLOQUEANTE` — `se_falhar` traz plano B **concreto e diferente** do plano A.
  **Teste:** o plano B muda ferramenta, abordagem ou rota do plano (ex.: "I2V falhou 3× → animar o still em After Effects com parallax").
  **Falha se:** o campo diz "tentar de novo", "ajustar o prompt", "avisar o time", ou repete a mesma ferramenta sem mudar a abordagem.

- [ ] **TR-PD-11** · `BLOQUEANTE` — Cada Pacote de Direção chegou ao humano dentro de um card de tarefa.
  **Teste:** existe um card em `{job}/_cards/` por asset (ou por lote declarado), no formato de `templates/human-task-card-tmpl.md`, contendo destino de devolução e nomenclatura do arquivo.
  **Falha se:** existe asset gerado por humano sem card correspondente, ou o card não diz onde devolver, ou não diz o padrão de nome do arquivo.

- [ ] **TR-PD-12** · `BLOQUEANTE NON-WAIVABLE` — Nenhum estágio de geração humana foi simulado por agente.
  **Teste:** para cada asset entregue, o registro de rastreabilidade (Bloco 2) nomeia um **operador humano**.
  **Falha se:** algum asset tem como operador um agente, ou o campo está vazio, ou o asset apareceu no diretório `entregues/` sem card e sem operador.
  **Por quê:** §3.1 do blueprint — a geração final é humana, e simular execução humana corrompe o estado do job e o aprendizado do pacote.

- [ ] **TR-PD-13** · `ATENÇÃO` — O pacote foi corrigido quando o retake foi necessário.
  **Teste:** se houve retake (mais de uma rodada de devolução para o mesmo `asset_id`), o `asset_direction` correspondente registra o que mudou entre as rodadas.
  **Falha se:** houve retake e o pacote continua idêntico ao original. O pacote é ativo de aprendizado; retake sem atualização joga fora a lição.

---

## Bloco 2 — Rastreabilidade do asset (RT)

> Todo asset precisa poder ser reproduzido e auditado meses depois, por outra pessoa.

- [ ] **TR-RT-01** · `BLOQUEANTE` — Todo asset registra **qual ferramenta** o gerou.
  **Teste:** para cada arquivo em `entregues/`, o registro de rastreabilidade traz nome da ferramenta + modelo/versão.
  **Falha se:** algum asset não tem ferramenta registrada, ou traz apenas categoria genérica.

- [ ] **TR-RT-02** · `BLOQUEANTE` — Todo asset registra **o prompt efetivamente usado**.
  **Teste:** o prompt registrado é o que o operador colou, incluindo ajustes feitos na hora — não uma cópia automática do prompt planejado.
  **Falha se:** o campo está ausente, ou o operador alterou o prompt e registrou o original.
  **Por quê:** o delta entre prompt planejado e prompt usado é a informação mais valiosa que este estúdio produz.

- [ ] **TR-RT-03** · `BLOQUEANTE` — Todo asset registra **os parâmetros** da geração.
  **Teste:** seed (ou "não suportado"/"livre"), aspect, resolução, e os parâmetros específicos do tipo (fps/duração/motion para vídeo; voz/ritmo para áudio).
  **Falha se:** faltam parâmetros que impediriam alguém de reproduzir a mesma geração.

- [ ] **TR-RT-04** · `BLOQUEANTE` — Todo asset registra **quem operou** e **quando**.
  **Teste:** nome/handle do operador humano e data-hora da geração.
  **Falha se:** operador ausente, anônimo ("time"), ou nome de agente.

- [ ] **TR-RT-05** · `ATENÇÃO` — Assets descartados foram registrados com o motivo do descarte.
  **Teste:** se `quantas_variacoes` = N e apenas 1 foi aprovada, existe registro das N-1 descartadas com um motivo curto ("mão deformada", "wardrobe mudou", "logo alucinado").
  **Falha se:** não há registro de descarte. Sem isso, a armadilha do modelo nunca vira conhecimento do estúdio.

- [ ] **TR-RT-06** · `BLOQUEANTE` — O registro de rastreabilidade está em arquivo, no job.
  **Teste:** existe `{job}/11-stills/_direction/rastreabilidade.yaml` (ou o bloco equivalente no `_direction/{asset-id}.yaml`) versionado junto com a peça.
  **Falha se:** a rastreabilidade existe apenas em conversa, em mensagem, ou na cabeça do operador.

---

## Bloco 3 — Fact-check e direitos consolidados (FC)

> O detalhamento é do `@fact-checker`. Aqui se verifica que o resultado dele **chegou** à entrega.

- [ ] **TR-FC-01** · `BLOQUEANTE NON-WAIVABLE` — Nenhum claim numérico, de resultado ou de atribuição sem fonte sobreviveu no master.
  **Teste:** cruzar a tabela de claims do laudo com o texto efetivamente presente no master (locução, texto em tela, legenda).
  **Falha se:** existe no master um claim que o laudo marcou para remoção.

- [ ] **TR-FC-02** · `BLOQUEANTE NON-WAIVABLE` — Direitos de imagem, voz, nome, marca e obra estão resolvidos e documentados.
  **Teste:** para cada asset licenciado, existe comprovante nominal com escopo (canal, território, prazo, uso comercial) anexado ao manifesto.
  **Falha se:** algum direito está como "pendente", ou o comprovante é print de página em vez de licença.

- [ ] **TR-FC-03** · `BLOQUEANTE` — Disclosure de IA aplicado onde a política exige.
  **Teste:** conferir os casos AID-1..AID-5 do `@fact-checker` contra a peça e contra o kit de publicação (flag nativa da plataforma marcada no manifesto).
  **Falha se:** a peça se enquadra num caso obrigatório e não tem disclosure na peça nem flag declarada.

- [ ] **TR-FC-04** · `BLOQUEANTE` — Texto **fora** do master também foi checado.
  **Teste:** caption de publicação, título, thumbnail, nome de arquivo, alt text constam da lista de artefatos analisados no laudo.
  **Falha se:** o laudo cobriu só o roteiro/master e a caption ficou de fora.

---

## Bloco 4 — Nomenclatura e organização (NM)

- [ ] **TR-NM-01** · `BLOQUEANTE` — Todo arquivo de entrega segue o padrão de nome declarado no manifesto.
  **Teste:** padrão `{cliente}_{job-id}_{peca}_{canal}_{aspect}_v{n}.{ext}` (ou o padrão que o manifesto declarar), verificado arquivo a arquivo.
  **Falha se:** existe arquivo com espaço, acento, caractere especial (`#`, `@`, `%`), nome tipo `final_final_v2`, ou sem versão.

- [ ] **TR-NM-02** · `BLOQUEANTE` — Nenhum nome de arquivo carrega handle, nome ou marca de terceiro.
  **Teste:** varrer os nomes por `@`, por nome de criador de benchmark e por marca de concorrente.
  **Falha se:** encontrar qualquer um. Nome de arquivo vaza para o cliente e para a plataforma.

- [ ] **TR-NM-03** · `ATENÇÃO` — A estrutura de pastas da entrega separa master, derivados por canal e fontes.
  **Teste:** existem, no mínimo, `master/`, `canais/` e `fontes/` (ou equivalente declarado).
  **Falha se:** tudo está em pasta única, obrigando o destinatário a adivinhar qual arquivo é o principal.

- [ ] **TR-NM-04** · `ATENÇÃO` — A versão entregue é a versão que passou no gate.
  **Teste:** comparar hash/tamanho/data do arquivo listado no manifesto com o arquivo em `master/`.
  **Falha se:** o arquivo foi regravado depois do veredito sem novo `*regate`.

---

## Bloco 5 — Cadeia de finalização (FN)

> **Cadeia canônica (§3.3):** `apps/video-studio` (timeline auto-montada + autolegenda + FX
> on-brand) → **After Effects** (motion, composição, VFX, lower-third) → **Premiere Pro**
> (corte final, mixagem, master e export). O `editor` e o `motion-lead` entregam
> **especificação executável**, não projeto renderizado.
> Peças de imagem pura (P6) usam `apps/creative-design` e pulam AE/Premiere — marcar N/A.

- [ ] **TR-FN-01** · `BLOQUEANTE` — Existe especificação de montagem executável, não descrição literária.
  **Teste:** a spec traz ordem de cortes **com timecode** e o motivo de cada corte.
  **Falha se:** a spec descreve intenção ("montagem dinâmica no meio") sem timecode, ou não existe.

- [ ] **TR-FN-02** · `BLOQUEANTE` — A spec diz o que o `video-studio` já resolveu e **não** deve ser refeito à mão.
  **Teste:** existe seção explícita listando o que veio pronto do app (timeline base, autolegenda, FX on-brand) e o que é trabalho de AE/Premiere.
  **Falha se:** a seção não existe. Sem ela, o operador refaz legenda à mão e perde a sincronia que o app já tinha acertado.

- [ ] **TR-FN-03** · `BLOQUEANTE` — A lista de composições de After Effects está especificada com parâmetros.
  **Teste:** cada composição traz nome, duração, o que anima, e os parâmetros de animação (in/out, easing, valores).
  **Falha se:** há composição citada sem parâmetro, ou a spec diz apenas "animar o logo".
  **N/A quando:** a peça não usa After Effects — e nesse caso a spec precisa declarar isso.

- [ ] **TR-FN-04** · `BLOQUEANTE` — Lower-third, legendas e motion graphics têm spec no padrão da marca.
  **Teste:** tipografia (família, peso, corpo), cor (hex do `brand-config`), posição, tempo em tela, animação.
  **Falha se:** algum desses cinco campos está ausente em qualquer elemento gráfico recorrente.

- [ ] **TR-FN-05** · `ATENÇÃO` — A spec define organização de bins e nomenclatura de importação no Premiere.
  **Teste:** existe mapa de bins (ex.: `01_FOOTAGE`, `02_AUDIO`, `03_GFX`, `04_SEQ`) e a regra de nome dos itens.
  **Falha se:** não existe. Projeto sem bins é projeto que ninguém reabre.

- [ ] **TR-FN-06** · `BLOQUEANTE` — O master saiu do Premiere e é o arquivo de referência da entrega.
  **Teste:** o manifesto aponta um único arquivo como master, e ele está em `master/`.
  **Falha se:** há mais de um candidato a master sem hierarquia declarada, ou o master é o render direto do app próprio quando a spec previa passagem por AE/Premiere.

- [ ] **TR-FN-07** · `BLOQUEANTE` — O preset de export por canal está declarado **antes** do export e foi cumprido.
  **Teste:** para cada canal, o manifesto declara formato, codec, bitrate, resolução, fps e safe area; conferir o arquivo entregue contra o declarado.
  **Falha se:** algum arquivo diverge do preset declarado, ou o preset não foi declarado.

- [ ] **TR-FN-08** · `ATENÇÃO` — Nenhuma etapa da cadeia foi pulada sem justificativa registrada.
  **Teste:** se a peça não passou por AE ou por Premiere, o manifesto diz por quê.
  **Falha se:** pulou etapa sem registro. (Pular é legítimo em peça simples; pular em silêncio não é.)

---

## Bloco 6 — Formato, codec e canal (FM)

- [ ] **TR-FM-01** · `BLOQUEANTE` — Resolução e proporção batem com o destino declarado.
  **Teste:** vertical 9:16 = 1080×1920; quadrado 1:1 = 1080×1080; retrato de feed 4:5 = 1080×1350; horizontal 16:9 = 1920×1080 (ou 3840×2160 quando o manifesto pedir 4K).
  **Falha se:** o arquivo está fora da resolução declarada, ou tem barras pretas embutidas para forçar a proporção.

- [ ] **TR-FM-02** · `BLOQUEANTE` — Codec e contêiner conforme o preset do canal.
  **Teste:** vídeo `H.264/AVC` em `.mp4` (salvo preset diferente declarado), áudio `AAC`, 48 kHz, estéreo.
  **Falha se:** contêiner ou codec divergem do declarado, ou o áudio está mono sem que o preset peça mono.

- [ ] **TR-FM-03** · `BLOQUEANTE` — Frame rate constante e igual ao declarado.
  **Teste:** verificar fps do arquivo; conferir que é CFR, não VFR.
  **Falha se:** o arquivo é VFR, ou o fps difere do preset (o mais comum: 29,97 quando o preset pede 30).

- [ ] **TR-FM-04** · `BLOQUEANTE` — Elementos essenciais estão fora da zona de interface da plataforma.
  **Teste:** em 9:16 (1080×1920), nenhum texto essencial, logo ou CTA dentro dos **250 px inferiores** nem dos **120 px superiores**; em TikTok, também fora dos **~120 px da faixa direita** de ações.
  **Falha se:** qualquer elemento essencial invade a faixa e ficaria coberto por legenda da plataforma, handle ou botões.

- [ ] **TR-FM-05** · `ATENÇÃO` — Loudness dentro da faixa de entrega.
  **Teste:** medir loudness integrado; alvo −14 LUFS (±1) para redes sociais, pico verdadeiro ≤ −1 dBTP.
  **Falha se:** fora da faixa, ou há clipping audível/medido.

- [ ] **TR-FM-06** · `ATENÇÃO` — Duração dentro do limite do canal e da meta do brief.
  **Teste:** comparar duração do arquivo com o limite do canal declarado e com a duração-alvo do brief.
  **Falha se:** ultrapassa o limite da plataforma, ou desvia mais de 15% da duração-alvo sem registro.

- [ ] **TR-FM-07** · `BLOQUEANTE` — Todos os derivados por canal foram gerados, não só o master.
  **Teste:** a lista de destinos do manifesto tem um arquivo correspondente em `canais/`.
  **Falha se:** falta derivado de algum canal listado, ou o mesmo arquivo foi copiado para dois canais com presets diferentes.

---

## Bloco 7 — Legenda (LG)

- [ ] **TR-LG-01** · `BLOQUEANTE` — A legenda veio de transcrição do áudio final, não do roteiro.
  **Teste:** conferir 3 trechos aleatórios: a legenda reproduz o que foi **falado**, incluindo desvios do roteiro.
  **Falha se:** a legenda repete o roteiro onde a fala divergiu.

- [ ] **TR-LG-02** · `BLOQUEANTE` — Sincronia dentro da tolerância.
  **Teste:** em 5 pontos distribuídos, o cue entra no máximo 200 ms antes e sai no máximo 300 ms depois da fala correspondente.
  **Falha se:** algum ponto estoura a tolerância, ou a legenda "adianta" a piada/revelação.

- [ ] **TR-LG-03** · `BLOQUEANTE` — Nenhum erro de transcrição de palavra-chave.
  **Teste:** conferir nome de marca, produto, ferramenta e número. Zero erro nessa classe.
  **Falha se:** há qualquer erro em palavra-chave (erro em palavra comum vira ATENÇÃO, não bloqueio).

- [ ] **TR-LG-04** · `ATENÇÃO` — Ritmo de leitura confortável.
  **Teste:** ≤ 20 caracteres por segundo; 1 a 2 linhas por cue.
  **Falha se:** há cue acima de 20 cps ou com 3+ linhas.

- [ ] **TR-LG-05** · `ATENÇÃO` — Estilo de legenda on-brand e legível sobre o fundo.
  **Teste:** fonte, cor e contorno conforme `brand-config`; contraste suficiente nos trechos de fundo claro.
  **Falha se:** a legenda muda de estilo no meio da peça, ou some sobre fundo claro em algum trecho.

- [ ] **TR-LG-06** · `ATENÇÃO` — Arquivo de legenda separado entregue quando o canal aceita.
  **Teste:** existe `.srt` (ou `.vtt`) em `canais/` para os destinos que suportam legenda fechada.
  **Falha se:** só há legenda queimada em canal que aceita closed caption.

---

## Bloco 8 — Arquivo-fonte e arquivamento (AR)

- [ ] **TR-AR-01** · `BLOQUEANTE` — Os projetos-fonte foram arquivados junto da entrega.
  **Teste:** existem, em `fontes/`, o projeto do Premiere, os projetos de AE usados e o estado do `video-studio` (o `video-brief`/config que gerou a timeline).
  **Falha se:** falta qualquer projeto-fonte usado na cadeia.

- [ ] **TR-AR-02** · `BLOQUEANTE` — Os assets brutos aprovados estão arquivados.
  **Teste:** cada asset referenciado no master existe em `fontes/assets/` no formato original de entrega do operador.
  **Falha se:** o master referencia asset que só existe no computador de alguém.

- [ ] **TR-AR-03** · `ATENÇÃO` — Os arquivos de rastreabilidade e os cards humanos foram arquivados.
  **Teste:** `rastreabilidade.yaml`, `_direction/{asset-id}.yaml` e `cards/` presentes no arquivamento.
  **Falha se:** o job foi entregue e a memória de como ele foi feito ficou fora do pacote.

- [ ] **TR-AR-04** · `ATENÇÃO` — Fontes tipográficas e licenças acompanham o arquivamento.
  **Teste:** as famílias usadas estão listadas com origem/licença.
  **Falha se:** o projeto reabre com fonte faltando e ninguém sabe qual era.

---

## Bloco 9 — Manifesto de entrega (MF)

- [ ] **TR-MF-01** · `BLOQUEANTE` — O manifesto lista **todos** os arquivos entregues e só eles.
  **Teste:** diff entre a lista do manifesto e o conteúdo real de `entrega/`.
  **Falha se:** há arquivo entregue fora do manifesto, ou manifesto apontando arquivo inexistente.

- [ ] **TR-MF-02** · `BLOQUEANTE` — Cada arquivo tem destino, formato e versão declarados.
  **Teste:** ler linha a linha da tabela de arquivos.
  **Falha se:** alguma linha tem campo obrigatório vazio.

- [ ] **TR-MF-03** · `BLOQUEANTE` — O bloco de direitos do manifesto está completo.
  **Teste:** para cada asset de terceiro, consta licença, escopo e validade.
  **Falha se:** há asset de terceiro sem linha de direito.

- [ ] **TR-MF-04** · `ATENÇÃO` — Claims com prazo de validade estão sinalizados.
  **Teste:** claims temporais (versão de modelo, "lançado esta semana", preço) têm data de checagem e data de revisão.
  **Falha se:** existe claim temporal sem validade — a peça apodrece sem aviso.

- [ ] **TR-MF-05** · `ATENÇÃO` — Ressalvas de `CONCERNS` e waivers estão anexados ao manifesto.
  **Teste:** se o veredito não foi PASS limpo, o manifesto carrega a lista de ressalvas/waivers com autor e prazo.
  **Falha se:** a peça saiu com dívida invisível para quem recebe.

---

## Evidência (preenchida pelo `@qa-critic`)

| Campo | Valor |
|:---|:---|
| Job / pipeline / cliente | |
| Laudo de fact-check (caminho + veredito) | |
| Gate automático de vídeo (V1–V7) | |
| Assets gerados por humano (qtd) | |
| Pacotes de Direção auditados (qtd) | |
| Assets sem rastreabilidade | |
| Bloqueantes reprovados | |
| Atenções reprovadas | |
| Itens N/A (com justificativa) | |

## Veredito transversal

- **Resultado:** `PASS` · `CONCERNS` · `FAIL` · `WAIVED`
- **Regra:** qualquer `BLOQUEANTE` reprovado → **FAIL**. Qualquer `ATENÇÃO` reprovada, com todos os bloqueantes aprovados → **CONCERNS**. `BLOQUEANTE NON-WAIVABLE` reprovado → **FAIL** sem possibilidade de waiver.
- **Próximo passo:** `delivery` (PASS/CONCERNS com ciência registrada) · devolução ao estágio de origem (FAIL).

## Backlog de checklist

> Critérios que faltaram e entram para a **próxima** peça. Não reprovam a peça atual.
