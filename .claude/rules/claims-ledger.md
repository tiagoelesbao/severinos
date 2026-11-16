# Claims Ledger — o que pode ser afirmado

## Por que esta regra existe

Nós já fomos mordidos por isto. Está registrado: o pipeline de copy entregava OCR cru, o LLM
preenchia o buraco com estatística inventada, e o `quality_gate` reinjetava o texto fabricado. O
estrago não aparece no log — aparece num anúncio no ar, numa DM para um lojista, numa proposta que
depois não se sustenta.

A regra abaixo é a resposta: **separar o que é prova do que é desejo, e deixar só a prova sair.**
Ela é destilada do blueprint de outbound de Matheus Gomes
([buscandomilhao](https://github.com/soumatheusgomes/buscandomilhao)), onde o mecanismo é o par
`VERIFIED_CLAIMS` / `UNVERIFIED_CLAIMS`.

## Quando se aplica

Sempre que texto gerado por um agente vai sair daqui e chegar a um terceiro:

- anúncio, criativo, legenda, carrossel, thumb, VSL, roteiro
- DM, e-mail, mensagem de WhatsApp, script de prospecção
- proposta comercial, oferta, página de vendas, landing page
- post de rede social em nome de qualquer negócio nosso ou de cliente

**Não** se aplica a artefato interno (story, ADR, POP, nota de pesquisa, handoff) — lá a hipótese
marcada como hipótese é informação legítima e útil.

## O ledger

Cada negócio tem duas listas, e elas são a **única** autoridade sobre o que pode ser afirmado:

```
workspaces/businesses/{negócio}/claims.yaml
```

```yaml
verified:
  - claim: "<a afirmação, na forma exata em que pode ir ao ar>"
    evidence: "<onde está a prova: URL, print, nota fiscal, relatório, dashboard>"
    checked: 2026-11-08        # data da última conferência
unverified:
  - claim: "<a afirmação que queremos poder fazer>"
    missing: "<que prova falta para ela virar verified>"
```

Se o arquivo não existe para o negócio em questão, **ele não tem claims verificados** — e nada
que pareça um número, um resultado ou uma comparação pode sair. Criar o arquivo é trabalho de
quem é dono do negócio, não do agente.

## As quatro travas

### 1. Só `verified` sai

Um agente pode afirmar o que está em `verified`, na forma registrada. Nada de `unverified` sai —
**sem exceção e sem paráfrase**. Reescrever "triplicamos o faturamento" como "crescimento
expressivo de faturamento" é a mesma alegação com roupa nova: continua bloqueada.

### 2. Nunca inventar as cinco categorias

Mesmo sem ledger, mesmo em rascunho: nunca invente **número**, **prazo**, **garantia**,
**depoimento** ou **superlativo** ("o maior", "o único", "o melhor do Brasil"). Se o material
precisa de um deles e não existe prova, o lugar certo é um marcador — `[PREENCHER]` em proposta,
`[CONFIRMAR]` em POP, `[hipótese]` em oferta — não um valor plausível.

### 3. Escassez e urgência só se forem verdade

"Últimas vagas", "só hoje", "fecha à meia-noite": só se existir o limite de fato e o dono tiver
dito. Urgência falsa é prática enganosa, e isso tem nome no Código de Defesa do Consumidor.

### 4. Pedido de parar é definitivo

Em prospecção: quem pede para parar entra em não-contato **permanente**. Sem follow-up, sem
reentrada por outra campanha, por nenhum canal. O registro vive junto do pipeline (ClickUp ou
banco do sistema de outbound), não na cabeça de quem está operando.

## Como o agente se comporta

Ao gerar material público, o agente:

1. Lê `claims.yaml` do negócio **antes** de escrever.
2. Escreve usando só o que está em `verified`.
3. Quando a peça pede uma alegação que não existe no ledger, **diz isso em uma linha** e entrega a
   peça com o marcador no lugar — não entrega a peça silenciosamente mais fraca, e não entrega com
   o número inventado.
4. Quando a pessoa fornece a prova na conversa, propõe a entrada nova no `verified` com a evidência
   e a data — e só então usa.

## O que isto não faz

Não decide direito de imagem, licença de música, uso de voz ou direito autoral de material de
terceiro — **essa decisão é do founder**, conforme já registrado. O ledger cuida de **fidelidade
factual**: se o que afirmamos é verdade. Não cuida de se temos permissão para usar um ativo.

## Relação com outras regras

| Regra | Relação |
|---|---|
| `.claude/skills/oferta-5p` | Marca estimativa e hipótese no Mapa da oferta; o ledger decide o que sai dali para material público |
| `.claude/skills/proposta-comercial` | `[PREENCHER]` é o marcador dela; o ledger é a razão de ele existir |
| `.claude/skills/manual-de-processo` | `[CONFIRMAR]` segue a mesma lógica, aplicada a passo de processo |
| Constitution, Artigo IV (No Invention) | O ledger é o Artigo IV aplicado a material comercial, não a código |
| `docs/architecture/outbound-autonomo-blueprint.md` | Onde o ledger vira campo de banco e gate de envio num sistema autônomo |
