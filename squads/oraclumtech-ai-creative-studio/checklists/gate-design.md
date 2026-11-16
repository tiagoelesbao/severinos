# Gate de Estágio — Design (`gate-design`)

> **Estágio:** `design` · **Dono:** `@art-director` · **Executor:** `agent`
> **Roda:** ao fim do art-spec, antes de liberar `character`/`stills`.
> **Artefato validado:** `{job}/08-design/art-spec.yaml`
> **Libera:** próximo estágio do pipeline
> **Não se avalia aqui:** a coerência de marca da peça final — isso é do gate de pipeline.
> Aqui se valida se o mundo cênico está **especificado o suficiente para ser gerado duas
> vezes com o mesmo resultado**.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **DS-01** · `BLOQUEANTE` — Cada cenário recorrente está descrito com elementos fixos.
  **Teste:** por cenário: ambiente, paredes/fundo, mobiliário-chave, objetos que precisam reaparecer, iluminação prática.
  **Falha se:** o cenário é uma palavra ("escritório moderno") — vira outro lugar a cada geração.

- [ ] **DS-02** · `BLOQUEANTE` — Props relevantes listados por plano.
  **Teste:** cruzar com o storyboard; todo prop que a ação exige está no art-spec.
  **Falha se:** a ação pede um objeto que ninguém especificou.

- [ ] **DS-03** · `BLOQUEANTE` — Wardrobe especificado por personagem e por cena.
  **Teste:** peça, cor, textura e acessórios; e o que muda (ou não) entre cenas.
  **Falha se:** ausente ou genérico — é a causa nº 1 de quebra de continuidade em peça gerada.

- [ ] **DS-04** · `BLOQUEANTE` — Tipografia da peça ancorada no `brand-config`.
  **Teste:** família, pesos, tamanhos relativos e uso (título, apoio, legal, legenda).
  **Falha se:** usa fonte fora do `brand-config` sem decisão registrada.

- [ ] **DS-05** · `BLOQUEANTE` — Grid e área segura definidos por formato de saída.
  **Teste:** para cada proporção de entrega, existe grid e margens seguras.
  **Falha se:** ausente — o texto vai parar sob a interface da plataforma.

- [ ] **DS-06** · `BLOQUEANTE` — Produto especificado com fidelidade.
  **Teste:** referência oficial (imagem, cor, rótulo, proporção) declarada e apontada como âncora obrigatória.
  **Falha se:** o produto é descrito por texto sem imagem de referência.
  **N/A quando:** não há produto físico — declarar.

- [ ] **DS-07** · `BLOQUEANTE` — Elementos de marca posicionados.
  **Teste:** onde entra o logo, em qual versão, com qual respiro, em quais planos.
  **Falha se:** a assinatura fica para a montagem decidir.

- [ ] **DS-08** · `ATENÇÃO` — O art-spec declara o que **não** pode aparecer em cena.
  **Teste:** existe lista de proibições (marca de terceiro, clichê do brand-lock, elemento fora de época/contexto).
  **Falha se:** ausente — o modelo preenche o fundo com o que quiser.

- [ ] **DS-09** · `ATENÇÃO` — Lower-third e motion graphics especificados no padrão da marca.
  **Teste:** tipografia, cor, posição, tempo em tela e animação.
  **Falha se:** faltam campos.

- [ ] **DS-10** · `ATENÇÃO` — Paleta do art-spec compatível com a do look-book.
  **Teste:** comparar as duas.
  **Falha se:** divergem sem decisão registrada.

---

## Registro

| Campo | Valor |
|:---|:---|
| Cenários especificados (qtd) | |
| Personagens com wardrobe | |
| Produto (referência oficial) | |
| Grid/área segura por formato | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera o próximo estágio.
- **REPROVADO** — devolve ao `@art-director`.
