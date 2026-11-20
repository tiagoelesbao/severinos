// O mascaramento de dado pessoal na LOJA — duas formas de telefone, não uma.
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE DUAS MÁSCARAS, E POR QUE NENHUMA DAS DUAS É "A CERTA"
//
// A Sorteamos usa formas DIFERENTES em telas diferentes, e isso foi medido
// três vezes (`docs/research/2026-11-18-inventario-sorteamos/`):
//
//   modal de Checkout           `(11) 9****-****`  ← o 9 à vista
//   cartão de ganhador          `(98) ****-****`   ← sem o 9
//
// Unificar as duas em uma faria uma das telas exibir um formato que não é o
// observado. Então existem as duas, cada uma com o nome da tela a que
// pertence, e `maskName` serve às duas sem mudança.
//
// ⚠️ A TELA DE PEDIDO SAIU DESTA LISTA INTEIRA, por duas decisões do founder
// em dias seguidos: 2026-11-19 soltou o TELEFONE, 2026-11-20 soltou o NOME.
// A razão é a mesma para os dois — são os dados da própria pessoa, numa tela
// que ela abriu sobre a compra dela. A primeira decisão foi explicitamente
// *"só na tela do próprio pedido"*, e a segunda nasceu de a incoerência ter
// sido levada a ele: a tela mostrava `Comprador ***` ao lado do telefone
// inteiro, meia proteção e nenhuma.
//
// ⛔ **O CARTÃO DE GANHADOR NÃO MUDOU, e é por isso que este arquivo continua
// existindo.** `maskName` e `maskPhone` são aplicados em
// `loja/[tenant]/ganhadores/page.tsx:62` e `:81`: página pública, dado de
// terceiro que não escolheu aparecer. **Nenhuma das duas decisões a tocou**, e
// quem for estender "coerência" até lá estará decidindo pelo founder.
//
// ⚠️ O 9 QUE APARECE É O DÍGITO REAL, NÃO UM "9" ESCRITO À MÃO. Cravar o
// caractere `9` faria a tela afirmar que o número é celular mesmo quando não
// é — e afirmar o que não se mediu é invenção, ainda que em um dígito. Para
// telefone fixo (10 dígitos) não existe nono dígito, e a função cai na forma
// sem ele em vez de inventar um.
// ════════════════════════════════════════════════════════════════════════

/** Quantos dígitos tem um telefone brasileiro com DDD e nono dígito. */
const DIGITOS_COM_NONO = 11;

function digitsOf(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function maskName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return `${first} ***`;
}

/**
 * `(DD) ****-****` — a forma do CARTÃO DE GANHADOR.
 *
 * Nenhum dígito do número do assinante sai. Mantida exatamente como estava:
 * a `LTM-15` depende desta forma, e o acréscimo da forma de baixo não a
 * altera.
 */
export function maskPhone(phone: string | null): string {
  if (!phone) return "";
  const digits = digitsOf(phone);
  const ddd = digits.slice(0, 2);
  return `(${ddd}) ****-****`;
}

/**
 * `(DD) 9****-****` — a forma do MODAL DE CHECKOUT.
 *
 * Revela o DDD e o primeiro dígito do número do assinante; o resto é
 * máscara. Com 11 dígitos esse primeiro dígito é o nono dígito do celular,
 * que é o `9` que a Sorteamos mostra. Com menos (fixo, ou dado incompleto)
 * não há nono dígito e a função devolve a forma sem ele — nunca um `9`
 * inventado.
 *
 * ⚠️ QUEM VAI CONSUMIR ISTO É A `LTM-21`, no modal de Checkout, onde a forma
 * `(11) 9****-****` está medida (`fluxo-de-compra.md`, passo 2). Nasceu na
 * `LTM-14` para a tela de pedido, e a decisão do founder de 2026-11-19 —
 * telefone inteiro na tela do próprio pedido — deixou essa tela sem usá-la.
 *
 * Ela foi MANTIDA em vez de apagada porque o consumidor é conhecido e
 * próximo, e porque o que custou a escrever não é o código: é a medição das
 * duas formas e a decisão de revelar o dígito REAL em vez de cravar um `9`.
 * Apagar jogaria fora a medição e a `LTM-21` a refaria do zero — provavelmente
 * cravando o `9`, que é o que o comentário do topo existe para impedir.
 * `tests/loja/mascaras.test.ts` prende as duas formas enquanto não há tela.
 */
export function maskPhoneKeepingNinth(phone: string | null): string {
  if (!phone) return "";
  const digits = digitsOf(phone);
  if (digits.length < DIGITOS_COM_NONO) return maskPhone(phone);
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}****-****`;
}
