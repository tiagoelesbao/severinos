import { z } from "zod";

// ════════════════════════════════════════════════════════════════════════
// O PEDIDO DEIXOU DE SER UMA LISTA DE NÚMEROS (LTM-02, AC9)
//
// Era `numbers: z.array(z.number())`. Uma lista de inteiros não consegue
// dizer QUAL metade do 42 se quer — e endereçar a metade é a diferença
// entre vender uma meia cota e tirar o título inteiro do estoque cobrando
// metade (ADR-0001). O contrato passa a carregar a UNIDADE VENDÁVEL.
//
//   { number: 42, half: null }  o TÍTULO inteiro — todas as unidades do 42.
//                               Em sorteio de cota inteira é a única linha
//                               que existe; em sorteio divisível são as
//                               duas metades, tomadas juntas ou nenhuma.
//   { number: 42, half: 1 }     UMA metade, nomeada. A outra metade do 42
//                               continua à venda.
//
// `half: null` não é "não sei": é "o título todo", e é o que faz a grade de
// hoje continuar correta sem precisar saber se o sorteio é divisível. Quem
// escolhe metade avulsa na tela é a LTM-08.
// ════════════════════════════════════════════════════════════════════════

/** Metades por título num sorteio divisível (ADR-0001: duas, nunca outra). */
export const HALVES_PER_DIVISIBLE_TITLE = 2;

// ════════════════════════════════════════════════════════════════════════
// A JANELA DA RESERVA É UMA FUNÇÃO DO SORTEIO, NÃO UM NÚMERO DO MÓDULO
//
// Duas decisões empilhadas aqui, e as duas têm razão própria.
//
// ── 1. POR QUE FUNÇÃO, E NÃO CONSTANTE LIDA DE FORA (ajuste do founder,
//       2026-11-18)
//
// A janela vai virar CONFIGURAÇÃO POR SORTEIO, escolhida pelo operador na
// edição do sorteio. Isso é a `LTM-17`, e não é implementado aqui:
// `reservationMinutesFor` hoje IGNORA o argumento e devolve o padrão.
//
// ⚠️ E O CAMPO JÁ EXISTE. Conferido no código em 2026-11-18:
//
//   `productAdvancedSettingsSchema` → `reservationExpiryMinutes`
//        `src/lib/validations/product-settings.ts:24`
//        `z.coerce.number().int().positive().default(15)`, seção "Títulos"
//   o seletor "Tempo para uma reserva pendente expirar"
//        `src/app/dashboard/products/[id]/advanced-settings-tabs.tsx:413-430`
//        cinco opções: 10, 15, 30, 60 e 120 minutos
//   onde o valor mora
//        `products.advanced_settings` (jsonb, `src/db/schema/raffles.ts:82`)
//
// E NADA LÊ O VALOR. O operador escolhe 30 minutos e a reserva continua
// durando 15, porque `actions/reserve.ts` usava o número cravado. É a
// terceira ocorrência do mesmo padrão nesta base — campo configurável na
// tela, ignorado pelo código —, junto com `showQrCodeByDefault` e
// `paymentGatewayProvider`.
//
// O que a LTM-17 faz, concretamente: esta função passa a ler
// `reservationExpiryMinutes` do sorteio **através de
// `productAdvancedSettingsSchema.parse(product.advancedSettings)`**, NUNCA
// por acesso cru ao jsonb. A razão é de dado, não de estilo: sorteio antigo
// tem `advanced_settings = {}`, e é o `.default(15)` do zod que entrega o
// valor — acesso cru devolveria `undefined` e a reserva nasceria sem prazo.
//
// Os cinco valores da tela cabem no contrato da Paysure sem guarda extra:
// `expiration_seconds` aceita 60 a 86 400 (§4.1), e a lista vai de 600 a
// 7 200 segundos. A rede de segurança de faixa em `paysure-client.ts` fica
// de qualquer modo, porque ela protege do valor que ninguém previu.
//
// O argumento existe de propósito, vazio. `expiration_seconds` da cobrança
// PIX depende de QUAL sorteio é o pedido, não de um número do módulo — e se
// o valor saísse de uma constante lida direto em cada ponto de uso, a
// LTM-17 viraria refatoração de todos os chamadores. Saindo de uma função
// que já recebe o sorteio, ela vira uma linha DENTRO da função.
//
// Por isso `RESERVATION_MINUTES_DEFAULT` NÃO é exportado: ele é o padrão
// interno da função, e ler o padrão de fora é justamente o acoplamento que
// este desenho evita.
//
// ── 2. POR QUE ISTO NÃO MORA EM `src/lib/actions/reserve.ts`
//
// A tarefa da LTM-03b pedia a fonte em `actions/reserve.ts`. **Não é
// possível**, e a verificação é de `pnpm build`, não de leitura: aquele
// arquivo começa com `"use server"`, e num arquivo `"use server"` o Next só
// admite exportação de FUNÇÃO ASSÍNCRONA. Qualquer outra exportação — uma
// constante, uma função síncrona — faz o módulo inteiro perder TODAS as
// exportações no grafo do cliente/SSR, e o build morre com
//
//     The export reserveSelectedNumbers was not found in module
//     [project]/src/lib/actions/reserve.ts [app-client] (ecmascript).
//     The module has no exports at all.
//
// medido em 2026-11-18 contra `next build`. Não é aviso: é falha de build —
// e derrubaria o AC15 da própria story. Tornar a função `async` só para
// caber lá a transformaria num endpoint chamável pelo cliente e obrigaria
// `await` para derivar um número, em componente de servidor e em texto de
// tela.
//
// Então ela mora aqui, que é onde o OUTRO invariante da reserva já morava
// (`HALVES_PER_DIVISIBLE_TITLE`): módulo puro, sem `"use server"`,
// importável pelo servidor, pelo componente de tela e pelo cliente HTTP da
// Paysure. `actions/reserve.ts` passa a IMPORTAR a função.
//
// Os três consumidores que antes discordavam entre si:
//   • `actions/reserve.ts`   — `reservedUntil` da unidade
//   • a tela do pedido       — o texto "reservados por N minutos"
//   • `paysure-client.ts`    — `expiration_seconds` da cobrança
// ════════════════════════════════════════════════════════════════════════

/**
 * O padrão da janela de reserva, em minutos.
 *
 * ⚠️ PRIVADO de propósito. A única forma de obter a janela é
 * `reservationMinutesFor`, para que a `LTM-17` tenha um lugar só para
 * mudar. Ver o bloco acima.
 */
const RESERVATION_MINUTES_DEFAULT = 15;

/**
 * O sorteio, pelo que a janela de reserva precisa saber dele.
 *
 * Todos os campos são opcionais: o tipo é estrutural para a linha inteira
 * de `products` ser aceita como argumento sem casting, e para a `LTM-17`
 * acrescentar a coluna de configuração aqui sem tocar nenhum chamador.
 */
export interface ReservationWindowProduct {
  readonly id?: string;
  /**
   * `products.advanced_settings` cru.
   *
   * `unknown` porque é jsonb e porque esta função AINDA NÃO O LÊ. Quem o
   * ler é a `LTM-17`, e pelo `productAdvancedSettingsSchema.parse` — ver o
   * bloco acima. Declarado aqui para a linha inteira de `products` ser
   * aceita como argumento hoje, sem casting e sem mudar nenhum chamador
   * depois.
   */
  readonly advancedSettings?: unknown;
}

/**
 * Quantos minutos a reserva de uma unidade deste sorteio vale.
 *
 * ⚠️ HOJE IGNORA O ARGUMENTO e devolve o padrão, mesmo que o operador tenha
 * escolhido outro valor na tela. A leitura de
 * `advancedSettings.reservationExpiryMinutes` é a `LTM-17` — quando ela
 * existir, é esta função que muda, e só ela. Nenhum chamador precisa mudar.
 *
 * É também a fonte única do AC14 da LTM-03b: mudar o que esta função
 * devolve TEM de mudar o `reservedUntil` da unidade, o texto da tela do
 * pedido e o `expiration_seconds` da cobrança PIX.
 */
export function reservationMinutesFor(
  product?: ReservationWindowProduct | null,
): number {
  // `void` em vez de `_product`: o nome com sublinhado pediria ao leitor que
  // tratasse o parâmetro como lixo, e ele não é — ele é a assinatura que a
  // `LTM-17` vai usar, e a razão de os chamadores já passarem o sorteio.
  void product;
  return RESERVATION_MINUTES_DEFAULT;
}

export const reserveUnitSchema = z.object({
  number: z.number().int().min(0),
  half: z.number().int().min(1).max(HALVES_PER_DIVISIBLE_TITLE).nullable(),
});

export type ReserveUnitInput = z.infer<typeof reserveUnitSchema>;

/** Chave de identidade da seleção, para detectar pedido repetido. */
function unitKey(unit: ReserveUnitInput): string {
  return `${unit.number}:${unit.half ?? "inteiro"}`;
}

export const reserveNumbersSchema = z
  .object({
    tenantSlug: z.string().min(1),
    productSlug: z.string().min(1),
    units: z.array(reserveUnitSchema).min(1, "Selecione ao menos um número"),
    phone: z.string().min(8, "Telefone inválido"),
  })
  // Seleção repetida é recusada em vez de deduplicada, e isso é decisão de
  // dinheiro: deduplicar em silêncio cobraria um valor diferente do que a
  // tela somou. Dois casos, os dois recusados aqui:
  //   • a MESMA unidade duas vezes;
  //   • o título inteiro E uma metade dele na mesma seleção, que é pedir a
  //     mesma metade duas vezes com dois nomes.
  .superRefine((input, ctx) => {
    const vistas = new Set<string>();
    const inteiros = new Set<number>();
    const metades = new Set<number>();

    for (const unit of input.units) {
      const key = unitKey(unit);
      if (vistas.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["units"],
          message: `A unidade ${key} aparece duas vezes na seleção.`,
        });
        return;
      }
      vistas.add(key);
      if (unit.half === null) inteiros.add(unit.number);
      else metades.add(unit.number);
    }

    for (const number of inteiros) {
      if (metades.has(number)) {
        ctx.addIssue({
          code: "custom",
          path: ["units"],
          message:
            `O título ${number} aparece como título inteiro e como metade na mesma ` +
            `seleção — é a mesma metade pedida duas vezes.`,
        });
        return;
      }
    }
  });

export type ReserveNumbersInput = z.infer<typeof reserveNumbersSchema>;
