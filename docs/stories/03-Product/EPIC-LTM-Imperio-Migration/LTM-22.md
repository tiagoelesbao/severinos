# LTM-22: Verificação do telefone por SMS

**Status:** Draft — **PÓS-LANÇAMENTO**
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade Total)
**Prioridade:** **P3 — fora do caminho crítico, por decisão do founder**
**Complexidade:** M (a tela) + **contrato com fornecedor** (a parte que não é código)
**Criada por:** @aiox-master · 2026-11-19, a pedido do founder
**Origem:** desmembrada da `LTM-21`

## Por que esta story existe separada

Ao mapear o login da Sorteamos (`LTM-21` §2), apareceu que a verificação lá é por **código SMS** —
a plataforma integra **LIGUELEAD** e **PAPOSMS**, as duas descritas como *"autenticação de consulta
de números via código SMS"*.

Isso era o maior risco de prazo da `LTM-21`, porque **não é tela: é contrato.** Exige fornecedor,
custo por mensagem, cadastro de remetente e, em regime, monitoramento de entrega.

**Decisão do founder, 2026-11-19:**

> *"confirmação de sms não vamos precisar implementar por enquanto, registre como feature futura
> após lançamento essa confirmação por SMS"*

**Esta story é esse registro.** Ela não entra no sorteio de teste nem no corte.

## Story

**Como** operador do Império
**Eu quero** que o telefone de quem se cadastra seja comprovadamente dele
**Para que** o número que eu uso para falar com o comprador e para identificá-lo seja confiável.

## O buraco que fica aberto até lá — declarado, não escondido

Sem verificação, **o telefone não é comprovado**. Alguém pode se cadastrar com o número de outra
pessoa, e o lotemania não tem como saber.

**Por que isso importa mais neste produto do que na média:** o telefone **é a identidade do
comprador** aqui. É por ele que se entra (`LTM-21`: login é telefone + senha), é por ele que o
operador fala no WhatsApp, e é ele que aparece mascarado no título e no cartão de ganhador.

**Três consequências concretas, enquanto esta story não existir:**

| | |
|---|---|
| **Suporte** | o operador liga para um número que pode não ser do comprador |
| **Ganhador** | o contato do ganhador pode estar errado **no momento em que mais importa** |
| **Anti-spam** | o bloqueio por reservas abandonadas é por conta; cadastrar outra com outro telefone contorna |

> **Nenhuma dessas é impeditiva para o sorteio de teste**, e é por isso que a decisão do founder é
> defensável. Mas as três são reais, e ficam escritas aqui para a decisão continuar sendo decisão —
> não virar esquecimento.

## Escopo

**IN (quando esta story for retomada):**

- Escolha do fornecedor de SMS e o contrato (custo por mensagem, remetente, cobertura).
- Envio do código no cadastro e na mudança de telefone.
- Tela de digitação do código, com reenvio e expiração.
- Limite de tentativas e de reenvios — **sem isso o envio de SMS vira vetor de custo**: cada clique
  de um robô é dinheiro saindo.
- Estado `telefone verificado` no comprador, e o que muda quando ele é falso.

**OUT:**

- **Trocar o login para SMS.** A `LTM-21` entrega telefone + senha; esta acrescenta **verificação**,
  não substitui autenticação. Se um dia o login virar por código, é outra decisão.
- **Verificação de e-mail.** Mesma família, outra escolha, outro custo.
- **2FA do operador** — a Sorteamos tem (`painel-telas.md` §1) e é outra story.

## Critérios de Aceite (esboço — a detalhar quando sair do gelo)

- [ ] **AC1:** cadastro novo recebe código e só conclui com o código certo.
- [ ] **AC2:** código **expira**, e o expirado é recusado com motivo nomeado.
- [ ] **AC3:** há **teto de reenvio e de tentativas** por telefone e por IP. É o AC que impede a
      feature de virar conta de telefonia.
- [ ] **AC4:** falha do fornecedor **não derruba o cadastro em silêncio** — o comprador vê o que
      aconteceu e o operador tem registro. É a lição da `OPS-01` aplicada aqui.
- [ ] **AC5:** trocar o telefone de uma conta existente **exige verificar o novo**.
- [ ] **AC6:** o código **não** aparece em log, nem em resposta de API, nem em analytics.

## Dependências

- **Depende da `LTM-21`** — é ela que cria cadastro e login; esta acrescenta uma camada.
- **Depende de decisão comercial** — fornecedor e custo. **Não é engenharia**, e é o que de fato
  bloqueia.

## Riscos

- **[Alto] Custo por mensagem sem teto.** Sem limite de reenvio, um robô transforma a feature em
  despesa. AC3 existe por isso, e **precisa estar no desenho desde o primeiro dia**, não depois.
- **[Médio] Entrega de SMS não é garantida.** Operadora atrasa, filtra, não entrega. Precisa de
  caminho alternativo (ligação, WhatsApp) ou de suporte humano — senão o comprador fica trancado
  fora da própria conta.
- **[Médio] Base existente sem verificação.** No dia em que isto entrar, os compradores já
  cadastrados estarão todos não verificados. **Exigir verificação retroativa trancaria a base
  inteira para fora.** A migração desse estado é parte da story, não detalhe.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.0 | Criada a pedido do founder, que decidiu **não implementar SMS antes do lançamento**. Desmembrada da `LTM-21`, onde era o maior risco de prazo — por não ser tela, e sim contrato com fornecedor. Fica registrado o que permanece aberto até ela: o telefone não é comprovado, e **o telefone é a identidade do comprador neste produto**. | @aiox-master |
