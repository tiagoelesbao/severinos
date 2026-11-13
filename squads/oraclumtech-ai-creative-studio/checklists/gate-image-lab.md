# Gate de Gênero — Image Lab (`image-lab` · P6)

> **Gênero:** imagem pura — thumbnail, imagem publicitária de produto, key art, capa de
> episódio, carrossel. Serviço comercializável isolado **e** sub-rotina transversal dos P1–P5.
> **Executor:** `@qa-critic` · **Pré-requisito:** laudo `CLEAR` do `@fact-checker`.
> **Roda junto com:** `gate-transversal-entrega.md` (base comum — não repetida aqui).
> **Dimensões críticas da rubrica:** D2 execução · D4 marca · D6 consistência de série.

---

## Como ler

`BLOQUEANTE` = reprovou, **FAIL**. `BLOQUEANTE NON-WAIVABLE` = nem o `@studio-chief` derruba.
`ATENÇÃO` = reprovou, **CONCERNS**. Todo item tem **Teste** e **Falha se**.

**Este gate avalia duas coisas separadas:**
- **Bloco A** — a qualidade do **Pacote de Direção** entregue ao operador humano.
  Pacote vago é FALHA **mesmo que a imagem tenha saído boa** — aqui o pacote é praticamente
  o produto do agente, já que a geração é 100% humana (§3.1).
- **Blocos B a G** — a qualidade da imagem **devolvida** e do pacote de arquivos.

> **Nota de finalização.** Este pipeline usa `apps/creative-design` e **não passa por
> After Effects nem Premiere**. Os itens de cadeia de vídeo do gate transversal
> (`TR-FN-03` a `TR-FN-06`) são marcados **N/A com justificativa**.

---

## Bloco A — Pacote de Direção específico de imagem (IL-PD)

- [ ] **IL-PD-01** · `BLOQUEANTE` — Cada peça pedida tem um `asset_direction` com `destino` explícito.
  **Teste:** o `destino` nomeia o uso final (thumb do vídeo X, capa do ep Y, anúncio 4:5 para Meta, slide 3 do carrossel).
  **Falha se:** o destino é genérico ("imagem para redes"), o que impede julgar resolução, crop e legibilidade.

- [ ] **IL-PD-02** · `BLOQUEANTE` — `parametros` traz aspect e resolução-alvo do destino, não do gerador.
  **Teste:** a resolução declarada é igual ou maior que a exigida pelo destino final.
  **Falha se:** o pacote pede a resolução padrão da ferramenta sem conferir o destino.

- [ ] **IL-PD-03** · `BLOQUEANTE` — O prompt descreve composição, não só conteúdo.
  **Teste:** o prompt define enquadramento, ponto focal, hierarquia, espaço negativo reservado para texto (quando houver texto).
  **Falha se:** o prompt lista apenas os elementos ("um notebook, uma pessoa, um gráfico") sem dizer como se organizam.

- [ ] **IL-PD-04** · `BLOQUEANTE` — Texto que precisa ser legível **não** é pedido ao gerador de imagem.
  **Teste:** o pacote instrui a gerar a base sem texto e a compor a tipografia depois em `apps/creative-design` (ou editor), com a fonte da marca.
  **Falha se:** o pacote pede ao modelo que escreva a headline dentro da imagem — é a fonte nº 1 de texto alucinado.

- [ ] **IL-PD-05** · `BLOQUEANTE` — Produto real tem âncora de fidelidade no pacote.
  **Teste:** existe imagem de referência declarada, com ângulo, cor e rótulo; o `criterio_de_aceite` inclui correspondência com o produto real.
  **Falha se:** o produto é gerado livremente pelo modelo.

- [ ] **IL-PD-06** · `BLOQUEANTE` — Peças de série declaram a âncora de consistência.
  **Teste:** carrossel, série de capas ou conjunto de thumbs declaram seed/referência/estilo comum.
  **Falha se:** cada peça da série foi dirigida isoladamente.

- [ ] **IL-PD-07** · `BLOQUEANTE` — `armadilhas_conhecidas` cobre as falhas típicas de imagem gerada.
  **Teste:** os pacotes mencionam, quando aplicável: mãos e dedos, texto em placas/telas, simetria de rosto, logo alucinado, reflexo incoerente.
  **Falha se:** nenhum pacote antecipa nenhuma delas em peça com pessoa, marca ou superfície reflexiva.

- [ ] **IL-PD-08** · `ATENÇÃO` — `pos_processamento` define upscale e tratamento.
  **Teste:** o campo declara o fator de upscale e o tratamento (grade, nitidez, limpeza) ou `nenhum`.
  **Falha se:** o campo está ausente numa peça que precisa chegar a alta resolução.

- [ ] **IL-PD-09** · `ATENÇÃO` — `quantas_variacoes` ≥ 3 para peça de destaque.
  **Teste:** ler o campo em key art, thumb e anúncio.
  **Falha se:** peça de destaque foi dirigida com 1 variação.

---

## Bloco B — Resolução e formato por destino (IL-RF)

- [ ] **IL-RF-01** · `BLOQUEANTE` — Cada arquivo bate com a resolução e a proporção do seu destino.
  **Teste:** conferir por destino — feed 1:1 = 1080×1080; feed retrato 4:5 = 1080×1350; stories/reels 9:16 = 1080×1920; thumb YouTube 16:9 = 1280×720 mínimo (1920×1080 recomendado); capa de episódio conforme o manifesto.
  **Falha se:** algum arquivo está abaixo do mínimo do destino, ou com proporção diferente da declarada.

- [ ] **IL-RF-02** · `BLOQUEANTE` — Nenhuma imagem foi ampliada além da resolução nativa sem upscale.
  **Teste:** comparar a resolução nativa da geração com a resolução entregue.
  **Falha se:** houve ampliação por interpolação simples — a peça chega borrada no destino.

- [ ] **IL-RF-03** · `BLOQUEANTE` — Formato de arquivo adequado ao uso.
  **Teste:** `PNG` para peça com transparência ou texto fino; `JPG` de alta qualidade para foto/publicitária; nada de `WEBP` quando o destino não suporta.
  **Falha se:** o formato compromete a qualidade do destino, ou o destino não aceita o formato.

- [ ] **IL-RF-04** · `BLOQUEANTE` — Sem artefato de compressão visível.
  **Teste:** inspecionar bordas de texto, gradientes e áreas de cor chapada em 100% de zoom.
  **Falha se:** há blocagem, banding ou halo perceptível.

- [ ] **IL-RF-05** · `ATENÇÃO` — Perfil de cor correto para o destino.
  **Teste:** sRGB para digital; conferir que a peça não foi exportada em CMYK ou com perfil exótico.
  **Falha se:** o perfil está errado — as cores mudam no destino.

- [ ] **IL-RF-06** · `ATENÇÃO` — Peso do arquivo dentro do limite do destino.
  **Teste:** comparar com o limite da plataforma declarado no manifesto.
  **Falha se:** ultrapassa e será recomprimido pela plataforma.

- [ ] **IL-RF-07** · `ATENÇÃO` — Crops derivados entregues para todos os formatos pedidos.
  **Teste:** conferir a lista de destinos do manifesto contra os arquivos.
  **Falha se:** falta crop, ou o crop foi feito automaticamente cortando o ponto focal.

---

## Bloco C — Consistência de marca (IL-MB)

- [ ] **IL-MB-01** · `BLOQUEANTE` — Paleta conforme o `brand-config` do cliente.
  **Teste:** amostrar as cores dominantes e comparar com a paleta oficial.
  **Falha se:** a peça usa cor fora da paleta em elemento de marca, ou o accent não é o oficial.

- [ ] **IL-MB-02** · `BLOQUEANTE` — Tipografia oficial, na hierarquia definida.
  **Teste:** conferir família, peso e tamanhos relativos contra o `brand-config`.
  **Falha se:** usou fonte substituta, ou a hierarquia (título/apoio/legal) não se distingue.

- [ ] **IL-MB-03** · `BLOQUEANTE` — Logo na versão correta, sem deformação, com área de respiro.
  **Teste:** comparar proporção com o original; medir o respiro mínimo especificado; conferir versão (positiva/negativa) contra o fundo.
  **Falha se:** o logo foi esticado, recolorido, aplicado com respiro insuficiente ou sobre fundo de contraste inadequado.

- [ ] **IL-MB-04** · `BLOQUEANTE` — Peças de série compartilham sistema visual.
  **Teste:** dispor as peças lado a lado; identificar o que se repete (grid, posição do texto, tratamento, paleta).
  **Falha se:** as peças não parecem do mesmo conjunto.

- [ ] **IL-MB-05** · `ATENÇÃO` — O tratamento de imagem segue o padrão do cliente.
  **Teste:** comparar contraste, saturação e grão com peças anteriores aprovadas.
  **Falha se:** destoa sem partido declarado no brief.

- [ ] **IL-MB-06** · `ATENÇÃO` — A peça respeita as restrições visuais do brand-identity.
  **Teste:** para a Oraclum, varrer por robô humanoide, aperto de mão homem-máquina, cérebro digital e demais clichês de `restricoes.nunca_fazer`.
  **Falha se:** encontrar qualquer um.

---

## Bloco D — Anatomia e artefato de IA (IL-AN)

- [ ] **IL-AN-01** · `BLOQUEANTE` — Mãos e dedos corretos em qualquer plano onde apareçam.
  **Teste:** contar dedos e conferir articulação em cada mão visível.
  **Falha se:** há dedo a mais/a menos, fusão, dobra impossível ou mão em escala errada.

- [ ] **IL-AN-02** · `BLOQUEANTE` — Rosto sem deformação em plano onde é reconhecível.
  **Teste:** conferir simetria de olhos, alinhamento de pupilas, dentes, orelhas e óculos.
  **Falha se:** há assimetria perceptível em exibição normal.

- [ ] **IL-AN-03** · `BLOQUEANTE` — Objetos com geometria coerente.
  **Teste:** conferir continuidade de linhas retas, perspectiva, número de pernas de móveis, encaixe de peças.
  **Falha se:** há objeto derretido, linha que se dobra sem motivo ou perspectiva impossível.

- [ ] **IL-AN-04** · `BLOQUEANTE` — Luz, sombra e reflexo coerentes entre si.
  **Teste:** identificar a direção da luz principal e conferir se as sombras e reflexos correspondem.
  **Falha se:** há sombra em direção contraditória, ou reflexo mostrando algo que não existe na cena.

- [ ] **IL-AN-05** · `BLOQUEANTE` — Nenhum logo, marca ou texto alucinado no cenário.
  **Teste:** varrer o fundo por logos inventados, marcas parcialmente formadas e letreiros ilegíveis.
  **Falha se:** encontrar qualquer um — além do defeito visual, é risco de marca de terceiro.

- [ ] **IL-AN-06** · `ATENÇÃO` — Pele e materiais sem aparência plástica.
  **Teste:** inspecionar textura de pele, tecido e superfícies em 100%.
  **Falha se:** a textura é uniforme demais a ponto de denunciar a geração num contexto que pede realismo.

- [ ] **IL-AN-07** · `ATENÇÃO` — Bordas limpas em composição.
  **Teste:** inspecionar o recorte entre elementos compostos.
  **Falha se:** há halo, franja de cor ou serrilhado visível.

---

## Bloco E — Legibilidade de texto na imagem (IL-TX)

- [ ] **IL-TX-01** · `BLOQUEANTE` — Todo texto visível foi composto na edição, não gerado pelo modelo.
  **Teste:** conferir a rastreabilidade: o texto entrou em `apps/creative-design` (ou editor) com a fonte da marca.
  **Falha se:** há texto gerado pelo modelo, mesmo que por acaso tenha saído legível — não é reproduzível nem está na tipografia oficial.

- [ ] **IL-TX-02** · `BLOQUEANTE` — Zero erro de ortografia e de acentuação.
  **Teste:** revisar cada palavra, incluindo acentos e nomes próprios.
  **Falha se:** há qualquer erro. Texto em peça publicitária não tem margem.

- [ ] **IL-TX-03** · `BLOQUEANTE` — Texto legível no tamanho real de exibição.
  **Teste:** visualizar a peça no tamanho em que aparece no destino (miniatura, feed no celular); ler sem esforço.
  **Falha se:** é preciso ampliar para ler o texto principal.

- [ ] **IL-TX-04** · `BLOQUEANTE` — Contraste suficiente entre texto e fundo.
  **Teste:** conferir o texto sobre a região mais clara e a mais escura que ele cobre.
  **Falha se:** o texto some em alguma parte, ou depende de sombra pesada para existir.

- [ ] **IL-TX-05** · `BLOQUEANTE` — Nenhum texto essencial fora da área segura do destino.
  **Teste:** aplicar as margens do destino (stories: 250 px inferiores e 120 px superiores em 1080×1920; feed: margem de corte de preview).
  **Falha se:** texto essencial cai na faixa cortada ou coberta.

- [ ] **IL-TX-06** · `ATENÇÃO` — Quantidade de texto adequada ao formato.
  **Teste:** thumb ≤ 5 palavras; slide de carrossel com uma ideia por slide.
  **Falha se:** o texto excede e compete com a imagem.

- [ ] **IL-TX-07** · `ATENÇÃO` — Alinhamento e espaçamento consistentes na série.
  **Teste:** sobrepor as peças da série e conferir a posição dos blocos de texto.
  **Falha se:** a posição varia sem intenção.

---

## Bloco F — Direitos de produto e de terceiro (IL-DR)

- [ ] **IL-DR-01** · `BLOQUEANTE NON-WAIVABLE` — O produto retratado corresponde ao produto real.
  **Teste:** comparar formato, cor, rótulo, proporção e material com a referência oficial.
  **Falha se:** a IA alterou característica material do produto — é publicidade enganosa, não licença estética.

- [ ] **IL-DR-02** · `BLOQUEANTE NON-WAIVABLE` — Nenhuma marca de terceiro aparece sem base.
  **Teste:** varrer por logo, embalagem de concorrente, interface de software de terceiro.
  **Falha se:** encontrar sem uso nominativo justificado, licença, ou remoção.

- [ ] **IL-DR-03** · `BLOQUEANTE NON-WAIVABLE` — Nenhuma pessoa real identificável sem autorização.
  **Teste:** conferir se algum rosto gerado guarda semelhança com pessoa conhecida; conferir cessão para rostos reais.
  **Falha se:** há semelhança acidental com pessoa pública, ou rosto real sem termo.

- [ ] **IL-DR-04** · `BLOQUEANTE` — Assets de banco dentro da licença.
  **Teste:** conferir escopo (uso comercial, território, prazo) de cada asset licenciado usado na composição.
  **Falha se:** há asset fora do escopo, ou sem comprovante nominal.

- [ ] **IL-DR-05** · `BLOQUEANTE` — Disclosure quando a imagem altera característica material do produto.
  **Teste:** aplicar o caso AID-4 do `@fact-checker`.
  **Falha se:** houve alteração e não há declaração de imagem ilustrativa.

- [ ] **IL-DR-06** · `ATENÇÃO` — Fontes tipográficas licenciadas para o uso.
  **Teste:** conferir a licença das famílias usadas (uso comercial, incorporação).
  **Falha se:** a fonte foi baixada sem licença compatível.

---

## Bloco G — Asset devolvido e pacote de arquivos (IL-AS)

- [ ] **IL-AS-01** · `BLOQUEANTE` — Toda peça passou nos critérios de aceite do seu pacote.
  **Teste:** marcar sim/não por critério.
  **Falha se:** peça reprovada foi entregue sem waiver registrado.

- [ ] **IL-AS-02** · `BLOQUEANTE` — Nenhuma marca d'água de ferramenta ou de banco.
  **Teste:** inspecionar bordas, cantos e áreas de baixa densidade.
  **Falha se:** encontrar.

- [ ] **IL-AS-03** · `BLOQUEANTE` — O arquivo editável foi arquivado junto da imagem final.
  **Teste:** existe o projeto de composição (com as camadas de texto) em `fontes/`.
  **Falha se:** só existe o achatado — a próxima versão vai ser refeita do zero.

- [ ] **IL-AS-04** · `ATENÇÃO` — As variações não escolhidas foram registradas com o motivo.
  **Teste:** conferir o registro de descarte por `asset_id`.
  **Falha se:** não há registro.

- [ ] **IL-AS-05** · `ATENÇÃO` — A peça aprovada virou referência para a série.
  **Teste:** o still/composição aprovado foi arquivado como âncora das próximas peças do conjunto.
  **Falha se:** não foi.

---

## Evidência (preenchida pelo `@qa-critic`)

| Campo | Valor |
|:---|:---|
| Job / cliente / peças entregues | |
| Destinos e resoluções | |
| Âncora de consistência da série | |
| Texto composto em edição? | sim · não |
| Bloqueantes reprovados (IDs) | |
| Atenções reprovadas (IDs) | |
| Itens N/A do transversal (cadeia de vídeo) | TR-FN-03..06 |
| Rubrica D2 / D4 / D6 | |
| Gate transversal | PASS · CONCERNS · FAIL |

## Veredito do gênero

- **Resultado:** `PASS` · `CONCERNS` · `FAIL` · `WAIVED`
- **Regra:** qualquer `BLOQUEANTE` reprovado → FAIL. Só `ATENÇÃO` reprovada → CONCERNS.
  Itens `NON-WAIVABLE` do Bloco F não aceitam waiver em nenhuma hipótese.
- **Entrega exige:** este gate **e** `gate-transversal-entrega.md` aprovados.
