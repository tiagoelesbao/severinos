# Gate de Gênero — UGC Ads (`ugc-ads` · P2)

> **Gênero:** UGC / creator AI para conversão (Meta Ads, TikTok Ads). Alto volume, ciclo curto.
> **Executor:** `@qa-critic` · **Pré-requisito:** laudo `CLEAR` do `@fact-checker`.
> **Roda junto com:** `gate-transversal-entrega.md` (base comum — não repetida aqui).
> **Dimensões críticas da rubrica:** D3 ritmo · D5 clareza de ação · D6 consistência do creator.

---

## Como ler

`BLOQUEANTE` = reprovou, **FAIL**. `BLOQUEANTE NON-WAIVABLE` = nem o `@studio-chief` derruba.
`ATENÇÃO` = reprovou, **CONCERNS**. Todo item tem **Teste** e **Falha se**.

**Este gate avalia duas coisas separadas:**
- **Bloco A** — a qualidade do **Pacote de Direção** entregue ao operador humano.
  Pacote vago é FALHA **mesmo que o asset tenha saído bom** — em UGC o volume é a regra, e
  direção que não se repete não escala.
- **Blocos B a H** — a qualidade do que o humano **devolveu** e do anúncio montado.

> **Tensão específica deste gênero.** UGC precisa **parecer** não-dirigido. Isso nunca
> autoriza fabricar experiência, depoimento ou resultado. Autenticidade é de **linguagem**,
> não de **fato**: a peça pode soar caseira, não pode mentir.

---

## Bloco A — Pacote de Direção específico de UGC (UGC-PD)

- [ ] **UGC-PD-01** · `BLOQUEANTE` — Existe bíblia do creator sintético antes do primeiro still.
  **Teste:** existe `character-bible.yaml` do creator com traços, faixa etária, wardrobe base, ambiente e voz; o `asset_direction` a referencia por caminho.
  **Falha se:** os stills foram dirigidos sem bíblia, ou a bíblia existe e os pacotes não a citam.

- [ ] **UGC-PD-02** · `BLOQUEANTE` — O pacote traz âncora de consistência do rosto.
  **Teste:** o `tecnica` especifica o mecanismo (character sheet como referência, seed travada, imagem de referência) e o `parametros` traz o valor usado.
  **Falha se:** cada still é gerado do zero pelo texto, sem âncora — a deriva de rosto é certa.

- [ ] **UGC-PD-03** · `BLOQUEANTE` — O pacote especifica o código visual de UGC, não o de comercial.
  **Teste:** o prompt define câmera na mão ou apoiada de forma casual, luz de ambiente doméstico/natural, enquadramento imperfeito, fundo real com bagunça plausível.
  **Falha se:** o prompt pede luz de estúdio, composição simétrica e fundo limpo — isso produz anúncio com cara de anúncio, que é a falha central do gênero.

- [ ] **UGC-PD-04** · `BLOQUEANTE` — O produto tem âncora de fidelidade no pacote.
  **Teste:** existe imagem de referência do produto real declarada, e o `criterio_de_aceite` inclui "rótulo e formato correspondem ao produto real".
  **Falha se:** o produto é livremente gerado pelo modelo.

- [ ] **UGC-PD-05** · `BLOQUEANTE` — O pacote de voz dirige naturalidade, não locução publicitária.
  **Teste:** o `asset_direction` de VO especifica ritmo coloquial, hesitação natural quando aplicável, e proíbe entonação de propaganda.
  **Falha se:** não há direção de interpretação, ou a direção pede "voz profissional e envolvente".

- [ ] **UGC-PD-06** · `BLOQUEANTE` — As variações de hook estão dirigidas como variações **controladas**.
  **Teste:** cada variação muda **uma** variável declarada (fala de abertura, primeiro frame, ou ângulo), mantendo o resto igual.
  **Falha se:** as variações mudam três coisas ao mesmo tempo — isso não é teste, é aposta, e o resultado não ensina nada.

- [ ] **UGC-PD-07** · `BLOQUEANTE` — `armadilhas_conhecidas` cobre as falhas típicas de UGC gerado.
  **Teste:** o conjunto menciona, quando aplicável: mão segurando produto (deformação), lip-sync fora, deriva de rosto entre takes, e "cara de render" (pele plástica).
  **Falha se:** nenhum pacote antecipa nenhuma delas.

- [ ] **UGC-PD-08** · `ATENÇÃO` — O pacote define quantos takes por variação e o critério de escolha.
  **Teste:** `quantas_variacoes` ≥ 2 por take e há uma frase dizendo o que faz um take vencer.
  **Falha se:** não há critério de escolha declarado — a escolha vira gosto do operador do dia.

---

## Bloco B — Autenticidade percebida (UGC-AU)

- [ ] **UGC-AU-01** · `BLOQUEANTE` — A peça não tem código visual de anúncio produzido.
  **Teste:** procurar por: luz de estúdio de três pontos, composição centralizada perfeita, transição de motion graphics elaborada, música de biblioteca corporativa, locução com entonação de propaganda.
  **Falha se:** dois ou mais desses códigos estão presentes.

- [ ] **UGC-AU-02** · `BLOQUEANTE` — A fala soa falada, não lida.
  **Teste:** ler a transcrição em voz alta. Frases invertidas, adjetivos empilhados e conectivos formais ("portanto", "além disso", "de maneira eficaz") denunciam texto escrito para ser lido.
  **Falha se:** há 3+ ocorrências de construção formal em 30 s de fala.

- [ ] **UGC-AU-03** · `BLOQUEANTE` — Zero artefato de IA no rosto e nas mãos em plano fechado.
  **Teste:** revisar todos os frames em que rosto ou mão ocupam mais de 1/4 do quadro.
  **Falha se:** há dedo a mais, dedo fundido, olho assimétrico, dente derretido ou textura de pele plástica perceptível em exibição normal.

- [ ] **UGC-AU-04** · `BLOQUEANTE` — Lip-sync dentro da tolerância.
  **Teste:** em 3 pontos, o movimento da boca corresponde à sílaba com desvio ≤ 100 ms.
  **Falha se:** algum ponto estoura, ou a boca continua se mexendo depois da fala terminar.

- [ ] **UGC-AU-05** · `ATENÇÃO` — O ambiente é plausível para o avatar do brief.
  **Teste:** comparar o cenário com o perfil socioeconômico e o contexto do avatar declarado.
  **Falha se:** o cenário contradiz o avatar (apartamento de revista para avatar de classe média, escritório corporativo para creator caseiro).

- [ ] **UGC-AU-06** · `ATENÇÃO` — Áudio com ambiência, não silêncio de estúdio.
  **Teste:** ouvir os trechos entre falas.
  **Falha se:** o fundo é silêncio digital absoluto — som limpo demais denuncia geração.

---

## Bloco C — Hook nos 3 segundos (UGC-HK)

- [ ] **UGC-HK-01** · `BLOQUEANTE` — A proposição chega até 00:03,0.
  **Teste:** marcar o timecode da primeira palavra ou imagem que comunica o benefício, o problema ou a promessa.
  **Falha se:** o marco é posterior a 3,0 s. Ajuste de câmera, respiração, vinheta ou "oi gente" antes disso conta como tempo perdido.

- [ ] **UGC-HK-02** · `BLOQUEANTE` — O primeiro frame não é frame morto.
  **Teste:** olhar o frame 1 isolado: ele comunica alguma coisa (rosto em expressão, produto, texto, situação)?
  **Falha se:** o frame 1 é fundo, borrão, tela preta ou pessoa fora de posição.

- [ ] **UGC-HK-03** · `BLOQUEANTE` — Existe pattern interrupt nos primeiros 3 s.
  **Teste:** identificar o dispositivo: movimento brusco, corte rápido, texto de impacto, pergunta direta, objeto entrando em quadro.
  **Falha se:** os 3 s iniciais são estáticos e sem evento.

- [ ] **UGC-HK-04** · `ATENÇÃO` — O texto de overlay do hook é legível em tela pequena.
  **Teste:** visualizar em 1/3 da tela do celular; ≤ 7 palavras; contraste suficiente.
  **Falha se:** passa de 7 palavras ou some sobre o fundo.

- [ ] **UGC-HK-05** · `ATENÇÃO` — O hook entrega o que a peça cumpre.
  **Teste:** comparar a promessa do hook com o conteúdo do corpo.
  **Falha se:** o hook promete algo que a peça não trata — clickbait derruba a métrica de retenção e a qualidade do lead.

---

## Bloco D — Prova sem fabricação (UGC-PR)

- [ ] **UGC-PR-01** · `BLOQUEANTE NON-WAIVABLE` — Nenhum depoimento sobre experiência que não existiu.
  **Teste:** cada afirmação em primeira pessoa ("eu usei", "mudou meu", "testei por 30 dias") tem lastro documentado no laudo do fact-checker.
  **Falha se:** há relato pessoal fabricado — creator sintético narrando experiência inventada é depoimento falso, mesmo com aparência de UGC.

- [ ] **UGC-PR-02** · `BLOQUEANTE NON-WAIVABLE` — Nenhum número de resultado sem fonte.
  **Teste:** cruzar com a tabela de claims do laudo.
  **Falha se:** sobrou percentual, multiplicador ou prazo de resultado sem origem.

- [ ] **UGC-PR-03** · `BLOQUEANTE NON-WAIVABLE` — Disclosure de conteúdo sintético aplicado.
  **Teste:** a peça usa creator sintético apresentando produto → precisa da flag de conteúdo gerado por IA da plataforma declarada no manifesto e/ou rótulo na peça (caso AID-3).
  **Falha se:** não há flag nem rótulo.

- [ ] **UGC-PR-04** · `BLOQUEANTE` — A demonstração mostra o produto real funcionando.
  **Teste:** os planos de demonstração usam captura real (tela, produto físico) ou asset com âncora de fidelidade aprovada.
  **Falha se:** a demonstração é uma recriação livre que não corresponde ao comportamento real do produto.

- [ ] **UGC-PR-05** · `ATENÇÃO` — A prova aparece antes do CTA.
  **Teste:** marcar o timecode da prova (demonstração, antes/depois legítimo, evidência) e o do CTA.
  **Falha se:** o CTA vem antes de qualquer elemento de prova.

---

## Bloco E — CTA (UGC-CT)

- [ ] **UGC-CT-01** · `BLOQUEANTE` — Existe uma e apenas uma ação pedida.
  **Teste:** listar os verbos de ação dirigidos ao espectador.
  **Falha se:** há duas ou mais ações concorrentes ("comenta, salva e clica no link").

- [ ] **UGC-CT-02** · `BLOQUEANTE` — O CTA é executável no canal de destino.
  **Teste:** a ação existe na plataforma declarada (ex.: pedir "link na bio" num anúncio de feed com botão é incoerente).
  **Falha se:** a ação não corresponde ao formato/canal do manifesto.

- [ ] **UGC-CT-03** · `BLOQUEANTE` — Nenhum CTA da lista proibida do cliente.
  **Teste:** varrer o fechamento e a caption contra `cta_estilo.exemplos_proibidos` do brand-identity.
  **Falha se:** encontrar qualquer um.

- [ ] **UGC-CT-04** · `ATENÇÃO` — O CTA está visível e audível.
  **Teste:** o CTA é dito **e** aparece em tela, fora da zona de interface da plataforma.
  **Falha se:** só existe em áudio (perdido no mudo) ou só em texto na área coberta pela UI.

- [ ] **UGC-CT-05** · `ATENÇÃO` — O CTA ocupa tempo suficiente.
  **Teste:** medir o tempo do bloco de CTA.
  **Falha se:** menos de 1,5 s, ou mais de 20% da duração total (CTA longo demais mata a retenção).

---

## Bloco F — Compliance de plataforma (UGC-CP)

- [ ] **UGC-CP-01** · `BLOQUEANTE` — Nenhum claim vedado pela política de anúncios do canal.
  **Teste:** varrer por promessa de resultado garantido, linguagem de antes/depois em saúde/corpo, alegação médica, alegação financeira de ganho, e segmentação por atributo pessoal ("você que está endividado").
  **Falha se:** encontrar qualquer um.

- [ ] **UGC-CP-02** · `BLOQUEANTE` — Zonas de interface respeitadas.
  **Teste:** em 9:16 (1080×1920), nenhum elemento essencial nos 250 px inferiores, nos 120 px superiores, nem na faixa lateral direita de ~120 px em TikTok.
  **Falha se:** CTA, texto-chave ou logo cai em qualquer dessas faixas.

- [ ] **UGC-CP-03** · `BLOQUEANTE` — Sem marca d'água nem selo de outra plataforma.
  **Teste:** inspecionar cantos e bordas; procurar logo de rede social, de ferramenta de IA ou de banco de vídeo.
  **Falha se:** encontrar qualquer um — além de rejeição no ads manager, é entrega de peça com marca de terceiro.

- [ ] **UGC-CP-04** · `ATENÇÃO` — Proporção de texto em tela adequada ao canal.
  **Teste:** estimar a área ocupada por texto no frame mais carregado.
  **Falha se:** o texto domina o quadro a ponto de descaracterizar o formato UGC.

- [ ] **UGC-CP-05** · `ATENÇÃO` — Trilha licenciada para uso comercial em anúncio.
  **Teste:** conferir a licença: música de biblioteca de rede social **não** vale para anúncio pago.
  **Falha se:** a trilha vem do acervo orgânico da plataforma e a peça vai para mídia paga.

---

## Bloco G — Variação para teste (UGC-VR)

- [ ] **UGC-VR-01** · `BLOQUEANTE` — O lote entrega o número de variações declarado no brief.
  **Teste:** contar as variações finalizadas contra o pedido.
  **Falha se:** entregou menos, ou entregou o mesmo vídeo com nomes diferentes.

- [ ] **UGC-VR-02** · `BLOQUEANTE` — Cada variação isola **uma** variável.
  **Teste:** montar a matriz variação × variável alterada (hook / creator / prova / CTA / formato).
  **Falha se:** alguma variação muda mais de uma variável sem que o brief peça um teste multivariado explícito.

- [ ] **UGC-VR-03** · `BLOQUEANTE` — A variável testada está declarada no manifesto.
  **Teste:** cada arquivo tem a variável e a hipótese registradas.
  **Falha se:** as variações vão para mídia sem hipótese — o resultado não vai ensinar nada.

- [ ] **UGC-VR-04** · `ATENÇÃO` — As variações são comparáveis.
  **Teste:** mesma duração (±15%), mesmo formato, mesmo destino.
  **Falha se:** as variações têm duração ou formato diferentes sem motivo, o que contamina a leitura do teste.

- [ ] **UGC-VR-05** · `ATENÇÃO` — Existe pelo menos uma variação de hook.
  **Teste:** conferir a matriz.
  **Falha se:** todas as variações testam CTA ou prova e nenhuma testa hook — hook é a variável de maior impacto no gênero.

---

## Bloco H — Asset devolvido pelo humano (UGC-AS)

- [ ] **UGC-AS-01** · `BLOQUEANTE` — O creator é reconhecivelmente a mesma pessoa em todos os takes do lote.
  **Teste:** comparar rosto em um frame de cada take: traços, tom de pele, cabelo, idade aparente.
  **Falha se:** dá para dizer que são pessoas diferentes.

- [ ] **UGC-AS-02** · `BLOQUEANTE` — Wardrobe e ambiente estáveis dentro de cada peça.
  **Teste:** comparar roupa e fundo entre os takes de uma mesma peça.
  **Falha se:** muda sem elipse narrativa.

- [ ] **UGC-AS-03** · `BLOQUEANTE` — Todo asset passou nos critérios de aceite do pacote.
  **Teste:** marcar sim/não por critério em cada asset usado.
  **Falha se:** asset reprovado entrou no master sem waiver registrado.

- [ ] **UGC-AS-04** · `BLOQUEANTE` — Nenhum asset traz marca d'água da ferramenta de geração.
  **Teste:** inspecionar bordas e cantos.
  **Falha se:** encontrar.

- [ ] **UGC-AS-05** · `ATENÇÃO` — Retakes foram dirigidos com mudança registrada.
  **Teste:** `asset_id` com múltiplas rodadas tem registro do que mudou.
  **Falha se:** 3+ tentativas idênticas no escuro.

---

## Evidência (preenchida pelo `@qa-critic`)

| Campo | Valor |
|:---|:---|
| Job / cliente / canal | |
| Variações entregues / pedidas | |
| Timecode da proposição (hook) | |
| Creator (bíblia + âncora usada) | |
| Bloqueantes reprovados (IDs) | |
| Atenções reprovadas (IDs) | |
| Rubrica D3 / D5 / D6 | |
| Gate transversal | PASS · CONCERNS · FAIL |

## Veredito do gênero

- **Resultado:** `PASS` · `CONCERNS` · `FAIL` · `WAIVED`
- **Regra:** qualquer `BLOQUEANTE` reprovado → FAIL. Só `ATENÇÃO` reprovada → CONCERNS.
- **Entrega exige:** este gate **e** `gate-transversal-entrega.md` aprovados.
