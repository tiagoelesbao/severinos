# LTM-11: O menu de 13 ações do sorteio

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade)
**Prioridade:** **P1**
**Complexidade:** XL — candidata a divisão na validação do @po
**Criada por:** @aiox-master · 2026-11-17
**Evidência:** `docs/research/2026-11-17-painel-acoes-por-sorteio.md`

## Story

**Como** operador do Império
**Eu quero** as mesmas treze ações que tenho hoje na Sorteamos, no mesmo lugar
**Para que** migrar não signifique perder ferramenta de trabalho.

## Contexto

O menu vive na **Lista de Compras** (`/dashboard/invoice/{productId}/orders`), não na lista de sorteios — eram dois menus diferentes e a baseline procurava no lugar errado. O lotemania **não tem menu nenhum** ali.

| # | Item | Natureza | Observado? |
|---|---|---|---|
| 1 | Editar | navega para o editor | sim |
| 2 | Dashboard | navega — é a **`LTM-12`** | sim |
| 3 | Top 10 diário | **modal** com seletor de data + ranking | sim |
| 4 | Porcentagem | `[CONFIRMAR]` | não |
| 5 | Horário Premiado | `[CONFIRMAR]` | não |
| 6 | Menor ou maior | `[CONFIRMAR]` | não |
| 7 | Vendas por dia | `[CONFIRMAR]` | não |
| 8 | Relatório de Vendas | baixa CSV — é a **`LTM-13`** | sim |
| 9 | Relatório de Expirados | baixa CSV — `LTM-13` | formato conhecido |
| 10 | Relatório de Participantes | baixa PDF — `LTM-13` | formato conhecido |
| 11 | ⛔ Ativar títulos premiados | **muta** | **não executado** |
| 12 | Faturamento | `[CONFIRMAR]` | não |
| 13 | ⛔ Revisar pagamentos | **muta** — reprocessa expiradas | **não executado** |

**Top 10 diário**, o único modal observado: seletor de data e tabela `Participante | Compras | Números | Total R$`, de 1º a 10º.

## Tarefas (Checklist)

- [ ] O menu em si, com os 13 rótulos e subtítulos exatos.
- [ ] Itens 1 e 2 — navegação.
- [ ] Item 3 — modal Top 10 diário com seletor de data.
- [ ] **Observar** 4, 5, 6, 7 e 12 antes de implementar. São `[CONFIRMAR]`.
- [ ] **Observar 11 e 13 num sorteio CONCLUÍDO.** São mutantes; não foram executados de propósito.
- [ ] Itens 8, 9, 10 — delegados à `LTM-13`.

## Critérios de Aceite

- [ ] **AC1 (os 13, com os rótulos certos):** o menu traz os treze itens, na ordem, com título e subtítulo idênticos aos da Sorteamos.
- [ ] **AC2 (Top 10 diário):** o modal ranqueia por total no dia escolhido, trocar a data troca o conteúdo, e a soma dos dez primeiros bate com a consulta direta ao banco.
- [ ] **AC3 (nada implementado por dedução):** nenhum item marcado `[CONFIRMAR]` chega a `Done` sem registro da observação que o definiu. Observação vai no Dev Record.
- [ ] **AC4 (as duas ações mutantes avisam antes):** "Ativar títulos premiados" e "Revisar pagamentos" pedem confirmação que **diz o que vai mudar e em quantos registros**, e gravam autor e horário.
- [ ] **AC5 (nenhuma ação mutante em sorteio ativo sem segunda confirmação):** sorteio `active` exige confirmação adicional nomeando o sorteio. É a regra que o founder aplicou à exploração, e ela vale igual no produto.

## Escopo

**IN:** o menu, os itens 1-3, e a observação dirigida dos demais.
**OUT:** os exports (`LTM-13`); o dashboard por sorteio (`LTM-12`); implementar qualquer `[CONFIRMAR]` sem observação.

## Riscos

- **[Alto] Implementar "Revisar pagamentos" por dedução.** O subtítulo diz *"reprocessar todas compras expiradas"* — se isso reabrir pedidos ou recobrar, errar mexe em dinheiro. Só com observação.
- **[Médio] Menu grande vira depósito.** Treze itens numa lista é muito; se algum não for usado pelo Império, vale confirmar com o founder antes de construir.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce da observação com o founder; seis itens ficam `[CONFIRMAR]` e dois não foram executados por serem mutantes. | @aiox-master |
