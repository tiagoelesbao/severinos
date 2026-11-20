# Ensaio geral — o sorteio de ponta a ponta

**O que é:** a lista do que precisa funcionar para um sorteio **nascer, vender, pagar e premiar**
no lotemania, do começo ao fim, sem buraco.
**Para que serve:** transformar *"chegar na validação init to end"* de intenção em **lista que passa
ou falha**. Enquanto um item estiver vermelho, a validação não começa.
**Criado por:** @aiox-master · 2026-11-19, a pedido do founder
**Medido:** leitura direta do código em 2026-11-19, depois do commit `4dd7ae7d`.
**Revisto:** 2026-11-20, depois de `38874fba` (`LTM-23`) e `1df81ebe` (`LTM-14`). **Dois elos
fecharam e a lacuna do fim da corrente ganhou story** (`LTM-27`) — ver o Change Log ao fim.

---

## A corrente, elo por elo

| # | Elo | Estado | Quem fecha |
|---|---|---|---|
| 1 | Operador **cria** o sorteio no painel | ✅ existe (`/dashboard/products/new`) | — |
| 2 | As **configurações obedecem** ao que o operador marcou | 🔴 **36 de 45 não obedecem** | `LTM-18` grupo A |
| 3 | O sorteio **aparece** na loja | ✅ existe | — |
| 4 | Comprador novo **se cadastra** | 🟡 existe, mas **não é a tela da Sorteamos** (14 campos, endereço, senha) | `LTM-21` |
| 5 | Comprador **entra** | 🟡 existe, mas é página, não modal, e sem telefone + senha | `LTM-21` |
| 6 | Comprador **escolhe números** | ✅ existe | — |
| 7 | Comprador escolhe **meia cota** | 🔴 **impossível** — a grade manda sempre `half: null` | `LTM-08` |
| 8 | **Checkout** confirma antes de reservar | 🔴 **não existe** o passo | `LTM-21` |
| 9 | A **reserva** nasce, atômica | ✅ entregue (`LTM-02`) | — |
| 10 | A **cobrança PIX** é criada | ✅ entregue (`LTM-03b`) | — |
| 11 | A tela de **espera** mostra código, QR e contagem | ✅ entregue (`LTM-14`, `1df81ebe`) | — |
| 12 | A reserva **vence e devolve** o número | ✅ entregue (`LTM-20`) | — |
| 13 | O **aviso do gateway** fecha o pedido | ✅ entregue (`LTM-03a`) | — |
| 14 | Os números viram **vendidos** | ✅ entregue | — |
| 15 | O operador **encerra** o sorteio | ✅ existe (`Finalizar` → `finished`) | — |
| 16 | O operador **registra o ganhador** | 🔴 **não existe tela nem ação** | `LTM-27` |
| 17 | O **rateio** da meia cota acontece | 🔴 **código existe, ninguém chama** | `LTM-27` |
| 18 | O ganhador **aparece** na loja | ✅ existe (`/ganhadores`) | — |

---

## As quatro quebras, em ordem de gravidade

### 🔴 1. O fim da corrente está aberto: não há como registrar ganhador

`src/lib/raffles/winners.ts` foi entregue pela `LTM-07` e faz o rateio corretamente. **Nenhum código
o chama** — busca por `raffles/winners` fora do próprio arquivo devolve **zero**.

E não há tela: `find src/app/dashboard -iname "*winner*"` devolve **nada**.

**Na Sorteamos existe**, e eu observei: `Definir ganhadores`, no menu ⋮ da linha do sorteio
(`README.md` §2 do inventário).

> **Consequência:** hoje um sorteio no lotemania pode nascer, vender, receber e encerrar — e **não
> tem como dizer quem ganhou**. A página pública de ganhadores existe e ficaria vazia para sempre.
>
> **É o elo que falta para "ponta a ponta" ser literal.** Sem ele, a validação termina no encerramento,
> que é meio sorteio.

~~**Não existe story para isto.**~~ **Virou a `LTM-27` em 2026-11-19**, modelada de quatro
capturas do modal `Ganhadores` da Sorteamos que o founder forneceu. As três perguntas que este
documento deixou abertas estão respondidas lá (secao *As três perguntas, respondidas*), e a story
achou uma quarta que a Sorteamos **não responde**: num sorteio de meia cota, o número sorteado tem
**duas** pessoas, e o modal de lá não tem onde dizer isso.

> **Conferido de novo em 2026-11-20, e continua verdade:** `grep -rn recordWinnersForDrawnTitle`
> em `src/` e `tests/` devolve o próprio arquivo e **um teste** — nada mais. A função está
> **inteira** (transação, recusas nomeadas, rateio), e `src/app/dashboard/` não tem uma linha que
> mencione ganhador. **O que falta é a fiação e a tela, não o domínio.**

### 🔴 2. A meia cota não pode ser comprada

`number-grid.tsx:70` monta sempre `{ number, half: null }` — *"o título inteiro"*. O domínio aceita
metades (`LTM-07`), o banco tem uma linha por metade, a reserva endereça a unidade — **e a loja só
sabe pedir o título inteiro.**

É a `LTM-08`, e ela é **bloqueante**: o founder pediu a meia cota **no** sorteio de teste.

### 🔴 3. O editor mente em 36 dos 45 controles

O operador configura o sorteio de teste nessa tela. Para o ensaio, o **grupo A** (15 campos) é o que
importa — entre eles `requiredFields`, os limites por reserva e as chaves de exibição.

### 🔴 4. Não há por onde um comprador novo entrar como na Sorteamos

Cadastro e login existem, mas em outra forma: lá é modal por telefone + senha, e cadastro de 14
campos com endereço. É a `LTM-21`.

---

## O que falta, consolidado

| Prioridade | O quê | Story |
|---|---|---|
| **P0** | registrar ganhador + acionar o rateio | **`LTM-27`** — criada em 11-19 |
| **P0** | meia cota na grade | `LTM-08` |
| **P0** | entrar, cadastrar, checkout | `LTM-21` |
| **P0** | os 15 controles do grupo A | `LTM-18` |
| ✅ | tela de espera | `LTM-14` — **entregue** em `1df81ebe` |
| ✅ | o 500 da primeira compra | `LTM-23` — **entregue** em `38874fba` |
| P1 | janela de reserva configurável | `LTM-17` |
| **externo** | `ci`/`cs` reais do Império | bloqueia **só o pagamento real** |

### A story que faltava: registrar ganhador — hoje é a `LTM-27`

As três perguntas abaixo eram as que **nenhum documento respondia**. Em 2026-11-19 o founder
forneceu **quatro capturas** do modal `Ganhadores` da Sorteamos, e as três passaram a ter resposta
**observada** em vez de deduzida:

| | A pergunta | A resposta medida |
|---|---|---|
| 1 | Quem informa o número sorteado? | **O operador digita.** O sorteio corre fora do sistema; o modal tem campo de número e `Data do sorteio` editável |
| 2 | O sistema valida que o número foi vendido? | **Sim, e resolve sozinho** — o operador digita `42` e a plataforma acha o comprador. Ele não escolhe a pessoa |
| 3 | O rateio é automático ou confirmado? | A Sorteamos **não tem a pergunta**, porque não tem meia cota. É decisão nossa, e está na `LTM-27` |

> **E a modelagem achou uma quarta que a Sorteamos não responde:** num sorteio de meia cota o número
> sorteado tem **duas** pessoas, e o modal de lá não tem onde dizer isso. É o item que a `LTM-27`
> decide por conta própria, e o único ponto da story que **não** é paridade.

**Isto deixou de ser lacuna e passou a ser trabalho enfileirado.** A `LTM-27` está em `Draft`, P0, e
é a primeira da fila do ensaio junto com a `LTM-08`.

---

## O ensaio em si — quando a lista acima fechar

Roteiro do que deve ser executado, na ordem, num tenant de teste do lotemania:

| # | Passo | Prova de que passou |
|---|---|---|
| 1 | Criar sorteio **divisível**, 10 títulos, prêmio em dinheiro divisível | 20 linhas em `product_numbers`, `is_divisible = true` |
| 2 | Configurar: janela de reserva, campos requeridos, limites | **o comportamento muda**, não só o valor salvo |
| 3 | Abrir a loja num navegador **sem sessão** | sorteio visível, grade pintada, 20 unidades livres |
| 4 | Cadastrar comprador novo | conta criada, sessão aberta |
| 5 | Comprar **uma metade** | 1 unidade reservada, a metade irmã **intacta** |
| 6 | Conferir a tela de espera | contagem de `reservedUntil`, BR Code copiável, QR |
| 7 | **Deixar vencer** — ✅ **autorizado pelo founder (`D12`, 11-20)** | a unidade volta a livre **sem ninguém tentar reservar** |
| 8 | Comprar de novo e **pagar** | pedido `paid`, unidade `sold`, **um** crédito |
| 9 | Segundo comprador leva **a outra metade** do mesmo número | duas pessoas, mesmo número, metades diferentes |
| 10 | Encerrar o sorteio | status `finished` |
| 11 | **Registrar o ganhador** no número partido | **duas** linhas de ganhador, metade a metade, somando o prêmio exato |
| 12 | Conferir a página pública de ganhadores | os dois aparecem, nome mascarado, telefone mascarado |

> **O passo 11 é o que não existe hoje**, e é justamente o que prova que a meia cota funciona de
> ponta a ponta. Um ensaio que pare no passo 10 não valida a feature que o cliente pediu.

### O que a `D12` autorizou, e por que isso importa para o passo 7

O founder autorizou, em 2026-11-20, **duas** coisas no tenant de teste: **deixar uma reserva vencer
de propósito** e **acionar o `Revisar pagamentos`**.

A primeira destrava o passo 7 — e ele é o passo que **prova o defeito que o próprio founder
reportou**: *"reservas expiradas não saem da reserva disponibilizando o número novamente"*. A
`LTM-20` consertou e o portão do @qa fechou `PASS`, mas **o que o portão prova é o código**; o passo 7
prova o produto.

⚠️ **O `Revisar pagamentos` só se aciona no lotemania.** Na Sorteamos ele é **silencioso** — sem
confirmação e sem retorno visual (`menu-lista-de-compras.md`) — e a instrução permanente do founder
sobre a conta dele é *"não altere nada"*. A autorização é para o nosso tenant de teste, e só.

### E o `11` ganhou uma exigência a mais com a `D11`

A decisão de 11-20 é **vários números sorteados, e até 2 ganhadores por número só em meia cota**.
Então o passo 11 do ensaio passa a ter de provar **os dois eixos ao mesmo tempo**: mais de um número
sorteado, **e** um deles partido em duas pessoas. Um ensaio que registre um ganhador só prova metade
da `D11`.

### O que o ensaio **não** prova

- **Pagamento real.** Precisa do `ci`/`cs` do Império (portão **G5**). Até lá, o fechamento é
  exercitado pelo caminho de teste.
- **Carga.** O ensaio é de correção, não de volume. Os ACs de carga da `LTM-01` são outro exercício.
- **Paridade visual.** Outro eixo, outra lista.

---

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.1 | Revisto depois de `38874fba` e `1df81ebe`. **Dois elos fecharam** (11, a tela de espera; e o 500 da primeira compra), e **a lacuna do fim da corrente virou a `LTM-27`** — o founder forneceu quatro capturas do modal `Ganhadores` e as três perguntas abertas ganharam resposta observada. Reconferido no código que `recordWinnersForDrawnTitle` **continua com um único importador, e ele é um teste**: o domínio está inteiro, falta a fiação e a tela. Os elos vermelhos que sobram para o ensaio são **quatro**: `LTM-27` (registrar ganhador), `LTM-08` (meia cota na grade), `LTM-21` (entrar/cadastrar/checkout) e `LTM-18` grupo A (os 15 controles que o operador marca e o sistema ignora). | @aiox-master |
| 2026-11-19 | 1.0 | Criado a pedido do founder, que quer *"chegar logo no momento de validação de sorteios init to end"*. Mapear a corrente revelou **uma lacuna sem story**: não existe como registrar ganhador nem quem acione o rateio que a `LTM-07` entregou — o fim da corrente está aberto, e a página pública de ganhadores ficaria vazia para sempre. | @aiox-master |
