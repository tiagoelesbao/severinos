# LTM-13: Os três exports por sorteio

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade)
**Prioridade:** **P1** — é o que o cliente usa para pagar ganhador e conferir caixa
**Complexidade:** M
**Criada por:** @aiox-master · 2026-11-17
**Evidência:** `docs/research/2026-11-17-painel-acoes-por-sorteio.md` §3

## Story

**Como** Império fechando uma rodada
**Eu quero** baixar os mesmos três arquivos que baixo hoje
**Para que** minha rotina de conferência e de pagamento não mude por causa da migração.

## Contexto

Os três baixam **direto, sem modal**. O de Vendas foi medido no arquivo baixado em 2026-11-17:

```
nome:       relatorio-vendas-{slug-do-sorteio}.csv
separador:  ;   (ponto e virgula)
BOM:        nao tem
colunas:    25
```

```
Id do Sorteio;Título do Sorteio;Id da Compra;Quantidade;Status;Valor;Nome;Telefone;
País;E-mail;CPF;Nome Social;Data de Nascimento;Data da Compra;Id do Pagamento;
Host do Pagamento;Aprovado por;Código do Afiliado;Origem do Tráfego;
Conteúdo do Tráfego;Campaign;Term;fbc;fbp;Números
```

| Relatório | Formato | Conteúdo |
|---|---|---|
| Vendas | CSV | somente pagos |
| Expirados | CSV | somente expirados |
| Participantes | **PDF** | somente pagos |

### Dois problemas que o contrato expõe

**`Aprovado por` não tem origem no lotemania.** Já apontado pelo @po; agora confirmado como
**coluna do arquivo que o cliente usa**, não detalhe interno. Sem registrar quem aprovou uma baixa
manual, a coluna sai vazia e a conferência perde rastro.

**Sete das 25 colunas são dado pessoal** — Nome, Telefone, País, E-mail, CPF, Nome Social, Data de
Nascimento. **O export é, por desenho, um arquivo de dado pessoal.**

### Correção de premissa — 2026-11-18, conferida no código

A v1.0 listava *"Rota de export por sorteio e por tipo"* como se não houvesse nada. **Há** — e o que
existe é mais perigoso que o vazio, porque tem os mesmos nomes e entrega outra coisa.

`src/lib/actions/reports.ts` já implementa `relatorio_vendas`, `relatorio_expirados` e
`relatorio_participantes`. Quatro divergências concretas com o arquivo que o cliente usa:

| | Hoje (`reports.ts`) | O que o cliente usa |
|---|---|---|
| Colunas de Vendas | **4** — `Sorteio`, `Data`, `Quantidade`, `Valor` (`:67`) | **25** |
| Formato de saída | `{ columns, rows }` para a tela (`src/app/dashboard/reports/reports-form.tsx`) | **arquivo** CSV baixado, `;`, sem BOM |
| Recorte | por **intervalo de datas**, sorteio opcional (`:15-19`) | por **sorteio**, sem data |
| Participantes | tabela de agregados, e a coluna "Participante" é **`userId.slice(0, 8)`** (`:105`) — um pedaço de UUID | **PDF**, uma linha por participante |

**O que isso muda:**

1. **Não é "criar o export", é "o export existente tem o nome certo e o conteúdo errado".** Um
   operador do Império que clicar em "Relatório de Vendas" hoje recebe um arquivo com 4 das 25
   colunas e acha que migrou. O risco não é ausência, é **falsa paridade**.
2. **O recorte é incompatível.** O da Sorteamos é por sorteio e baixa direto, sem modal. O nosso
   exige intervalo de datas numa tela própria (`/dashboard/reports`). São dois produtos diferentes
   com o mesmo rótulo, e esta story tem de decidir se substitui ou se convive — **decisão para o
   @po**, registrada aqui e não resolvida por conta própria.
3. **`userId.slice(0, 8)` como "Participante" é um achado por si.** Não é nome, não é identificador
   estável para o cliente, e não serve para pagar ninguém.
4. **Já existe um caminho de CSV nesta base** para reusar em vez de inventar:
   `src/app/dashboard/users/export-users-button.tsx:24` monta `Blob` com
   `text/csv;charset=utf-8;`. ⚠️ **Note o `charset=utf-8` sem BOM** — e o AC5 desta story diz que a
   Sorteamos **não** manda BOM. Conferir se esse caminho existente abre certo no Excel pt-BR **antes**
   de copiá-lo é parte do trabalho, não detalhe.

## Tarefas (Checklist)

- [ ] Rota de export por sorteio e por tipo.
- [ ] CSV de Vendas nas 25 colunas, `;`, sem BOM, mesmo nome de arquivo.
- [ ] CSV de Expirados.
- [ ] PDF de Participantes.
- [ ] Origem para `Aprovado por` — **depende da `LTM-10`** registrar quem aprovou.
- [ ] Política de retenção e de acesso do arquivo gerado.

## Critérios de Aceite

- [ ] **AC1 (byte a byte no cabeçalho):** a primeira linha do CSV de Vendas é **idêntica** à da
      Sorteamos — 25 colunas, `;`, sem BOM, mesma ordem, mesma grafia com acento. Teste compara
      com a string literal.
- [ ] **AC2 (uma linha por compra paga):** contagem de linhas = contagem de compras pagas do
      sorteio. Nem cabeçalho a mais, nem linha vazia no fim.
- [ ] **AC3 (o separador sobrevive ao conteúdo):** título de sorteio **com ponto e vírgula** não
      quebra o arquivo. Teste com um título que contém `;`, aspas e quebra de linha.
- [ ] **AC4 (nome do arquivo):** `relatorio-vendas-{slug}.csv`, com o slug do sorteio.
- [ ] **AC5 (acento sobrevive):** nomes com acento abrem corretos no Excel em pt-BR. **Sem BOM** é
      o que a Sorteamos faz — se isso quebrar no Excel do cliente, a decisão de divergir é do
      founder e fica registrada aqui, não resolvida por conta própria.
- [ ] **AC6 (G7 — o arquivo é dado pessoal):** a rota exige autenticação e escopo de tenant; o
      arquivo **não** é gravado em disco público nem em temporário sem expurgo; o download não vai
      para log com os dados. Teste prova que outro tenant não baixa.
- [ ] **AC7 (`Aprovado por` preenchido ou vazio, nunca inventado):** se a origem não existir, a
      coluna sai **vazia** — nunca com o usuário logado no momento do export, que seria registro
      falso de quem aprovou um pagamento.

## Escopo

**IN:** os três exports com os contratos acima; autenticação e escopo; retenção.
**OUT:** os relatórios da barra lateral (`sales_by_day`, `top10_buyers`, `top10_regions`) — outra
tela, outra story; export agendado; envio por e-mail.

## Dependências

- ⚠️ **O AC7 depende da `LTM-16`.** `Aprovado por` não tem origem: não existe coluna `approved_by`
  em `orders` nem trilha de ação de operador em nenhuma das 34 tabelas (conferido em 2026-11-18; a contagem "22" da v1.1 estava errada e foi corrigida pelo @po).
  A `LTM-16` entrega a trilha e a leitura por pedido. **Sem ela a coluna sai vazia** — o que o AC7
  permite, e é melhor que inventada, mas não é paridade.
- **Depende da `LTM-10`** para existir a ação de aprovação que gera o registro.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/api/reports/[productId]/[type]/route.ts   (novo — baixa direto, sem modal)
  apps/lotemania/src/lib/reports/vendas-csv.ts                     (novo — as 25 colunas, ";", sem BOM)
  apps/lotemania/src/lib/reports/expirados-csv.ts                  (novo)
  apps/lotemania/src/lib/reports/participantes-pdf.ts              (novo)
  apps/lotemania/src/lib/actions/reports.ts                        (DECISAO do @po: substituir ou conviver)
  apps/lotemania/tests/reports/**                                  (novo)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — a coluna "Aprovado por" vem da LTM-16, nao daqui
  geracao de PDF    — se entrar dependencia nova de PDF, ela toca package.json e pnpm-lock.yaml:
                      RECURSO COMPARTILHADO com qualquer story que instale pacote. Serializar.

Depends-on: LTM-10 (a acao de aprovar), LTM-16 (AC7)
```

- ⚠️ **`src/lib/actions/reports.ts` está no conjunto porque a decisão do @po pode mandar editá-lo.**
  Se a decisão for *conviver*, o arquivo sai do conjunto e esta story fica só com arquivos novos —
  o que a libera para quase qualquer onda. Enquanto a decisão não existir, o conjunto é o de cima e
  **esta story não compartilha onda com nada que toque `reports.ts`** (hoje: a tela
  `/dashboard/reports`).
- ⚠️ **A dependência de PDF é a armadilha de onda desta story.** Instalar pacote escreve
  `package.json` e `pnpm-lock.yaml`, que são recurso único do app inteiro. Se a geração de PDF
  exigir biblioteca nova, **a instalação é passo serializado**, declarado antes do despacho — não
  algo que um implementador faz no meio da onda.
- ✅ **Pode compartilhar onda com a `LTM-14` e a `LTM-15`** — conjuntos disjuntos (loja), nenhuma
  gera migração.

## Riscos

- **[Alto] Falsa paridade do que já existe.** Hoje "Relatório de Vendas" entrega 4 das 25 colunas
  com o rótulo certo. Um operador conclui que migrou. É o risco mais provável desta story e **não
  era conhecido na v1.0** — ver a correção de premissa.
- **[Alto] Vazar o CSV.** Sete colunas de dado pessoal, incluindo CPF. AC6 é o mínimo; a política
  de 2026-11-12 vale integralmente.
- **[Alto] `Aprovado por` preenchido por dedução** seria registro falso de quem aprovou um
  pagamento. AC7 existe só por isso.
- **[Médio] PDF de Participantes sem layout medido.** O formato veio de um arquivo que o founder
  enviou; a **aparência** não foi comparada campo a campo.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.1 | Acrescenta o bloco `Files:` e **corrige a premissa**: `src/lib/actions/reports.ts` JA implementa os tres relatorios, com 4 colunas em vez de 25, saida de tela em vez de arquivo e recorte por data em vez de por sorteio. O risco passa a ser **falsa paridade**, nao ausencia. O AC7 depende da `LTM-16`. Registra a armadilha de onda da dependencia de PDF (`pnpm-lock.yaml`). | @aiox-master |
| 2026-11-17 | 1.0 | Nasce da medição do CSV baixado com autorização do founder. | @aiox-master |
