# lotemania

Plataforma **white-label multi-tenant de sorteios**. Sucessora da Sorteamos — a
plataforma que hoje roda o Império Prêmios em `painel.rapidinhas24hr.com`.

> **Estado honesto, medido em 2026-11-16 rodando as ferramentas — não contando linhas.**
>
> O app **não compilava**: dez arquivos-fonte estavam com 0 bytes, cinco deles importados por
> código existente, incluindo a página onde o comprador escolhe o número. Consertado
> (`LTM-00`); hoje `lint`, `typecheck` e `build` saem **0**.
>
> O que ainda trava a venda: o webhook de pagamento é um `TODO`, então **ninguém nunca comprou
> nada neste sistema**. E no banco: **zero índice de performance em 33 tabelas** e **zero
> migração versionada**.
>
> Mapa completo em `docs/research/2026-11-16-lotemania-build-health.md`,
> `docs/research/2026-11-16-paysure-contrato.md` e no `EPIC-LTM-Imperio-Migration`.

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
| `pnpm lint` | ESLint — sai 0 |
| `pnpm typecheck` | `tsc --noEmit` — sai 0 |
| `pnpm db:generate` · `db:push` · `db:studio` | Drizzle Kit |
| `pnpm db:seed` | semeia tenant e admin a partir das `SEED_*` |

**Não há `test`.** São 187 arquivos e 14.462 linhas sem um único teste — o primeiro item
de dívida, e crítico porque vamos mexer em propriedade de cota e rateio de prêmio. É a
story `LTM-05`.

> **Nota de método, porque este README errou duas vezes.** A primeira medição contou os
> `page.tsx` e disse "três páginas vazias". A segunda contou a pasta inteira e "corrigiu"
> para "só `social`". **A primeira estava certa** — `analytics`, `social` e `utm-links`
> tinham `page.tsx` de 0 bytes; a segunda viu um `analytics-chart.tsx` de 20 linhas ao lado
> da rota vazia e concluiu errado.
>
> A lição não é qual unidade contar. É que nenhuma contagem de linha responde *"isto
> funciona?"*. Trinta segundos de `tsc --noEmit` responderam o que três rodadas de `wc -l`
> não responderam — e a resposta foi pior que qualquer estimativa: o app não compilava.
>
> Daí o `typecheck` existir no `package.json` agora. **Script ausente não é verificação que
> passa.**

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
| Índices | **zero de performance em 33 tabelas.** Todo índice declarado é `uniqueIndex`, isto é, restrição de integridade. O comentário em `product_numbers` afirma um índice que não existe |
| Migrações versionadas | **zero** — a pasta `drizzle/` não existe; só `db:push` contra banco ao vivo, sem histórico e sem volta |
| Driver `neon-http` não faz transação | por isso há zero transações no código |
| Webhook de pagamento | para num `TODO` no lugar de fechar o pedido. E a verificação HMAC que ele faz **não serve para a Paysure, que não assina webhook nenhum** — ver `docs/research/2026-11-16-paysure-contrato.md` |
| Gateway de produção | **`paysure` não existe em nenhuma das duas listas** (`pgEnum` e `PAYMENT_GATEWAY_PROVIDERS`), e o modelo de credencial guarda **um** campo onde a Paysure exige dois (`ci` + `cs`) |
| Atribuição por pedido | **nada** — sem `fbc`, `fbp`, `gclid`, `ttclid`, `utm`. O export da Sorteamos tem todos |
| API de leitura para o nosso ETL | não existe |
| Paridade de telas | `analytics`, `social` e `utm-links` têm placeholder honesto; construir de verdade é Frente B, **despriorizada** |
| Testes | zero |

## Volume que precisa aguentar

Medido no BI do Império, **janela móvel de 7 dias — snapshot de 2026-11-16**. Os agregados andam a cada refresh; os estruturais (100 números por rodada, mediana de esgotamento) não.

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
