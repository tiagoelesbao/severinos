# Gate de Gênero — Oraclum Institucional (`oraclum-institucional` · P4)

> **Gênero:** institucional cinemático dor → solução, da **própria Oraclum**.
> **Objetivo:** autoridade e venda dos serviços da casa.
> **Executor:** `@qa-critic` · **Pré-requisito:** laudo `CLEAR` do `@fact-checker`.
> **Roda junto com:** `gate-transversal-entrega.md` (base comum — não repetida aqui).
> **Dimensões críticas da rubrica:** D1 conceito · D4 marca · D5 clareza de ação.
> **Fonte normativa da marca:** `squads/virals-marketing-squad/data/clients/oraclum/brand-identity.yaml` v2.1
> e `brand-config.yaml` (identidade visual).

---

## Como ler

`BLOQUEANTE` = reprovou, **FAIL**. `BLOQUEANTE NON-WAIVABLE` = nem o `@studio-chief` derruba.
`ATENÇÃO` = reprovou, **CONCERNS**. Todo item tem **Teste** e **Falha se**.

**Este gate avalia duas coisas separadas:**
- **Bloco A** — a qualidade do **Pacote de Direção** entregue ao operador humano.
  Pacote vago é FALHA **mesmo que o asset tenha saído bom por sorte**.
- **Blocos B a G** — a qualidade do que o humano **devolveu** e da peça montada.

> **Risco central deste gênero.** É a peça em que a tentação de inventar prova é máxima:
> um depoimento fecha melhor um institucional do que uma gravação de tela. A Oraclum
> **não tem case de cliente** — a prova é o sistema rodando. O Bloco C é integralmente
> NON-WAIVABLE e existe por causa disso.

---

## Bloco A — Pacote de Direção específico do institucional (OI-PD)

- [ ] **OI-PD-01** · `BLOQUEANTE` — Todo `asset_direction` cita o plano do storyboard que serve.
  **Teste:** `destino` aponta um plano existente em `storyboard.yaml`.
  **Falha se:** há pacote órfão ou plano sem pacote.

- [ ] **OI-PD-02** · `BLOQUEANTE` — Os planos de **prova** são captura real, não geração.
  **Teste:** todo plano que mostra sistema, painel, log, agente ou automação em funcionamento está marcado como `captura_real` na decupagem, e o pacote correspondente instrui a **gravar a tela**, não a gerar a imagem.
  **Falha se:** um plano de prova foi dirigido como asset generativo.
  **Por quê:** recriar um painel para "ficar bonito" transforma prova em fabricação.

- [ ] **OI-PD-03** · `BLOQUEANTE` — Os planos de **dor** têm direção que evita clichê corporativo.
  **Teste:** o prompt descreve situação concreta e específica; o campo `armadilhas_conhecidas` ou o prompt negativo bloqueia explicitamente os clichês proibidos pelo brand-identity.
  **Falha se:** o prompt pede genéricos de banco de imagem ("profissional frustrado no escritório").

- [ ] **OI-PD-04** · `BLOQUEANTE` — Nenhum pacote pede robô humanoide, aperto de mão homem-máquina ou IA como magia.
  **Teste:** varrer todos os prompts.
  **Falha se:** encontrar qualquer um — é violação direta de `restricoes.nunca_fazer`.

- [ ] **OI-PD-05** · `BLOQUEANTE` — O pacote traduz o look em parâmetro fotográfico.
  **Teste:** o prompt carrega lente/distância focal equivalente, qualidade e direção de luz, paleta com referência de cor do `brand-config`.
  **Falha se:** o prompt usa só rótulos ("cinematográfico", "tech", "premium").

- [ ] **OI-PD-06** · `BLOQUEANTE` — O pacote de VO dirige a voz do Sábio, não a do vendedor.
  **Teste:** a direção de interpretação pede clareza, ritmo explicativo e sobriedade; proíbe entonação de anúncio e urgência artificial.
  **Falha se:** ausente, ou pede "voz envolvente e persuasiva".

- [ ] **OI-PD-07** · `ATENÇÃO` — Ordem de geração declarada, com plano-âncora de look.
  **Teste:** o lote indica qual plano gerar primeiro.
  **Falha se:** ausente.

- [ ] **OI-PD-08** · `ATENÇÃO` — `armadilhas_conhecidas` cobre texto alucinado em telas.
  **Teste:** peças com interface, código ou painel no frame antecipam o problema.
  **Falha se:** não antecipam — texto inventado numa tela é o defeito mais visível deste gênero.

---

## Bloco B — Arco dor → solução (OI-AR)

- [ ] **OI-AR-01** · `BLOQUEANTE` — A dor é reconhecível pelo avatar do brief.
  **Teste:** apontar a dor mostrada e cruzar com `avatar.dores` ou `frustracoes` do brand-identity (ex.: lead que morre no atendimento, custo de equipe, decisão de mídia no escuro).
  **Falha se:** a dor é genérica de mercado e não está na lista do avatar.

- [ ] **OI-AR-02** · `BLOQUEANTE` — A dor aparece antes da solução.
  **Teste:** marcar os timecodes.
  **Falha se:** a peça abre vendendo o serviço — sem tensão, o institucional vira folheto.

- [ ] **OI-AR-03** · `BLOQUEANTE` — A solução mostrada é um serviço real do `portfolio_servicos`.
  **Teste:** identificar qual serviço a peça apresenta e cruzar com os cinco: Oraclum X, AI Gen, AI Dev, Sales, Ops.
  **Falha se:** a peça promete capacidade que não está no portfólio.

- [ ] **OI-AR-04** · `BLOQUEANTE` — A peça mostra o **mecanismo**, não só o resultado.
  **Teste:** existe pelo menos um trecho que mostra como funciona (agente rodando, fluxo, automação executando).
  **Falha se:** a peça só afirma benefícios sobre imagens bonitas.

- [ ] **OI-AR-05** · `ATENÇÃO` — Uma dor por peça.
  **Teste:** contar as dores abordadas.
  **Falha se:** a peça tenta cobrir três dores e não aprofunda nenhuma.

- [ ] **OI-AR-06** · `ATENÇÃO` — A transição dor → solução é motivada.
  **Teste:** há um ponto de virada identificável, não um corte seco de "problema" para "contrate".
  **Falha se:** a virada é apenas a entrada do logo.

---

## Bloco C — Zero case fabricado (OI-CF)

> Bloco integralmente **NON-WAIVABLE**. Nenhuma decisão de prazo, cliente ou chief derruba
> qualquer item aqui.

- [ ] **OI-CF-01** · `BLOQUEANTE NON-WAIVABLE` — Nenhum depoimento de cliente.
  **Teste:** varrer imagem, locução, texto em tela e caption por relato atribuído a cliente, mesmo anônimo ("um cliente nosso disse que...").
  **Falha se:** encontrar qualquer um.

- [ ] **OI-CF-02** · `BLOQUEANTE NON-WAIVABLE` — Nenhum número de resultado de cliente.
  **Teste:** cruzar com a tabela de claims do laudo; qualquer C-RES em peça da Oraclum é fabricação.
  **Falha se:** sobrou percentual, multiplicador, prazo ou faturamento atribuído a cliente.

- [ ] **OI-CF-03** · `BLOQUEANTE NON-WAIVABLE` — Nenhum painel, dashboard ou gráfico recriado.
  **Teste:** para cada tela de dado exibida, a rastreabilidade prova que é captura real; conferir se não é composição feita para ilustrar.
  **Falha se:** há tela recriada em ferramenta de design ou gerada por IA apresentada como dado real.

- [ ] **OI-CF-04** · `BLOQUEANTE NON-WAIVABLE` — Nenhum logo de cliente ou "wall of clients".
  **Teste:** varrer os frames por logos de terceiros exibidos como carteira.
  **Falha se:** encontrar — a Oraclum não tem carteira divulgável, e logo de terceiro sem contrato é violação D-MAR.

- [ ] **OI-CF-05** · `BLOQUEANTE NON-WAIVABLE` — Nenhuma contagem de clientes atendidos sem lista verificável.
  **Teste:** varrer por "+50 negócios", "centenas de clientes", "dezenas de projetos".
  **Falha se:** encontrar sem lista verificável anexada ao laudo.

- [ ] **OI-CF-06** · `BLOQUEANTE NON-WAIVABLE` — A expressão "case de cliente" não aparece.
  **Teste:** varrer roteiro, texto em tela e caption.
  **Falha se:** aparece — está em `lexico.nunca_usar` até existir um case real.

- [ ] **OI-CF-07** · `BLOQUEANTE` — Cenário hipotético, quando usado, está declarado como hipotético **na peça**.
  **Teste:** o rótulo é visível em tela ou dito na locução — não em nota de rodapé ilegível.
  **Falha se:** o hipotético pode ser lido como real.

---

## Bloco D — Prova pelo sistema rodando (OI-PS)

- [ ] **OI-PS-01** · `BLOQUEANTE` — A peça mostra pelo menos uma evidência real do sistema.
  **Teste:** identificar o trecho: gravação de tela do pipeline, agente executando, log com timestamp, automação em funcionamento, artefato público do cofre.
  **Falha se:** não há nenhuma — a peça afirma autoridade sem exibi-la, que é exatamente o que o brand-identity proíbe.

- [ ] **OI-PS-02** · `BLOQUEANTE` — A evidência é legível no formato de entrega.
  **Teste:** visualizar no destino final; o que está na tela precisa ser compreensível (com zoom, destaque ou anotação quando necessário).
  **Falha se:** a prova aparece como borrão decorativo — prova ilegível não prova nada.

- [ ] **OI-PS-03** · `BLOQUEANTE` — A evidência corresponde ao que a locução afirma naquele momento.
  **Teste:** cruzar o trecho falado com a tela mostrada.
  **Falha se:** a locução fala de uma capacidade e a tela mostra outra coisa.

- [ ] **OI-PS-04** · `BLOQUEANTE` — Dados sensíveis mascarados na captura.
  **Teste:** varrer as capturas por nome de cliente, e-mail, telefone, token, chave de API e URL interna.
  **Falha se:** encontrar qualquer um sem máscara.

- [ ] **OI-PS-05** · `ATENÇÃO` — A prova aparece antes do CTA.
  **Teste:** comparar os timecodes.
  **Falha se:** o CTA vem antes de qualquer evidência.

- [ ] **OI-PS-06** · `ATENÇÃO` — Limitação reconhecida quando a peça apresenta uma ferramenta.
  **Teste:** conferir `restricoes.nunca_fazer` — "omitir falhas, taxas de erro ou limitações das ferramentas apresentadas".
  **Falha se:** a peça apresenta a ferramenta como infalível.

---

## Bloco E — Arquétipo e voz (OI-AQ)

- [ ] **OI-AQ-01** · `BLOQUEANTE` — Nenhuma palavra do léxico proibido.
  **Teste:** varrer roteiro, texto em tela e caption contra `lexico.nunca_usar` — "fórmula mágica", "fique rico fácil", "segredo infalível", "revolução milagrosa", "trabalho duro sem inteligência", "case de cliente".
  **Falha se:** encontrar qualquer uma.

- [ ] **OI-AQ-02** · `BLOQUEANTE` — A peça não se apoia em escassez, medo ou hype.
  **Teste:** varrer por contagem regressiva, "últimas vagas", ameaça de obsolescência sem contrapartida prática, promessa de transformação sem mecanismo.
  **Falha se:** encontrar — está fora do arquétipo do Sábio.

- [ ] **OI-AQ-03** · `BLOQUEANTE` — O tom é de conhecimento e clareza (Sábio) com construção (Criador).
  **Teste:** ler a transcrição; a peça explica e demonstra, em vez de convencer por adjetivo.
  **Falha se:** o texto é uma sequência de superlativos sem informação.

- [ ] **OI-AQ-04** · `BLOQUEANTE` — Identidade visual conforme o `brand-config`.
  **Teste:** paleta, tipografia, versão do logo, área de respiro.
  **Falha se:** há divergência não justificada.

- [ ] **OI-AQ-05** · `ATENÇÃO` — Léxico próprio presente.
  **Teste:** a peça usa os termos da casa — automação, agente, IA aplicada, workflow, escala, aquisição, conversão, dado.
  **Falha se:** a peça poderia ser de qualquer agência genérica.

- [ ] **OI-AQ-06** · `ATENÇÃO` — Termos técnicos explicados de forma simples.
  **Teste:** cada termo de indústria (agente, LLM, RAG, API) vem com tradução prática quando aparece.
  **Falha se:** a peça empilha jargão sem traduzir — contradiz "descomplica conceitos difíceis".

- [ ] **OI-AQ-07** · `ATENÇÃO` — Um único CTA, alinhado ao objetivo do brief.
  **Teste:** contar as ações pedidas; conferir contra a lista de CTA proibido.
  **Falha se:** há mais de uma ação, ou o CTA está na lista proibida.

---

## Bloco F — Execução cinemática e ritmo (OI-EX)

- [ ] **OI-EX-01** · `BLOQUEANTE` — Coerência de look entre planos.
  **Teste:** amostrar 1 frame por plano; comparar paleta, direção de luz e tratamento com o look-book.
  **Falha se:** dá para apontar em qual plano "mudou o filtro" ou a luz inverteu sem motivo.

- [ ] **OI-EX-02** · `BLOQUEANTE` — Zero artefato de IA em plano de destaque.
  **Teste:** revisar os planos de close e os que ficam mais de 1,5 s em tela — mãos, rostos, texto em telas, geometria.
  **Falha se:** há artefato perceptível em exibição normal.

- [ ] **OI-EX-03** · `BLOQUEANTE` — Cortes limpos.
  **Teste:** revisar cada ponto de corte: frame duplicado, flash preto, corte no meio de sílaba.
  **Falha se:** existe qualquer um.

- [ ] **OI-EX-04** · `BLOQUEANTE` — Locução inteligível sobre a trilha, com ducking.
  **Teste:** ouvir em fone e em alto-falante de celular.
  **Falha se:** alguma palavra exige legenda, ou a trilha cobre a VO em algum trecho.

- [ ] **OI-EX-05** · `BLOQUEANTE` — Assinatura de marca presente e legível.
  **Teste:** o logo permanece ao menos 1,0 s (peça até 30 s) ou 1,5 s (peça mais longa), na versão correta e com respiro conforme o `brand-config`.
  **Falha se:** menos que isso, distorcido, ou sobre fundo de contraste insuficiente.

- [ ] **OI-EX-06** · `ATENÇÃO` — Nenhum bloco morto.
  **Teste:** identificar trechos sem evento novo acima de 2× a duração média de plano.
  **Falha se:** existe algum.

- [ ] **OI-EX-07** · `ATENÇÃO` — Sound design além da trilha.
  **Teste:** listar SFX e ambiência; cada SFX ancorado num evento de imagem (±100 ms).
  **Falha se:** só há música colada por cima, ou há SFX sem evento.

---

## Bloco G — Asset devolvido pelo humano (OI-AS)

- [ ] **OI-AS-01** · `BLOQUEANTE` — Todo asset passou nos critérios de aceite do seu pacote.
  **Teste:** marcar sim/não por critério, asset por asset.
  **Falha se:** asset reprovado entrou no master sem waiver registrado.

- [ ] **OI-AS-02** · `BLOQUEANTE` — Capturas reais de sistema não foram substituídas por geração.
  **Teste:** conferir a rastreabilidade dos planos de prova — a origem precisa ser gravação de tela.
  **Falha se:** um plano marcado como `captura_real` na decupagem chegou como asset generativo.

- [ ] **OI-AS-03** · `BLOQUEANTE` — Nenhum logo, marca ou texto alucinado nos frames gerados.
  **Teste:** varrer o fundo de cada asset.
  **Falha se:** encontrar.

- [ ] **OI-AS-04** · `BLOQUEANTE` — Nenhuma marca d'água de ferramenta.
  **Teste:** inspecionar bordas e cantos.
  **Falha se:** encontrar.

- [ ] **OI-AS-05** · `ATENÇÃO` — Variações geradas conforme o pacote, com descartes registrados.
  **Teste:** contar por `asset_id` e conferir o motivo de cada descarte.
  **Falha se:** veio uma só, ou não há registro.

---

## Evidência (preenchida pelo `@qa-critic`)

| Campo | Valor |
|:---|:---|
| Job / duração / canal | |
| Dor abordada (e origem no avatar) | |
| Serviço do portfólio apresentado | |
| Evidência real do sistema (timecode) | |
| Bloco C — zero case fabricado | limpo · violado |
| Bloqueantes reprovados (IDs) | |
| Atenções reprovadas (IDs) | |
| Rubrica D1 / D4 / D5 | |
| Gate transversal | PASS · CONCERNS · FAIL |

## Veredito do gênero

- **Resultado:** `PASS` · `CONCERNS` · `FAIL` · `WAIVED`
- **Regra:** qualquer `BLOQUEANTE` reprovado → FAIL. Só `ATENÇÃO` reprovada → CONCERNS.
  O Bloco C é integralmente `NON-WAIVABLE`: nenhuma violação ali admite waiver, e o estado
  `WAIVED` não pode ser usado para liberar a peça.
- **Entrega exige:** este gate **e** `gate-transversal-entrega.md` aprovados.
