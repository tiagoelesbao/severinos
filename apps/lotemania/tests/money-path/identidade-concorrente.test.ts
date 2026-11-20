// A IDENTIDADE DO COMPRADOR NOVO, SOB CORRIDA (LTM-23).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO EXISTE, E POR QUE `reserve-concurrency.test.ts` NÃO
// PEGOU NADA
//
// Aquele arquivo disputa as mesmas 10 unidades com 20 compradores — e usa
// UM TELEFONE DISTINTO POR DISPUTANTE (linha 66, com a razão escrita: "20
// pessoas disputando, não uma pessoa clicando 20 vezes"). É o desenho
// natural de quem escreve teste de concorrência pensando em atores
// diferentes.
//
// O defeito desta story só existe quando são O MESMO ATOR: o mesmo
// telefone, ainda SEM cadastro, em duas abas. As duas reservas não acham
// nada no `SELECT` da identidade, as duas tentam inserir, uma vence e a
// outra estoura em `users_tenant_phone_idx` — e a ação relança, o que o
// comprador vê como 500. Na segunda compra isso nunca mais acontece,
// porque o cadastro já existe.
//
// É a TERCEIRA vez neste epic que o buraco mora onde o teste não olha: a
// LTM-20 era "dois compradores", esta é "o mesmo comprador, duas abas". O
// padrão vale mais que a ocorrência — a suíte modela atores distintos bem
// e o MESMO ator em paralelo mal. Todo teste daqui tem um ator só,
// repetido, de propósito.
//
// ── O QUE SE PROVA AQUI, E COM O QUÊ
//
//   AC1/AC2  o caminho de produção, com `fanOut`: N reservas simultâneas
//            do mesmo telefone novo, nenhuma estoura, uma identidade só.
//   AC3      regressão da ficha do anti-spam, que a LTM-20 acabou de
//            mover para dentro da expiração.
//   AC4      o alvo do `ON CONFLICT`, em DUAS camadas — a forma do código
//            e o comportamento do Postgres contra o schema de verdade.
//   AC5      a identidade sobrevive à reserva perdida (decisão da LTM-02).
//
// ── POR QUE O AC4 NÃO PASSA PELA AÇÃO DE PRODUÇÃO
//
// A story pede "conflito de e-mail com telefone diferente não é engolido".
// Esse estado é INALCANÇÁVEL por `reserveSelectedNumbers`: o `INSERT` da
// identidade escreve `(tenant_id, phone, role)` e nada mais, então `email`
// nasce `NULL` — e o Postgres trata cada `NULL` como distinto, de modo que
// `users_tenant_email_idx` nunca é tocado por este caminho. Então o AC4 é
// provado onde ele de fato vive: a FORMA do `ON CONFLICT` no código
// (varredura de fonte, com comentário removido) e o COMPORTAMENTO do
// Postgres diante dos dois idiomas (com alvo e sem alvo) sobre a mesma
// tabela real. Está registrado no Dev Agent Record como premissa ajustada.
// ════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { reserveSelectedNumbers } from "@/lib/actions/reserve";

import { errorOf, isReserveOk, orderIdOf, titulos } from "../helpers/actions";
import { fanOut } from "../helpers/concurrency";
import { query } from "../helpers/db";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createBuyer,
  createRaffle,
  createTenant,
  readOrders,
  syntheticEmail,
  syntheticPhone,
} from "../helpers/seed";

/**
 * Quantas abas o mesmo comprador abre.
 *
 * 6 é o número da sonda que mediu o defeito durante a LTM-20 (5 rodadas ×
 * 6 operações entrelaçadas, 6 rejeições sem identidade pré-criada). Mantido
 * igual de propósito: o teste reproduz a medição, não uma aproximação dela.
 */
const ABAS = 6;

interface UserRow {
  id: string;
  consecutive_unpaid_reservations: number;
  blocked_until: string | null;
}

async function usersComTelefone(tenantId: string, phone: string): Promise<UserRow[]> {
  return query<UserRow>(
    `SELECT id, consecutive_unpaid_reservations, blocked_until
       FROM users
      WHERE tenant_id = $1 AND phone = $2
      ORDER BY created_at, id`,
    [tenantId, phone],
  );
}

/**
 * O mesmo telefone reservando em N abas ao mesmo tempo, cada aba pedindo um
 * número DIFERENTE.
 *
 * Números diferentes não é conveniência: é o que isola o que está sob
 * teste. Com todas as abas no mesmo número, N−1 recusas por disputa de
 * unidade seriam indistinguíveis das N−1 falhas de criação de identidade —
 * e o teste ficaria verde pelo motivo errado. Separadas, TODAS as abas
 * devem vencer, e a única razão possível para uma falhar é a identidade.
 */
async function abasDoMesmoComprador(telefone: string, abas = ABAS) {
  const tenant = await createTenant();
  const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: abas });

  const result = await fanOut(abas, (i) =>
    reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(raffle.numbers[i]),
      phone: telefone,
    }),
  );

  return { tenant, raffle, result };
}

describe("identidade do comprador sob corrida", () => {
  // ── AC1 + AC2 — o defeito, no caminho de produção ───────────────────

  it(`AC1/AC2: ${ABAS} reservas simultâneas do mesmo telefone SEM cadastro resolvem para um único users.id`, async () => {
    const telefone = syntheticPhone();
    const { tenant, raffle, result } = await abasDoMesmoComprador(telefone);

    // (a) NENHUMA estoura. Antes da LTM-23 eram ABAS−1 exceções de
    // `duplicate key value violates unique constraint
    // "users_tenant_phone_idx"` vazando da ação como 500.
    expect(
      result.rejected,
      `exceções vazadas (antes da LTM-23: ${ABAS - 1}): ` +
        JSON.stringify(result.rejected.map((o) => String(o.error))),
    ).toHaveLength(0);

    // (b) e nenhuma volta com recusa: números distintos, estoque sobrando,
    // não há disputa de unidade nesta medição.
    const recusas = result.fulfilled.filter((o) => o.value && !isReserveOk(o.value));
    expect(
      recusas,
      `recusas inesperadas: ${JSON.stringify(recusas.map((o) => o.value))}`,
    ).toHaveLength(0);
    expect(result.fulfilled).toHaveLength(ABAS);

    // (c) AC2 — UMA identidade, não N. O índice único já garantiria; o que
    // isto prova é que o código não tenta contorná-lo (criando linha com
    // telefone normalizado diferente, por exemplo).
    const linhas = await usersComTelefone(tenant.id, telefone);
    expect(
      linhas.map((l) => l.id),
      "uma corrida de identidade tem de deixar exatamente UMA linha em users",
    ).toHaveLength(1);

    // (d) AC1 — e os ABAS pedidos apontam todos para ELA. Pedido órfão de
    // identidade, ou apontando para uma segunda identidade do mesmo
    // telefone, seria o comprador partido em dois donos.
    const orders = await readOrders(raffle.id);
    expect(orders).toHaveLength(ABAS);
    expect(
      [...new Set(orders.map((o) => o.user_id))],
      `os ${ABAS} pedidos têm de ter o MESMO dono`,
    ).toEqual([linhas[0].id]);

    await assertProductInvariants(
      raffle.id,
      `AC1: ${ABAS} reservas simultâneas do mesmo telefone novo`,
    );
  });

  // ── AC3 — a ficha do anti-spam sobrevive ─────────────────────────────

  it("AC3: comprador com ficha do anti-spam > 0 entra na corrida e a ficha continua intacta", async () => {
    // Ficha 2, um abaixo do limite de bloqueio (3): o comprador ainda
    // reserva, que é o que o teste precisa exercitar.
    const FICHA = 2;
    const telefone = syntheticPhone();

    const tenant = await createTenant();
    const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: ABAS });
    const comprador = await createBuyer({
      tenantId: tenant.id,
      phone: telefone,
      consecutiveUnpaidReservations: FICHA,
    });

    const result = await fanOut(ABAS, (i) =>
      reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(raffle.numbers[i]),
        phone: telefone,
      }),
    );

    expect(
      result.rejected,
      JSON.stringify(result.rejected.map((o) => String(o.error))),
    ).toHaveLength(0);

    const linhas = await usersComTelefone(tenant.id, telefone);

    // (a) a MESMA linha, não uma recriada. Um conserto que apagasse e
    // reinserisse o usuário em conflito passaria em (b) com ficha zerada e
    // id novo — por isso o id é asserido primeiro.
    expect(
      linhas.map((l) => l.id),
      "a corrida não pode criar uma segunda identidade para o telefone",
    ).toEqual([comprador.id]);

    // (b) e a ficha continua a que era. É a regressão contra desfazer o que
    // a LTM-20 arrumou: com a contagem zerada aqui, o anti-spam volta a ser
    // contornável criando corrida.
    expect(
      linhas[0].consecutive_unpaid_reservations,
      "a ficha do anti-spam é do dono do pedido e não se perde numa corrida",
    ).toBe(FICHA);
    expect(linhas[0].blocked_until).toBeNull();
  });

  // ── AC4 — o alvo do ON CONFLICT, nas duas camadas ────────────────────

  it("AC4 (forma): o ON CONFLICT da identidade nomeia (tenant_id, phone)", () => {
    const fonte = readFileSync(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../src/lib/actions/reserve.ts",
      ),
      "utf8",
    );

    // ⚠️ COMENTÁRIO REMOVIDO ANTES DE QUALQUER ASSERÇÃO.
    //
    // O bloco de documentação de `ensureBuyerIdentity` ESCREVE a forma
    // proibida para condená-la ("`ON CONFLICT DO NOTHING` SEM coluna
    // alvo..."). Varrer o texto cru daria vermelho contra a própria
    // explicação do conserto — e o reflexo seguinte seria relaxar a
    // asserção. Varre-se código, nunca prosa.
    const codigo = fonte
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");

    // (a) existe UM único `INSERT` em `users` neste arquivo. Se alguém
    // acrescentar outro, este número muda e a asserção abaixo deixa de
    // cobrir o arquivo inteiro — o teste tem de parar junto.
    expect(
      [...codigo.matchAll(/\.insert\(users\)/g)],
      "mais de um INSERT em users neste arquivo: cada um precisa do seu alvo",
    ).toHaveLength(1);

    // (b) e ele é idempotente COM alvo nomeado.
    expect(
      codigo,
      "o INSERT da identidade tem de ter alvo explícito (tenant_id, phone)",
    ).toMatch(
      /onConflictDoNothing\(\s*\{\s*target:\s*\[\s*users\.tenantId\s*,\s*users\.phone\s*\]\s*,?\s*\}\s*\)/,
    );

    // (c) e NÃO existe a forma sem alvo, que casaria com qualquer um dos
    // quatro índices únicos de `users`.
    expect(
      /onConflictDoNothing\(\s*\)/.test(codigo),
      "ON CONFLICT sem alvo engoliria conflito de e-mail, username ou código de afiliado",
    ).toBe(false);
  });

  it("AC4 (comportamento): com alvo (tenant_id, phone), conflito de e-mail ESTOURA; sem alvo, é engolido", async () => {
    const tenant = await createTenant();
    const email = syntheticEmail();

    // Um comprador alheio, com e-mail preenchido. É a única forma de o
    // `users_tenant_email_idx` entrar em jogo: o caminho da reserva nunca
    // escreve `email`, e `NULL` não colide com `NULL` no Postgres.
    const alheio = await query<{ id: string }>(
      `INSERT INTO users (tenant_id, phone, email, name, role)
       VALUES ($1, $2, $3, 'Comprador sintetico alheio', 'subscriber')
       RETURNING id`,
      [tenant.id, syntheticPhone(), email],
    );
    expect(alheio).toHaveLength(1);

    // Agora a tentativa perigosa: telefone NOVO, e-mail JÁ EXISTENTE.
    const telefoneNovo = syntheticPhone();
    const valores = [tenant.id, telefoneNovo, email];

    // (a) COM alvo — que é a forma que `reserve.ts` usa. O conflito é de
    // e-mail, não de telefone, então ele NÃO é engolido: estoura, com o
    // nome do índice de verdade. Estourar é o certo — é um estado que
    // ninguém previu, e devolver um usuário alheio em silêncio seria
    // trocar a identidade do comprador.
    await expect(
      query(
        `INSERT INTO users (tenant_id, phone, email, role)
         VALUES ($1, $2, $3, 'subscriber')
         ON CONFLICT (tenant_id, phone) DO NOTHING
         RETURNING id`,
        valores,
      ),
    ).rejects.toThrow(/users_tenant_email_idx/);

    // (b) SEM alvo — a forma que o risco [Alto] da story descreve. O mesmo
    // conflito de e-mail é ENGOLIDO: zero linha, zero erro. Um código que
    // tratasse "zero linha" como "já existe, releia pelo telefone" não
    // acharia nada e, num desenho menos cuidadoso, devolveria o usuário
    // errado. É esta diferença que o alvo nomeado compra.
    const engolido = await query(
      `INSERT INTO users (tenant_id, phone, email, role)
       VALUES ($1, $2, $3, 'subscriber')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      valores,
    );
    expect(
      engolido,
      "ON CONFLICT sem alvo não devolve linha NEM erro: a colisão desaparece",
    ).toHaveLength(0);

    // E a prova de que o engolido não escreveu nada: o telefone novo
    // continua sem cadastro.
    expect(await usersComTelefone(tenant.id, telefoneNovo)).toHaveLength(0);
  });

  // ── AC5 — a identidade continua FORA da transação da reserva ─────────

  it("AC5: comprador novo cuja reserva FALHA continua cadastrado", async () => {
    const tenant = await createTenant();
    const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 1 });
    const disputado = raffle.numbers[0];

    // O número já é de outro comprador.
    const dono = syntheticPhone();
    orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(disputado),
        phone: dono,
      }),
    );

    // Chega um comprador NOVO e pede o mesmo número. A reserva tem de
    // falhar — e o cadastro dele, criado um instante antes, tem de ficar.
    const novato = syntheticPhone();
    const recusa = errorOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(disputado),
        phone: novato,
      }),
    );
    expect(recusa).toMatch(/acabou de ser reservado/);

    expect(
      await usersComTelefone(tenant.id, novato),
      "a identidade é quem FAZ o pedido, não parte dele: ela não é desfeita " +
        "com a reserva perdida (LTM-02). Apagá-la levaria junto a ficha do anti-spam.",
    ).toHaveLength(1);
  });

  it("AC5 (na corrida real): dois telefones novos disputam o único número e os DOIS ficam cadastrados", async () => {
    const tenant = await createTenant();
    const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 1 });
    const disputado = raffle.numbers[0];

    const telefones = [syntheticPhone(), syntheticPhone()];

    const result = await fanOut(telefones.length, (i) =>
      reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(disputado),
        phone: telefones[i],
      }),
    );

    expect(
      result.rejected,
      JSON.stringify(result.rejected.map((o) => String(o.error))),
    ).toHaveLength(0);

    // Um vencedor, um recusado — o mecanismo da LTM-02, aqui só como
    // cenário. Nenhuma asserção sobre QUEM vence: isso seria intermitente.
    const vencedores = result.fulfilled.filter((o) => o.value && isReserveOk(o.value));
    expect(vencedores).toHaveLength(1);

    for (const telefone of telefones) {
      expect(
        await usersComTelefone(tenant.id, telefone),
        `o telefone ${telefone} tem de continuar cadastrado, tenha vencido ou perdido`,
      ).toHaveLength(1);
    }

    await assertProductInvariants(raffle.id, "AC5: dois novatos disputando um número");
  });
});
