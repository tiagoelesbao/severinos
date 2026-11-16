# lotemania

Plataforma **white-label multi-tenant de sorteios**. Sucessora da Sorteamos — a
plataforma que hoje roda o Império Prêmios em `painel.rapidinhas24hr.com`.

> **Estado honesto, medido em 2026-11-16 e corrigido na baseline:** o esqueleto e o schema
> estão certos; a profundidade varia muito por tela. **Uma** página do dashboard é vazia de
> fato (`social`), `analytics` tem 20 linhas e o resto tem corpo. O que de fato trava é
> outra coisa: o webhook de pagamento é um `TODO`, então **ninguém nunca comprou nada neste
> sistema**. Mapa completo em `docs/research/2026-11-16-baseline-sorteamos/` e no
> `EPIC-LTM-Imperio-Migration`.

## Stack

Next.js 16.4 (App Router) · React 19.3 · TypeScript · Drizzle ORM sobre Neon Postgres ·
zod · Tailwind · **pnpm** (deliberado — ver abaixo).

### Por que pnpm e não npm como os outros apps

Não existe workspace npm de verdade no severinos: cada app tem `package.json` e
`node_modules` próprios. Não há nada para compartilhar, então "alinhar" seria alinhar com
nada. pnpm resolve estrito — quebra no build quando um import não foi declarado, que é o
bug que com npm só aparece em produção.

## Rodar

```bash
pnpm install
cp .env.example .env.local   # e preencha
pnpm db:push                 # aplica o schema
pnpm db:seed                 # cria o primeiro tenant e o admin
pnpm dev
```

| Comando | O que faz |
|---|---|
| `pnpm dev` · `build` · `start` | ciclo normal do Next |
| `pnpm lint` | ESLint |
| `pnpm db:generate` · `db:push` · `db:studio` | Drizzle Kit |
| `pnpm db:seed` | semeia tenant e admin a partir das `SEED_*` |

**Não há `test` nem `typecheck`.** São 187 arquivos e 14.462 linhas sem um único teste —
o primeiro item de dívida, e crítico porque vamos mexer em propriedade de cota e rateio
de prêmio. É a story `LTM-05`.

> Nota de método: a primeira medição deste README contou só os `page.tsx` de cada pasta e
> generalizou a partir disso — daí "três páginas vazias" e "reports com 22 linhas", ambos
> errados. A baseline corrigiu contando a pasta inteira. Medir o arquivo de entrada e
> concluir sobre a feature é o erro; a tela mora na pasta.

## Estrutura

```
src/
├── app/
│   ├── api/            auth (login, logout, refresh) + webhook de pagamento
│   │                   por tenant e por provedor
│   ├── dashboard/      27 páginas — o painel do operador
│   ├── loja/[tenant]/  a loja pública, por tenant
│   └── login/
├── db/schema/          8 arquivos, 817 linhas: tenants, core, raffles,
│                       payments, affiliates, integrations, settings
├── lib/
│   ├── actions/        18 server actions — checkout, reserve, products, ...
│   ├── auth/
│   └── validations/    schemas zod
├── components/ui/
└── hooks/
```

### O domínio, em uma passada

Um **sorteio** é um `product` com `totalNumbers` e `pricePerNumber`. Cada número
vendável é uma linha em `product_numbers` com status `available | reserved | sold`. A
reserva é um `UPDATE ... WHERE status = 'available'` condicional — atômico **porque** cabe
exatamente um dono por linha. Reserva dura 15 minutos; três reservas não pagas seguidas
bloqueiam o comprador por 30.

No vocabulário do cliente, um número chama **título**.

## O que falta para substituir a Sorteamos

Resumo; o detalhe vive no epic.

| Frente | Situação |
|---|---|
| `product_numbers` sem índice nenhum | o comentário no schema diz que existe; não existe |
| Driver `neon-http` não faz transação | por isso há zero transações no código |
| Webhook de pagamento | valida HMAC corretamente, depois tem um `TODO` no lugar de fechar o pedido |
| Atribuição por pedido | **nada** — sem `fbc`, `fbp`, `gclid`, `ttclid`, `utm`. O export da Sorteamos tem todos |
| API de leitura para o nosso ETL | não existe |
| Paridade de telas | `social` vazia; `analytics` com 20 linhas. `reports` tem 149 linhas e 5 tipos — a Sorteamos tem 5 relatórios, não 3 |
| Gateway de produção fora do enum | **`paysure`** é o provedor real em produção e não está no enum de `payment_gateways`; `pay2m` está |
| Testes | zero |

## Volume que precisa aguentar

Medido no BI do Império, últimos 7 dias:

- **177 rodadas**, 174 esgotadas · **100 números cada**
- Esgotamento típico em **1,8 h**; a mais rápida em **18 min** (~5,5 números/minuto)
- **10.550 pedidos pagos** · R$ 639.325 · ticket médio R$ 61
- **5 rodadas ativas simultâneas**, sorteando no mesmo horário

O gargalo não é volume de dados (≈900 mil linhas/ano, trivial para Postgres **com
índice**) — é **contenção**: cem números finitos esgotando em minutos, com ~R$ 90 mil/dia
atravessando o fluxo.

## Licença e origem

Projeto próprio. A Sorteamos, da qual este é sucessor, também — não há material de
terceiro aqui.
