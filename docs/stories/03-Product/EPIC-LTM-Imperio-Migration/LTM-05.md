# LTM-05: Testes no caminho do dinheiro — a rede antes do trapézio

**Status:** Ready
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

  - **Regra de verde e vermelho (@po, validação 2026-11-16) — resolve o conflito entre este AC e os AC3/AC4.** A suíte desta story contém, deliberadamente, testes de **duas naturezas**, e `pnpm test` sair 0 significa que **cada teste está no estado declarado**, não que todo teste passou:
    1. **Verdes agora** (AC6, AC7, AC8): descrevem o comportamento que o código **tem hoje**, inclusive os defeitos — e por isso passam contra o código atual.
    2. **Vermelhos esperados** (AC3, e o AC4 no que ele assere invariante que o código atual viola): marcados no próprio teste como falha esperada — `test.fails` do Vitest, ou equivalente do runner escolhido — **com o ID da story que os torna verdes no nome ou no comentário do teste** (`[vira verde na LTM-02]`). Um teste marcado como falha esperada que **passa** faz a suíte falhar, que é exatamente o sinal que se quer: quando a LTM-02 consertar o código, a suíte quebra e obriga a remover a marcação. É assim que o vermelho de hoje vira o aceite de amanhã sem ninguém precisar lembrar.
    - **Proibido**, porque é a saída errada que um agente apressado tomaria: tornar o AC3 verde consertando `reserve.ts` ou `db/index.ts`. Isso é escopo da LTM-02. Esta story **não altera código de produção** (ver Escopo) — só `package.json`, config de teste e `tests/`.
    - Se o AC4, executado contra o código atual, **passar** (é possível: o `UPDATE` condicional já é atômico por linha), registre isso no Dev Record como medição, mantenha o teste verde e **não** o marque como falha esperada. O que não é aceitável é o estado de cada teste ficar indefinido.
- [ ] **AC2 (Postgres de verdade, descartável):** a suíte roda contra uma instância Postgres real provisionada pelo runner, e a instância é destruída ao final **inclusive quando a suíte falha**. Prova: duas execuções consecutivas da suíte completa dão o mesmo resultado sem nenhuma limpeza manual entre elas. Nenhum teste do caminho do dinheiro usa mock do `db` — verificável por inspeção: zero substituição do módulo de banco nos testes dessa área.
- [ ] **AC3 (o vermelho existe e está registrado):** o teste de concorrência da reserva (20 operações paralelas sobre os mesmos 10 números) **falha** contra o código atual, e a saída dessa falha está no Dev Record desta story. Esse registro é o que a LTM-02 usa como linha de base.
- [ ] **AC4 (cenário de carga com o volume medido):** 5 produtos de 100 números cada, 50 compradores concorrentes por produto, disputando até esgotar. Ao final, **para cada produto**: exatamente 100 números vendidos ou reservados, zero número com dois `order_id` distintos, zero pedido pendente com zero números, zero número reservado apontando para pedido que não existe. Asserções sobre invariantes — **nenhuma asserção de latência** (a latência é medida e registrada, e serve ao portão G4 do epic, mas não é critério aqui).
- [ ] **AC5 (verificador de invariantes reusável):** existe uma função que, dado um `productId`, verifica e falha com mensagem nomeada quando: (a) `vendidos + reservados + disponíveis` ≠ `totalNumbers`; (b) algum número vendido pertence a pedido que não está pago; (c) o mesmo número aparece associado a mais de um pedido; (d) algum número reservado tem reserva vencida sem ter sido liberado. Ela é **chamada ao final de todos** os testes de concorrência — verificável por inspeção dos testes.
- [ ] **AC6 (a suíte cobre o comportamento que existe hoje):** testes verdes contra o código atual para — reserva no caminho feliz; reserva com número já tomado (documentando o resíduo em `canceled` que a LTM-02 vai eliminar, para que a mudança de comportamento seja **deliberada e visível** no diff); varredura de expiração liberando números e incrementando o contador de reservas não pagas; bloqueio anti-spam disparando na terceira reserva não paga e expirando após o prazo; webhook com assinatura válida, com assinatura inválida (401 + evento gravado) e com assinatura de comprimento divergente (não derruba a rota).
- [ ] **AC7 (ramo de falha de cada arquivo do caminho do dinheiro):** `src/db/index.ts`, `src/lib/actions/reserve.ts`, `src/lib/actions/checkout.ts` e a rota do webhook de pagamento têm, cada um, **pelo menos um** teste que exercita seu caminho de erro — não só o caminho feliz. A lista é enumerada no Dev Record com o nome do teste ao lado de cada arquivo.
  - **Ramos nomeados (@po, validação 2026-11-16)**, para o AC não virar caixinha marcada com teste vazio. `src/db/index.ts` tem **um** ramo de falha e só um: `process.env.DATABASE_URL!` é asserção de não-nulo — sem a variável, o módulo quebra na importação. O teste é esse: importar o módulo sem `DATABASE_URL` e verificar que a falha é alta e nomeada, não um `undefined` viajando até a primeira consulta. Os outros três: `reserve.ts` — operador/sorteio inexistente, telefone bloqueado, bloqueio anti-spam, e a reserva parcial; `checkout.ts` — `simulatePayment` com pedido inexistente ou já pago; rota do webhook — provedor desconhecido (404), operador desconhecido (404), assinatura inválida (401), corpo que não é JSON (hoje cai em `{ raw: rawBody }` e **não** derruba a rota — esse comportamento é testado como está).
- [ ] **AC8 (zero dado pessoal):** o seed e as fixtures usam dados sintéticos. Nenhum nome, telefone, e-mail, CPF ou identificador de pagamento real, nem amostra vinda do Império. Verificável por inspeção das fixtures.
- [ ] **AC9 (reprodutível por outra pessoa):** o README do app documenta como rodar a suíte e o que ela exige de ambiente, e a documentação é validada por uma execução a partir de clone limpo, registrada no Dev Record.

## Escopo

**IN:** scripts `test` e `typecheck`; runner de base descartável; verificador de invariantes; utilitário de concorrência; seed sintético; suíte do caminho do dinheiro (reserva, expiração, anti-spam, webhook); cenário de carga; registro da execução vermelha; documentação.

**OUT:**
- **Qualquer alteração em código de produção** (@po, 2026-11-16). Esta story toca `package.json`, configuração de teste e `tests/` — e nada mais. Consertar `reserve.ts`, `checkout.ts`, `db/index.ts` ou a rota do webhook para fazer um teste ficar verde é escopo da LTM-02 e da LTM-03. A suíte aqui **descreve** o que o código faz, inclusive quando o que ele faz está errado.
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

## Validação @po (2026-11-16)

**Veredicto: GO — 9/10.** Rigor extra aplicado por ser onda 1 e pré-requisito de três stories. A medição confere exatamente: **187 arquivos e 14.462 linhas** em `src/`, e o `package.json` tem só `dev`, `build`, `start`, `lint`, `db:generate`, `db:push`, `db:studio`, `db:seed` — sem `test` e sem `typecheck`.

**O defeito corrigido era o mais perigoso do epic inteiro.** O AC1 exigia a suíte saindo com código 0, enquanto o AC3 exigia um teste **vermelho** e o AC4 asseria invariantes que o código atual pode violar. Como estava escrito, um agente em YOLO tinha duas saídas e a mais provável era a errada: consertar `reserve.ts` para o AC3 ficar verde — roubando o escopo da LTM-02 e destruindo justamente a linha de base que a LTM-02 usa como prova de aceite. Correções:

1. **Regra de verde e vermelho no AC1** — cada teste tem estado declarado (verde agora / falha esperada com o ID da story que o vira verde). Teste marcado como falha esperada que passa **quebra a suíte**: quando a LTM-02 consertar o código, a suíte avisa.
2. **Escopo OUT explícito** — esta story não altera código de produção. Era o que faltava para fechar a saída errada.
3. **Ramos de falha nomeados no AC7** — `src/db/index.ts` tem exatamente um (`DATABASE_URL` ausente, pela asserção de não-nulo); os outros três ficaram enumerados. Sem isso o AC era caixinha marcável com teste vazio.

**Confirmado, não é armadilha:** a dependência circular aparente (LTM-03/04 → LTM-05 → "algo testável") não existe. A LTM-05 testa o código que **já está escrito**, incluindo seus defeitos — AC6 e AC7 são verdes contra o estado atual. A ordem do epic (`LTM-05` + `LTM-01` → `LTM-02` → `LTM-03` + `LTM-04`) resolve de fato.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-16 | 1.1 | Validada — GO (9/10). Draft → Ready. Regra de verde/vermelho no AC1, código de produção posto em OUT, ramos de falha nomeados no AC7. | @po (Pax) |
