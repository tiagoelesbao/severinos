// A GRADE PARTIDA, E A REGRESSÃO DA GRADE DE COTA INTEIRA (LTM-08, AC1).
//
// ════════════════════════════════════════════════════════════════════════
// O QUE ESTE ARQUIVO PRENDE, E POR QUE SEM BANCO
//
// `NumberGrid` chama `useRouter()`, e `useRouter()` LANÇA sob
// `renderToStaticMarkup` — razão já escrita em `pedido/[orderId]/countdown.tsx`
// e topada pelo teste da LTM-14. Então o AC1 é verificado onde ele de fato
// mora: nas funções PURAS da grade (`buildGridCells`, `toggleUnit`,
// `unitsForReserve`) e no componente puro `TitleCell`, que é a célula.
//
// Nada aqui vai ao banco de propósito: a pergunta do AC1 é de MONTAGEM da
// tela a partir do estoque, não de estoque. Quem prova que o estoque tem
// duas linhas por título é a suíte da LTM-07
// (`money-path/reserve-halves.test.ts`), contra o Postgres de verdade.
//
// ── A VARREDURA QUE ESTE ARQUIVO NÃO FAZ
//
// Nenhuma asserção aqui lê o código-fonte procurando `half: null`. Os
// comentários desta base ESCREVEM a forma proibida para condená-la — o de
// `number-grid.tsx` cita `half: null` três vezes —, então varredura de texto
// casaria com a explicação e não com o defeito. O que se verifica é o VALOR
// que `unitsForReserve` devolve.
// ════════════════════════════════════════════════════════════════════════

import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import {
  buildGridCells,
  TitleCell,
  toggleUnit,
  unitKeyOf,
  unitsForReserve,
  type GridCell,
  type SelectedUnit,
} from "@/app/loja/[tenant]/[productSlug]/number-grid";

type Status = "available" | "reserved" | "sold";

/** O estoque como o banco o entrega: uma linha por unidade vendável. */
function estoque(
  total: number,
  halvesPerTitle: number,
  override: { number: number; half: number; status: Status }[] = [],
): { number: number; half: number; status: Status }[] {
  const rows: { number: number; half: number; status: Status }[] = [];
  // Numeração de 0 a total-1, como a produção gera
  // (`actions/products.ts:40-46`) e como o seed da suíte respeita.
  for (let number = 0; number < total; number += 1) {
    for (let half = 1; half <= halvesPerTitle; half += 1) {
      const trocada = override.find((o) => o.number === number && o.half === half);
      rows.push(trocada ?? { number, half, status: "available" });
    }
  }
  return rows;
}

function celulaDe(cells: GridCell[], number: number): GridCell {
  const cell = cells.find((c) => c.number === number);
  if (!cell) throw new Error(`A grade não tem célula para o título ${number}.`);
  return cell;
}

const SELECIONA_NADA = () => false;
const IGNORA_CLIQUE = () => {};

describe("AC1 — em sorteio divisível, cada título renderiza duas bandas", () => {
  it("cem títulos continuam cem células, com duas metades cada", () => {
    const cells = buildGridCells(estoque(100, 2), { isDivisible: true });

    // "O comprador continua vendo cem títulos" — a tarefa da story. 200
    // células seria a grade contando unidades e o comprador perdendo a
    // noção de qual metade é de qual número.
    expect(cells).toHaveLength(100);
    for (const cell of cells) {
      expect(cell.bands.map((b) => b.half)).toEqual([1, 2]);
    }
  });

  it("o estado de cada banda é o da SUA metade, não o do título", () => {
    const cells = buildGridCells(
      estoque(50, 2, [
        { number: 42, half: 1, status: "sold" },
        { number: 43, half: 2, status: "reserved" },
      ]),
      { isDivisible: true },
    );

    // É o caso que mais importa: título com uma metade vendida e a outra à
    // venda. Um estado só por título apagaria metade do estoque da tela.
    expect(celulaDe(cells, 42).bands.map((b) => b.status)).toEqual([
      "sold",
      "available",
    ]);
    expect(celulaDe(cells, 43).bands.map((b) => b.status)).toEqual([
      "available",
      "reserved",
    ]);
  });

  it("as bandas saem ordenadas por metade, mesmo se o estoque vier fora de ordem", () => {
    const cells = buildGridCells(
      [
        { number: 7, half: 2, status: "sold" },
        { number: 7, half: 1, status: "available" },
      ],
      { isDivisible: true },
    );
    expect(celulaDe(cells, 7).bands).toEqual([
      { half: 1, status: "available" },
      { half: 2, status: "sold" },
    ]);
  });

  it("clicar numa banda NÃO seleciona a outra metade do mesmo título", () => {
    const primeira: SelectedUnit = { number: 42, half: 1 };
    const selecionado = toggleUnit([], primeira);

    expect(selecionado).toHaveLength(1);
    expect(selecionado.map(unitKeyOf)).toContain("42:1");
    expect(selecionado.map(unitKeyOf)).not.toContain("42:2");
  });

  it("as duas metades do mesmo título convivem na seleção, e saem uma a uma", () => {
    // GLOSSARY → Meia cota: "duas metades do mesmo título compradas pela
    // mesma pessoa continuam sendo duas metades — não se fundem em cota
    // inteira".
    let selecionado = toggleUnit([], { number: 42, half: 1 });
    selecionado = toggleUnit(selecionado, { number: 42, half: 2 });
    expect(selecionado.map(unitKeyOf)).toEqual(["42:1", "42:2"]);

    selecionado = toggleUnit(selecionado, { number: 42, half: 1 });
    expect(selecionado.map(unitKeyOf)).toEqual(["42:2"]);
  });

  it("a reserva recebe a METADE NOMEADA — a linha que travava a meia cota", () => {
    // `half: null` cravado em toda seleção (a grade antiga) é o que fazia a
    // reserva tirar o título INTEIRO do estoque. Aqui a metade chega
    // nomeada, que é o contrato da LTM-02 (AC9).
    const units = unitsForReserve([
      { number: 42, half: 1 },
      { number: 43, half: 2 },
    ]);
    expect(units).toEqual([
      { number: 42, half: 1 },
      { number: 43, half: 2 },
    ]);
  });

  it("a célula partida renderiza duas bandas clicáveis, cada uma com a cor do seu estado", () => {
    const cell = celulaDe(
      buildGridCells(estoque(1, 2, [{ number: 0, half: 1, status: "sold" }]), {
        isDivisible: true,
      }),
      0,
    );
    const html = renderToStaticMarkup(
      <TitleCell cell={cell} isSelected={SELECIONA_NADA} onToggle={IGNORA_CLIQUE} />,
    );

    // Dois botões, um por metade — e cada um diz QUAL metade é, porque "42"
    // repetido sem rótulo é a ambiguidade que o GLOSSARY proíbe.
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Título 00, metade 1"');
    expect(html).toContain('aria-label="Título 00, metade 2"');

    // A metade vendida sai desabilitada e verde; a livre, clicável e azul.
    // As cores são as medidas na loja da Sorteamos, não tokens semânticos.
    expect(html).toContain("bg-[#4caf50]");
    expect(html).toContain("bg-[#37495d]");
    expect(html.match(/disabled=""/g)).toHaveLength(1);
  });

  it("uma banda selecionada fica verde-escuro sem arrastar a irmã", () => {
    const cell = celulaDe(buildGridCells(estoque(1, 2), { isDivisible: true }), 0);
    const html = renderToStaticMarkup(
      <TitleCell
        cell={cell}
        isSelected={(unit) => unit.half === 1}
        onToggle={IGNORA_CLIQUE}
      />,
    );
    expect(html.match(/bg-\[#266c58\] text-white/g)).toHaveLength(1);
    // ⚠️ `bg-[#37495d]` casa DUAS vezes na banda livre — a cor e o
    // `hover:bg-[#37495d]/80` que vem junto dela. A contagem é da classe
    // completa, senão o teste conta a cor do hover como se fosse outra banda.
    expect(html.match(/bg-\[#37495d\] text-white/g)).toHaveLength(1);
  });
});

describe("AC1 — regressão: o sorteio de cota inteira renderiza como hoje", () => {
  // São 5 rodadas simultâneas em produção, e a identidade visual da loja é
  // cópia do que está no ar (decisão do founder, 2026-11-20). A string
  // abaixo é a MEDIDA, repetida aqui de propósito: é a linha de base da
  // regressão, e ela tem de estar fora do arquivo que ela vigia.
  const CLASSE_MEDIDA =
    "rounded-[4px] py-2.5 text-sm font-normal tabular-nums transition-colors duration-300 ease-in-out disabled:cursor-default shadow-[0_0_2px_rgba(0,0,0,0.2),0_12px_24px_-4px_rgba(0,0,0,0.12)]";

  it("cada título é UMA banda, e ela é o título inteiro (`half: null`)", () => {
    const cells = buildGridCells(estoque(100, 1), { isDivisible: false });

    expect(cells).toHaveLength(100);
    for (const cell of cells) {
      expect(cell.bands).toHaveLength(1);
      // `half: null` e não `half: 1`: toda linha de cota inteira tem
      // `half = 1` no banco, mas o contrato de reserva chama o título
      // inteiro de `null`, e é o que esta grade sempre enviou.
      expect(cell.bands[0].half).toBeNull();
    }
  });

  it("a reserva continua recebendo o título inteiro, como antes desta story", () => {
    const selecionado = toggleUnit([], { number: 42, half: null });
    expect(unitsForReserve(selecionado)).toEqual([{ number: 42, half: null }]);
  });

  it("a célula é um único <button>, com as classes medidas na ordem em que estavam", () => {
    const cell = celulaDe(buildGridCells(estoque(1, 1), { isDivisible: false }), 0);
    const html = renderToStaticMarkup(
      <TitleCell cell={cell} isSelected={SELECIONA_NADA} onToggle={IGNORA_CLIQUE} />,
    );

    expect(html.match(/<button/g)).toHaveLength(1);
    // Nenhuma moldura em volta: a célula de cota inteira é o botão, não um
    // <div> com um botão dentro.
    expect(html.startsWith("<button")).toBe(true);
    expect(html).toContain(`class="${CLASSE_MEDIDA} ${"bg-[#37495d] text-white hover:bg-[#37495d]/80"}"`);
    // E nada de metade: sem `aria-label`, sem divisor, como no ar hoje.
    expect(html).not.toContain("metade");
    expect(html).toContain(">00</button>");
  });

  it("estoque com duas linhas no mesmo número NÃO inventa uma segunda metade num sorteio de cota inteira", () => {
    // Estado que o domínio não produz (a reescrita de `product_numbers` e o
    // booleano vão na mesma transação). Se aparecer, a grade mostra uma
    // banda só em vez de oferecer metade num sorteio que não as vende.
    const cells = buildGridCells(
      [
        { number: 5, half: 1, status: "available" },
        { number: 5, half: 2, status: "available" },
      ],
      { isDivisible: false },
    );
    expect(cells).toHaveLength(1);
    expect(celulaDe(cells, 5).bands).toEqual([{ half: null, status: "available" }]);
  });
});
