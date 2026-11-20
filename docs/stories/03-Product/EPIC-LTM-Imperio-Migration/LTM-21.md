# LTM-21: A loja do comprador — entrar, cadastrar e navegar

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade Total)
**Prioridade:** **P0** — é a porta de entrada do lead. Sem ela, o sorteio de teste não tem por onde entrar comprador novo
**Complexidade:** L
**Criada por:** @aiox-master · 2026-11-19, a partir de relato do founder usando o produto
**Evidência:** `docs/research/2026-11-18-inventario-sorteamos/fluxo-de-compra.md` e `loja-comprador.md` — tudo observado ao vivo em 2026-11-19

## O relato

> *"fluxo após escolher números e comprar não está igual, bem como telas de cadastro para novos
> leads, opções do menu de hambúrguer também não possui redirecionamentos e funções iguais"*
> — founder, 2026-11-19

## Story

**Como** pessoa que nunca comprou no Império e chegou pelo anúncio
**Eu quero** entrar, me cadastrar e comprar sem tropeçar numa tela diferente da que eu conheço
**Para que** a migração não custe lead na porta.

---

## 1. O menu de hambúrguer — a diferença, medida

As duas versões foram observadas no mesmo navegador, antes e depois de sair da conta.

| | **Deslogado** | **Logado** |
|---|---|---|
| Bloco de perfil no topo | ❌ ausente | ✅ avatar + **nome** + **telefone mascarado** |
| Início | ✅ | ✅ |
| Campanhas | ✅ | ✅ |
| Comunicados | ✅ | ✅ |
| Meus títulos | ✅ | ✅ |
| **Cadastro** | ✅ **presente** | ❌ **ausente** |
| Ganhadores | ✅ | ✅ |
| Afiliados | ✅ | ✅ |
| Termos de uso | ✅ | ✅ |
| Suporte | ✅ | ✅ |
| Botão inferior | **`Entrar`** | **`Sair`** |
| Rodapé | versão `2.14`, centralizada e discreta | idem |

**É um menu só, com três diferenças condicionais:** o bloco de perfil, o item `Cadastro` e o rótulo
do botão.

**Forma:** sobreposição **preta de tela inteira**, logo no topo, **✕** à direita. Cada item é uma
**linha de largura total, com ícone à esquerda e divisória abaixo** — não é lista compacta nem
gaveta lateral.

## 2. Entrar — é **modal**, por **telefone**, e não tem senha no primeiro passo

Não existe rota `/entrar`: ela cai no 404. O login abre como **modal** sobre a tela atual.

| Parte | Conteúdo |
|---|---|
| Cabeçalho | 🔑 **`Login`** + ✕ |
| Campo único | **`Informe seu telefone *`**, com seletor de país (🇧🇷) e máscara `99 90000 0000` |
| Aviso âmbar | *"Informe seu telefone para continuar"* |
| Ação | **`Continuar`** — verde, largura total |

> **O primeiro passo pede só o telefone.** O segundo passo **[NÃO OBSERVADO]** — não foi seguido
> porque exigiria autenticar numa conta real.
>
> **O que ele provavelmente é na Sorteamos:** a plataforma integra **LIGUELEAD** e **PAPOSMS**, as
> duas descritas como *"autenticação de consulta de números via **código SMS**"*
> (`painel-telas.md` §8). O caminho mais provável lá é **telefone → código por SMS**.

### ✅ Decisão do founder, 2026-11-19: **sem SMS por enquanto**

> *"confirmação de sms não vamos precisar implementar por enquanto, registre como feature futura
> após lançamento essa confirmação por SMS"*

**O que isso resolve:** o risco [Alto] desta story — depender de um fornecedor de SMS, com custo por
mensagem e cadastro de remetente — **deixa de existir**. Está registrado como `LTM-22`, fora do
caminho crítico.

**O que isso decide, por eliminação:** o cadastro **cria senha** (campo 14). Sem SMS, o segundo
passo do login só pode ser **a senha**. Então:

```
Login:  telefone  →  senha
```

Isso é coerente com o que foi observado e **não inventa nada**: os dois campos já existem no produto
da Sorteamos (o telefone no modal, a senha no cadastro). O que muda em relação a ela é o **meio de
verificação**, não o modelo de conta.

> ⚠️ **Uma consequência que precisa estar escrita:** sem SMS, **o telefone não é verificado**.
> Alguém pode se cadastrar com o telefone de outra pessoa. Na Sorteamos o código fecha esse buraco;
> aqui ele fica aberto até a `LTM-22`. **Não é impeditivo para o sorteio de teste** — é o estado
> declarado, não um descuido.

## 3. Cadastro — `/cadastrar`, **catorze campos**

Título: **🙋 `Faça o seu cadastro`**

| # | Campo | Obrigatório |
|---|---|---|
| 1 | Nome Completo | ✅ |
| 2 | Informe seu CPF — máscara `000.000.000-00` | ✅ |
| 3 | Nome Social | opcional |
| 4 | Telefone — com seletor de país | ✅ |
| 5 | **Confirme o Telefone** — com seletor de país | ✅ |
| 6 | E-mail | ✅ |
| 7 | Data de Nascimento | ✅ |
| 8 | **CEP** — máscara `00000-000` | ✅ |
| 9 | **Logradouro** — *"Rua, Avenida, Travessa…"* | ✅ |
| 10 | **Número** | ✅ |
| 11 | **Bairro** | ✅ |
| 12 | **UF** + **Cidade** — selects **dependentes** | ✅ |
| 13 | Complemento — *"Apto, Bloco, Casa…"* | opcional |
| 14 | **Senha** | ✅ |

Ação: **`Concluir Cadastro`** — verde, largura total, com ícone ▸.

### Dois achados que mudam o modelo de dados

> **1. O endereço completo é obrigatório — e NÃO está em `requiredFields`.**
>
> A aba *Geral* do editor oferece seis campos requeridos: Nome, Telefone, CPF, E-mail, Nome Social,
> Data de Nascimento (`editor-14-abas.md`). **CEP, logradouro, número, bairro, UF e cidade não estão
> lá** — e mesmo assim são obrigatórios no cadastro.
>
> Ou seja: `requiredFields` governa **a reserva**, não **o cadastro**. São dois conjuntos
> diferentes, e o lotemania trata como se fosse um. Isso confirma, pelo outro lado, as colunas
> `UF` e `Cidade` da tela de Usuários do painel.
>
> **2. Existe senha — e o login não a pede no primeiro passo.**
>
> Na Sorteamos o cadastro cria senha e o login abre pedindo telefone; o SMS fica no meio.
> **Resolvido pela decisão de 2026-11-19** (ver §2): sem SMS, o nosso login é **telefone → senha**,
> e os dois campos já existem. Deixou de ser `[CONFIRMAR]`.

## 4. O fluxo depois de escolher os números

Observado ponta a ponta em 2026-11-19 (`fluxo-de-compra.md`). Cinco passos:

```
grade → rodapé de seleção → modal de Checkout → /compra/{orderId} → tela de PIX
```

### 4.1 Rodapé de seleção

Barra verde fixa de largura total: ícone de confirmação à esquerda, **`Quero participar`** ao
centro, **total correndo** à direita. **Acima dela**, uma pílula com **cada número escolhido** e um
**✕** que limpa a seleção.

### 4.2 Modal de Checkout — o passo que falta no lotemania

| Parte | Conteúdo |
|---|---|
| Cabeçalho | 🛒 `Checkout` + ✕ |
| Faixa verde | *"Você está adquirindo **N unidade(s)** do produto **{título}**"* |
| Identificação | avatar + nome + **telefone mascarado `(DD) 9****-****`** |
| Letra miúda | *"Ao efetuar este pagamento e confirmar a compra deste **título de capitalização**, declaro que li e concordo com os **termos de uso**."* |
| Ação | **`Concluir Reserva`** |
| Secundária | **`Alterar conta`** |

> **É uma tela de confirmação entre a grade e o pagamento**, e ela faz três coisas que o lotemania
> não faz: **mostra quem está comprando**, **deixa trocar de conta** e **colhe o aceite dos termos**
> no momento da compra. O aceite não é detalhe: a letra miúda enquadra a compra como **título de
> capitalização**.

#### ❓ Pergunta em aberto — o telefone aqui, depois da `D9` (2026-11-19)

A decisão **D9** do founder foi: **telefone inteiro, mas só na tela do próprio pedido**
(`/compra/{orderId}`); o **cartão de ganhador continua mascarado**. A razão da divisão é *quem está
vendo o dado de quem*: a tela do pedido mostra o dado **da própria pessoa, para ela mesma**; o cartão
de ganhador é página **pública** com dado de **terceiro**.

**Pelo critério da D9, este modal cai do mesmo lado da tela do pedido:**

| | Tela do pedido | **Modal de Checkout** | Cartão de ganhador |
|---|---|---|---|
| De quem é o dado | da própria pessoa | **da própria pessoa** | de terceiro |
| Quem vê | ela mesma, autenticada | **ela mesma, autenticada** | qualquer um, página indexável |
| D9 decidiu | **inteiro** | **não nomeada** | **mascarado** |

> ⛔ **Não está decidido, e não foi estendido por dedução.** A D9 nomeou **só a tela do pedido**, e o
> founder não falou deste modal. Materialmente é o mesmo caso — mesma pessoa, mesmo dado, mesma
> autenticação, só **antes** de o pedido existir — mas *"materialmente o mesmo"* não é *"decidido"*,
> e esta base já pagou por estender decisão de founder além do que ela dizia.
>
> **A pergunta é de uma linha:** *"o telefone inteiro vale também no modal de Checkout, antes de o
> pedido existir?"* Fica registrada aqui e em §4 do epic. **Até a resposta, o modal segue o que a
> Sorteamos faz: `(DD) 9****-****`** — paridade é o default correto na ausência de decisão.
>
> ⚠️ **E a mesma incoerência da tela do pedido aparece aqui:** o **nome** segue mascarado e o
> telefone (se a resposta for "sim") não. O founder falou de número, não de nome. Duas perguntas,
> não uma.

### 4.3 O erro de conflito **nomeia o número**

Observado ao vivo, quando outra pessoa tomou o número entre a seleção e o envio:

> **`O(s) número(s) [03] não estão disponíveis.`**

A nossa (`src/lib/actions/reserve.ts`): *"Algum dos números escolhidos acabou de ser reservado por
outra pessoa. Atualize a página e tente de novo."*

**Com 10 selecionados e 1 perdido, a nossa obriga o comprador a descobrir qual foi.** Vale copiar a
delas.

⚠️ **O que NÃO vale copiar:** depois do erro, a grade da Sorteamos **não se atualizou** — o número
tomado continuou pintado como livre e os contadores não mudaram. É defeito dela.

## Tarefas (Checklist)

- [ ] Menu de hambúrguer nas **duas** formas, com as três diferenças condicionais.
- [ ] Modal de **Login**: telefone → senha (decisão de 2026-11-19, sem SMS).
- [ ] Tela de **Cadastro** com os 14 campos, incluindo endereço e UF/Cidade dependentes.
- [ ] Separar **`requiredFields` da reserva** dos **campos do cadastro** — são dois conjuntos.
- [ ] **Modal de Checkout** entre a grade e o pagamento.
      ⚠️ **O telefone exibido aqui é pergunta em aberto depois da `D9`** — ver §4.2. Até a resposta,
      **paridade**: `(DD) 9****-****`.
- [ ] Mensagem de conflito **nomeando os números** perdidos.
- [ ] A grade **se atualiza** depois do conflito (divergir da Sorteamos, a favor do comprador).

## Critérios de Aceite

- [ ] **AC1 (o menu muda com a sessão):** deslogado mostra `Cadastro` e `Entrar`; logado mostra o
      bloco de perfil e `Sair`, e **não** mostra `Cadastro`. Teste nos dois estados.
- [ ] **AC1b (entrar funciona com telefone + senha):** o modal pede o telefone, o segundo passo
      pede a senha criada no cadastro, e a sessão nasce. Telefone inexistente e senha errada
      devolvem recusa nomeada, **sem revelar qual dos dois estava errado** — senão o modal vira um
      verificador de quem tem conta na casa.
- [ ] **AC2 (cada item do menu leva a algum lugar):** os nove itens navegam para rota existente.
      **Nenhum item inerte** — é o relato do founder, e o AC existe para que a tela não prometa o
      que não entrega.
- [ ] **AC3 (cadastro completo):** os 14 campos, com as máscaras de CPF e CEP, `Cidade` dependente
      de `UF`, e as duas validações próprias: **telefone confirmado igual ao telefone** e **senha**.
- [ ] **AC4 (cadastro e reserva pedem conjuntos diferentes):** `requiredFields` governa o formulário
      de **reserva**; o **cadastro** pede o seu próprio conjunto. Mudar `requiredFields` **não**
      altera o cadastro. É a correção do modelo, e sem ela o AC3 vira contradição com a `LTM-18`.
- [ ] **AC5 (o checkout confirma antes de reservar):** entre selecionar e reservar existe uma tela
      que mostra **quantas unidades**, **qual sorteio**, **quem está comprando** (mascarado), o
      **aceite dos termos** e permite **trocar de conta**.
- [ ] **AC6 (o conflito diz qual número):** com 3 selecionados e 1 tomado por outra pessoa, a
      mensagem **nomeia o número perdido**. Teste com concorrência real — a `LTM-05` tem o
      ferramental.
- [ ] **AC7 (a grade se atualiza no conflito):** depois do erro, o número tomado aparece **ocupado**
      sem recarga manual. **Diverge da Sorteamos de propósito** — lá o número continua pintado como
      livre, e isso faz o comprador tentar de novo no mesmo lugar.
- [ ] **AC8 (nenhum dado pessoal a mais que o necessário no HTML):** o telefone completo não aparece
      no HTML servido das telas de checkout e de pedido. Mesma regra da `LTM-14` AC5.
- [ ] **AC9 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.

## Escopo

**IN:** menu nas duas formas; modal de login (primeiro passo); tela de cadastro; separação dos dois
conjuntos de campos; modal de checkout; mensagem de conflito; atualização da grade.

**OUT:**

- **Verificação do telefone por SMS** — decisão do founder de 2026-11-19: fica para depois do
  lançamento. Registrada na `LTM-22`.
- **As páginas de destino** `Comunicados`, `Ganhadores`, `Afiliados`, `Termos`, `Suporte`,
  `Meus títulos` — esta story garante que o menu **leva** a elas; o conteúdo de cada uma é outra
  story (a de Ganhadores é a `LTM-15`).
- **Recuperação de senha** — não observada.
- **O fluxo de pagamento em si** — é a `LTM-14`, cujos sete blocos foram confirmados ao vivo.

## Dependências

- **Depende da `LTM-18`** para a separação de `requiredFields` não contradizer o trabalho de lá.
- **Conversa com a `LTM-14`** — as duas tocam a tela de pedido. Esta entrega o que vem **antes**
  (checkout); a `LTM-14`, o que vem **depois** (PIX e espera).

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/loja/[tenant]/storefront-nav.tsx            (o menu, duas formas)
  apps/lotemania/src/app/loja/[tenant]/entrar/page.tsx               (vira modal)
  apps/lotemania/src/app/loja/[tenant]/cadastrar/page.tsx            (os 14 campos)
  apps/lotemania/src/app/loja/[tenant]/cadastrar/signup-form.tsx
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/number-grid.tsx (checkout + conflito + refresh)
  apps/lotemania/src/lib/validations/signup.ts                       (novo — o conjunto do cadastro)
  apps/lotemania/src/lib/actions/signup.ts                           (endereco, UF/Cidade)
  apps/lotemania/src/lib/actions/reserve.ts                          (a mensagem de conflito)
  apps/lotemania/src/db/schema/core.ts                               (endereco em users, SE nao existir)
  apps/lotemania/drizzle/**                                          (SE houver coluna nova)
  apps/lotemania/tests/loja/cadastro/**                              (novo)

Resources:
  banco de teste    — COMPARTILHADO. Base/esquema proprio por tarefa.
  pnpm db:generate  — SO SE houver coluna nova. Conferir users antes: a tela de
                      Usuarios do painel ja mostra UF e Cidade, entao o endereco
                      pode ja existir no schema. Se existir, esta story NAO gera
                      migracao e sai da fila do _journal.json.

Depends-on: LTM-18 (separacao de requiredFields)
```

- ⛔ **Não pode compartilhar onda com `LTM-20`, `LTM-07`, `LTM-04` nem `LTM-17`** — todas tocam
  `reserve.ts`.
- ⛔ **Não pode compartilhar onda com a `LTM-14`** — a `LTM-14` reescreve a tela de pedido e esta
  mexe na grade que leva até ela; a fronteira é fina demais para arriscar.
- ⚠️ **Conferir `users` antes de planejar a onda.** Se o endereço já existir no schema, o conjunto
  encolhe e a story fica livre de migração.

## Riscos

- ~~**[Alto] O segundo passo do login exigir SMS.**~~ **ELIMINADO em 2026-11-19 por decisão do
  founder:** sem SMS até depois do lançamento (`LTM-22`). O login vira telefone + senha, e os dois
  campos já existem no produto observado.
- **[Médio] O telefone não é verificado.** Consequência direta da decisão acima: alguém pode se
  cadastrar com o telefone de outra pessoa, e o lotemania não tem como saber. **É estado declarado,
  não descuido** — e fecha com a `LTM-22`. Importa porque telefone é a chave de identidade do
  comprador neste produto: é por ele que se entra e é nele que o operador fala pelo WhatsApp.
- **[Alto] Catorze campos de cadastro afastarem o lead.** É o que a Sorteamos faz hoje e o Império
  tem 183.381 usuários, então funciona para eles — mas **copiar sem medir** é copiar a fricção
  junto. Fica registrado; a decisão de encurtar é do founder.
- **[Médio] Endereço completo é mais dado pessoal.** CEP, logradouro e número não estão hoje no
  lotemania. Entram sob a política de 2026-11-12 e o portão **G7**.
- **[Médio] Confundir os dois conjuntos de campos.** `requiredFields` é da reserva; o cadastro tem o
  seu. Fundir os dois faria mudar uma configuração de sorteio alterar o formulário de cadastro do
  site inteiro. AC4 existe por isso.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.1 | **Registrada pergunta em aberto no modal de Checkout, aberta pela decisão `D9`.** A D9 decidiu **telefone inteiro só na tela do próprio pedido**, mantendo o cartão de ganhador mascarado — e o critério dela (*quem está vendo o dado de quem*) põe **este modal do mesmo lado da tela do pedido**: dado da própria pessoa, para ela mesma, autenticada. **Mas a D9 não o nomeou, e não foi estendida por dedução.** A pergunta está escrita em §4.2 com a tabela de três colunas que a torna respondível em uma linha, e o default até a resposta é **paridade** (`(DD) 9****-****`). Registrada também a mesma incoerência da tela do pedido: o founder falou de **número**, não de **nome** — então são **duas** perguntas, não uma. **Nada de código mudou nesta edição.** | @pm (Morgan) |
| 2026-11-19 | 1.0 | Nasce de relato do founder, e **tudo foi observado ao vivo no mesmo dia** com autorização dele: menu nas duas formas, login como modal por telefone, cadastro de 14 campos com endereço completo, e o modal de Checkout que falta entre a grade e o pagamento. Dois achados mudam o modelo: o endereço obrigatório **não está** em `requiredFields` (são dois conjuntos, e o lotemania trata como um), e o cadastro cria **senha** enquanto o login pede **telefone**. | @aiox-master |
