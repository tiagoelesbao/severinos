---
name: epic-ltm-validation
description: EPIC-LTM (migração Império → lotemania) — histórico das 5 rodadas de validação do @po; ADR-0001 reabriu 5 stories, e a 5ª rodada (11-20) pôs 6 em Ready, achou o prêmio que seria pago N vezes, a meia cota inalcançável pela UI em 3 pontos, e falha silenciosa onde a story prometia erro 500
metadata:
  type: project
---

Três rodadas de validação do `EPIC-LTM-Imperio-Migration`. A segunda desfez a primeira; a terceira
reabriu a onda 1.

**2026-11-16** — LTM-01, 02, 04, 05 em `Ready` (9/10 cada); LTM-03 NO-GO (6,5), depois repartida
em `03a`/`03b`. O ciclo de portão que travava a LTM-03 (AC11 exigia aviso real da paysure, que
dependia de G5, que vinha depois de G1) **deixou de existir**: a documentação oficial da Paysure
foi lida e está em `docs/research/2026-11-16-paysure-contrato.md`. O que continua bloqueado no
founder é só o `ci`/`cs` do Império — portão G5, trava o primeiro pagamento real, não a
implementação.

**2026-11-17 (2ª)** — o `/grill-with-docs` da meia cota produziu o `ADR-0001` (a metade é **linha**,
não coluna; a unidade vendável num sorteio divisível é a metade). Revalidação: `LTM-01` 5/10,
`LTM-02` 6/10, `LTM-04` 6/10, `LTM-05` 5/10 e `LTM-07` 6,5/10 **NO-GO**; `LTM-03a` 8,5/10 GO;
`LTM-08` 7/10 GO condicional. `LTM-09` criada (BI da frente nova).

**2026-11-17 (3ª, após as correções)** — `LTM-01` 8,5 **GO** e `LTM-05` 8,5 **GO** → **onda 1
liberada**. `LTM-02` 6,5 e `LTM-07` 6,5 NO-GO (correções de fronteira, não de mérito); `LTM-04` 5,5
NO-GO — **1 das 8 correções aplicada**, e essa uma entrou contradizendo o `OUT`, que seguia
proibindo a mudança que o novo AC exige. Três decisões do founder entraram no ADR nesta rodada:
arredondar **as duas** metades para cima (erro de R$ 0,01 cai sobre o operador, nunca sobre o
ganhador), `quantity` conta metades + campo explícito de unidade, e `half NOT NULL` inclusive no
caso degenerado.

**2026-11-18 (4ª)** — `LTM-07` **GO 9/10** na 3ª validação: as três correções foram reais e
conferidas no código (`isDivisible` em `raffles.ts:74`, criado pela `LTM-01`; as 11 colunas de
`orders` sem nenhuma de unidade; AC7 passou a **discriminar** a forma do ADR, porque `quantity` = 3
para 3 metades é falso na forma oposta). `LTM-16` **GO 8,5/10** na 1ª — extração justificada:
nenhuma das **34** tabelas do schema é trilha de ação de operador, e as três consumidoras
(`LTM-10` AC6, `LTM-11` AC4, `LTM-13` AC7) já declaravam depender dela. `LTM-17` **NO-GO 6,5/10**,
revertida de `Ready` (posto pelo @aiox-master sem autoridade) para `Draft`: o `Files:` apontava
`actions/reserve.ts` para o corpo de `reservationMinutesFor`, que mora em `validations/reserve.ts:149`
— **o mesmo defeito, no mesmo arquivo, pelo qual a `LTM-02` levou 6,5 no dia anterior**. `LTM-18`
nasceu e fechou o item solto "campo de configuração sem leitor": a varredura achou **36 de 43**
campos do editor de sorteio sem leitor nenhum, e a loja lê 5 linhas de configuração — divisão em
`18a`/`18b`/`18c` aceita, `18a` primeiro porque não liga nada e já faz a tela parar de mentir.

**2026-11-20 (5ª)** — rodada de 9 stories. **GO:** `LTM-02` (contradição de cabeçalho resolvida —
`Ready` era a verdade, o aviso de `Draft` era resíduo da v1.4), `LTM-27` 8,5, `LTM-08` 8 (o bloco
`Files:` que a travava desde 11-17 **se mede** agora que a `LTM-07` entregou), `LTM-19` 8,5,
`LTM-28` 8,5, `LTM-17` 8,5 (as 4 correções aplicadas; o `Files:` aponta
`validations/reserve.ts:149`). **NO-GO:** `LTM-04` 6 (5,5 das 7 correções de 11-17 ainda abertas; eu
converti 5 em AC verificável — `AC16` dialetos dos dois endpoints, `AC17` token portador, `AC18`
vocabulário de status, `AC19` unidade pelo `ADR-0001`), `LTM-18` 6 (**indespachável**: 8 entradas em
`Files:`, `Depends-on` de 4 stories — o que destrava é a divisão `18a/18b/18c` **existir como
arquivo**, e criar story é do @sm).

**Os três achados que valem mais que os veredictos:**
1. **O prêmio pago N vezes** (`LTM-27`): o `AC3` mandava um campo por prêmio; o domínio lê **um**
   `prizeAmount` por sorteio e recebe **um** número por chamada, então N cadastros ratearia o valor
   cheio N vezes. Eu propus **recusar**; levada a objeção ao founder, ele reafirmou que cadastrar N
   ganhadores é requisito, e o remédio virou **o operador digitar o valor de cada lugar**. **A
   medição sobreviveu à troca de remédio** — o valor dela não era a recusa, era saber que o valor por
   lugar não existia em lugar nenhum.
2. **A meia cota é inalcançável pela interface em TRÊS pontos** (`LTM-08`), não um: além de
   `number-grid.tsx` mandar sempre `half: null`, **nenhum sorteio pode ser marcado como divisível**
   (`setProductDivisibility` com zero chamadores, nenhum formulário envia `isDivisible`,
   `productSchema` resolve `false`) e o ganhador da metade não se registra. Consequência: três ACs
   da `LTM-07` guardam transição que **nenhum caminho de produção dispara**.
3. **Falha silenciosa, não erro 500** (`LTM-28`): a story descrevia *"erro 500"* nos caminhos do
   comprador; medido, a pessoa **não vê nada** — os dois componentes tratam `{ error }` e **não têm
   `try`/`catch`**, e **não existe `error.tsx` em nenhum nível de `src/app`**. O único caminho com
   mensagem é o do **operador**, o de menor estrago.

**Why:** mudar a unidade vendável depois de validar invalida todo AC escrito sobre "número".
O caso mais instrutivo é a `LTM-05`: o verificador de invariantes que todas as stories herdam
estava chavado no **número**, e em sorteio divisível "o mesmo número em dois pedidos" é o estado
**correto** — o verificador ficaria determinísticamente vermelho com o sistema certo, que é pior
que intermitente, e é a prova que o portão G4 usa. A correção é chavear na **unidade vendável**
(a linha de `product_numbers`), o que é expressável antes de a coluna `half` existir.

**How to apply:** quatro padrões que se repetiram e valem para a próxima mudança de modelo de dados.
(1) **Rechavear antes de reescrever**: procurar todo AC que diga "número", "cota" ou "título" e
perguntar qual é a unidade — foi isso que achou o AC5(c) da LTM-05 e o AC-C5 da LTM-03a, o
segundo com consequência financeira (recusaria pagamento válido com dinheiro já capturado).
(2) **Conferir a afirmação do ADR contra o predicado real**: `inArray(number, ...)`
(`reserve.ts:157`) casa as **duas** metades, então o `UPDATE` muda de predicado mesmo mantendo a
atomicidade; um @dev que leia "não muda de forma" ao pé da letra entrega venda dupla silenciosa.
(3) **Procurar a porta nova pela qual um defeito corrigido volta**: a trava de 2026-11-16 fechava
"consertar `reserve.ts` para o teste ficar verde"; a porta nova era "acrescentar a coluna `half`
para o teste **compilar**" — mesmo destino, entrada diferente.
(4) **Correção de ADR não se propaga sozinha para a story.** O ADR foi corrigido e o *Contexto* da
`LTM-07` continuou repetindo a frase retirada; o epic continuou descrevendo a **alternativa
rejeitada** (três estados de ocupação) como se fosse a escolhida. Depois de corrigir a
especificação, varrer quem a cita.

(5) **Precedente meu é vinculante.** A `LTM-17` repetiu exatamente o defeito da `LTM-02`
(`Files:` sem `validations/reserve.ts`). Dar GO a um e NO-GO a outro pelo mesmo defeito torna os
dois veredictos arbitrários — então o precedente decide, e eu digo isso por escrito na validação.

Ver também [[feedback-po-conferir-contrato-no-codigo]],
[[feedback-po-conferir-correcao-aplicada]] e [[feedback-po-conferir-o-numero-medido]].
