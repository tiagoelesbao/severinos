# LTM-05: Testes no caminho do dinheiro — a rede antes do trapézio

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha o problema **F5**
**Prioridade:** **P0** — primeira da fila junto com a LTM-01; é pré-requisito das outras três
**Complexidade:** L (Standard) — infraestrutura de teste + base real descartável + suíte do caminho do dinheiro + verificador de invariantes
**Criada por:** @pm (Morgan) · 2026-11-16

## Story

**Como** engenheiro que vai reescrever reserva, pagamento e, depois, rateio de prêmio
**Eu quero** uma suíte que rode contra Postgres de verdade e falhe quando um número for vendido duas vezes
**Para que** "ficou atômico" e "está pronto para migrar" sejam afirmações comprovadas, não impressões.

## Contexto (evidência lida no código, 2026-11-16)

São **187 arquivos e 14.462 linhas sem um único teste**. `apps/lotemania/package.json` não tem `test` nem `typecheck` — só `dev`, `build`, `start`, `lint` e os comandos do Drizzle. O próprio README do app chama isso de "o primeiro item de dívida, e crítico porque vamos mexer em propriedade de cota e rateio de prêmio".

**Por que esta story vem no começo e não no fim:**

1. O critério de aceite central da **LTM-02** é um teste de concorrência que precisa **falhar no código atual** e passar depois. Sem a suíte existindo antes, essa prova não pode ser produzida — e "ficou atômico" fica sendo opinião.
2. Os ACs de idempotência da **LTM-03** (mesma entrega 5× sequencial e 2× concorrente) são **inverificáveis à mão**. Ninguém clica num webhook duas vezes em paralelo.
3. A **Frente C** (cota dividida em duas metades) mexe em rateio de prêmio — dinheiro do ganhador. O epic já bloqueia a Frente C até a fundação fechar, e esta story é o que torna esse bloqueio significativo.

**Por que a base tem que ser Postgres de verdade, não mock:** os quatro problemas da fundação são **invisíveis para um mock**. Violação de unicidade, plano de execução, reversão de transação e colisão de chave de idempotência concorrente são comportamentos do banco. Um mock de `db` passaria verde em todos eles e não provaria nada. Precedente da casa: teste de integração que não encosta no banco real já mascarou divergência entre o que passava e o que acontecia em produção.

## Decisão de arquitetura (proposta)

1. **`pnpm test` e `pnpm typecheck` passam a existir** — hoje nenhum dos dois existe, e `typecheck` é baratíssimo num projeto TypeScript de 14 mil linhas que nunca foi verificado.
2. **Base Postgres descartável por execução**, provisionada e destruída pelo próprio runner (branch Neon efêmera ou container local). Sem base compartilhada entre execuções: teste de concorrência contaminado por estado de execução anterior é pior que não ter teste, porque falha de forma intermitente e ensina a equipe a ignorar vermelho.
3. **Um verificador de invariantes reusável**, chamado ao final de **todo** teste de concorrência. É a peça que dá valor composto: cada story nova herda a verificação sem reescrevê-la.
4. **O teste de concorrência da reserva nasce vermelho**, deliberadamente, e a execução vermelha fica registrada. Ele é a evidência de aceite da LTM-02.
5. **Cenário de carga derivado do volume medido, com invariantes como asserção — não latência.** 100 números, 50 compradores concorrentes, 5 produtos ao mesmo tempo. Afirmar tempo de resposta em ambiente de teste é afirmar o que o ambiente dá, não o que o sistema faz; afirmar que ao final existem exatamente 100 números vendidos é afirmação sobre o sistema.
6. **Cobertura declarada por ramo de falha, não por porcentagem.** Percentual de cobertura é alvo que se atinge testando o fácil. O critério é enumerável: todo arquivo do caminho do dinheiro tem teste do seu ramo de erro.

## Tarefas (Checklist)

- [ ] `package.json`: scripts `test` e `typecheck`; dependências de teste.
- [ ] Runner de base descartável: provisiona, aplica o schema (`db:push`), semeia o mínimo (tenant, admin, produto) e destrói ao final — inclusive quando a suíte falha.
- [ ] `tests/helpers/invariants.ts` (novo): o verificador de invariantes (ver AC5).
- [ ] `tests/helpers/seed.ts` (novo): seed sintético — **nenhum dado pessoal real**, nem de amostra do Império.
- [ ] `tests/helpers/concurrency.ts` (novo): utilitário para disparar N operações realmente em paralelo e coletar resultados.
- [ ] Suíte de reserva: caminho feliz, falha parcial, concorrência, expiração, anti-spam.
- [ ] Suíte de webhook: assinatura válida, inválida, comprimento divergente.
- [ ] Cenário de carga do AC4.
- [ ] Registrar no Dev Record a execução **vermelha** do teste de concorrência contra o código atual.
- [ ] Documentar no README do app como rodar a suíte e o que ela exige de ambiente.

## Critérios de Aceite

- [ ] **AC1 (os comandos existem e passam):** `pnpm test` e `pnpm typecheck` existem, rodam sem intervenção manual e terminam com código de saída 0 com a suíte abaixo completa. `pnpm typecheck` passando é AC por si: o projeto nunca foi verificado e qualquer erro encontrado é corrigido ou registrado nesta story.
- [ ] **AC2 (Postgres de verdade, descartável):** a suíte roda contra uma instância Postgres real provisionada pelo runner, e a instância é destruída ao final **inclusive quando a suíte falha**. Prova: duas execuções consecutivas da suíte completa dão o mesmo resultado sem nenhuma limpeza manual entre elas. Nenhum teste do caminho do dinheiro usa mock do `db` — verificável por inspeção: zero substituição do módulo de banco nos testes dessa área.
- [ ] **AC3 (o vermelho existe e está registrado):** o teste de concorrência da reserva (20 operações paralelas sobre os mesmos 10 números) **falha** contra o código atual, e a saída dessa falha está no Dev Record desta story. Esse registro é o que a LTM-02 usa como linha de base.
- [ ] **AC4 (cenário de carga com o volume medido):** 5 produtos de 100 números cada, 50 compradores concorrentes por produto, disputando até esgotar. Ao final, **para cada produto**: exatamente 100 números vendidos ou reservados, zero número com dois `order_id` distintos, zero pedido pendente com zero números, zero número reservado apontando para pedido que não existe. Asserções sobre invariantes — **nenhuma asserção de latência** (a latência é medida e registrada, e serve ao portão G4 do epic, mas não é critério aqui).
- [ ] **AC5 (verificador de invariantes reusável):** existe uma função que, dado um `productId`, verifica e falha com mensagem nomeada quando: (a) `vendidos + reservados + disponíveis` ≠ `totalNumbers`; (b) algum número vendido pertence a pedido que não está pago; (c) o mesmo número aparece associado a mais de um pedido; (d) algum número reservado tem reserva vencida sem ter sido liberado. Ela é **chamada ao final de todos** os testes de concorrência — verificável por inspeção dos testes.
- [ ] **AC6 (a suíte cobre o comportamento que existe hoje):** testes verdes contra o código atual para — reserva no caminho feliz; reserva com número já tomado (documentando o resíduo em `canceled` que a LTM-02 vai eliminar, para que a mudança de comportamento seja **deliberada e visível** no diff); varredura de expiração liberando números e incrementando o contador de reservas não pagas; bloqueio anti-spam disparando na terceira reserva não paga e expirando após o prazo; webhook com assinatura válida, com assinatura inválida (401 + evento gravado) e com assinatura de comprimento divergente (não derruba a rota).
- [ ] **AC7 (ramo de falha de cada arquivo do caminho do dinheiro):** `src/db/index.ts`, `src/lib/actions/reserve.ts`, `src/lib/actions/checkout.ts` e a rota do webhook de pagamento têm, cada um, **pelo menos um** teste que exercita seu caminho de erro — não só o caminho feliz. A lista é enumerada no Dev Record com o nome do teste ao lado de cada arquivo.
- [ ] **AC8 (zero dado pessoal):** o seed e as fixtures usam dados sintéticos. Nenhum nome, telefone, e-mail, CPF ou identificador de pagamento real, nem amostra vinda do Império. Verificável por inspeção das fixtures.
- [ ] **AC9 (reprodutível por outra pessoa):** o README do app documenta como rodar a suíte e o que ela exige de ambiente, e a documentação é validada por uma execução a partir de clone limpo, registrada no Dev Record.

## Escopo

**IN:** scripts `test` e `typecheck`; runner de base descartável; verificador de invariantes; utilitário de concorrência; seed sintético; suíte do caminho do dinheiro (reserva, expiração, anti-spam, webhook); cenário de carga; registro da execução vermelha; documentação.

**OUT:**
- Testes das 27 páginas do dashboard e da loja — paridade de telas é Frente B, e testar tela que ainda vai mudar é desperdício.
- Testes de navegador ponta a ponta — exceto o do AC4 da LTM-04, que é dela e nasce lá.
- Pipeline de integração contínua — a suíte roda localmente e por comando; automatizar execução é tarefa do `@devops` quando a suíte existir.
- Meta de porcentagem de cobertura — substituída deliberadamente pelo AC7.
- Correção de qualquer bug que a suíte revelar fora do caminho do dinheiro: **registrar, não corrigir aqui** (abrir item próprio, conforme a preferência da casa por tratar raiz em story dedicada em vez de contornar no meio de outra).

## Dependências

- **Nenhuma bloqueante.** Onda 1, em paralelo com a LTM-01.
- **Bloqueia LTM-02** (AC3 da LTM-02 é o vermelho desta), **LTM-03** (ACs de idempotência) e **LTM-04** (todos os ACs).
- O teste de unicidade da **LTM-01** (AC1 de lá) roda sobre a base provisionada aqui.
- ⚠️ **Compartilha `package.json` com a LTM-02** — por isso a LTM-02 fica sozinha na Onda 2.

## Riscos

- **[Médio] Provisionar base por execução deixar a suíte lenta** e a equipe parar de rodá-la. Mitigação: uma base por execução da suíte inteira (não por arquivo de teste), com isolamento entre testes por produto/tenant distintos; medir o tempo total e registrar.
- **[Médio] Teste de concorrência intermitente** — o pior resultado possível, porque treina a ignorar vermelho. Mitigação: asserções só sobre invariantes (nunca sobre ordem de vencedores nem sobre tempo); base limpa por execução; repetir o teste de concorrência 10× na validação e exigir 10 verdes.
- **[Médio] Branch Neon efêmera depender de rede e credencial**, quebrando a suíte por motivo alheio ao código. Mitigação: suportar Postgres local em container como alternativa, com a mesma aplicação de schema.
- **[Baixo] `pnpm typecheck` revelar muitos erros de uma vez** num projeto nunca verificado. Mitigação: se o volume for grande, corrigir o que está no caminho do dinheiro e registrar o resto como item próprio — mas `typecheck` **passa** ao final desta story, nem que seja com exclusões explícitas e nomeadas.
- **[Baixo] Seed sintético divergir da forma do dado real** e dar falso verde. Mitigação: o seed respeita as invariantes do schema (uma linha por número, tamanho de `numbers` igual a `quantity`); a conferência com dado real acontece no portão G3 do epic, com leitura dupla.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Execução VERMELHA do teste de concorrência (linha de base da LTM-02)
_(colar a saída da falha contra o código atual)_

### Mapa arquivo → teste de ramo de falha (AC7)
_(preencher)_

### Tempo total da suíte e do provisionamento
_(preencher)_

### Notas
_(preencher na implementação)_
