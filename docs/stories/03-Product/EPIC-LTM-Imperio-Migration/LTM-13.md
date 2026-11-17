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

## Riscos

- **[Alto] Vazar o CSV.** Sete colunas de dado pessoal, incluindo CPF. AC6 é o mínimo; a política
  de 2026-11-12 vale integralmente.
- **[Alto] `Aprovado por` preenchido por dedução** seria registro falso de quem aprovou um
  pagamento. AC7 existe só por isso.
- **[Médio] PDF de Participantes sem layout medido.** O formato veio de um arquivo que o founder
  enviou; a **aparência** não foi comparada campo a campo.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce da medição do CSV baixado com autorização do founder. | @aiox-master |
