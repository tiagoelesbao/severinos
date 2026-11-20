"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CircleCheck } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { fromCents, toCents } from "@/lib/payments/money";
// ⚠️ TIPO, não valor. `orphan-halves.ts` importa `@/db` (WebSocket, pacote
// `ws`); importá-lo como valor aqui arrastaria o banco para o pacote do
// navegador. `import type` é apagado na compilação — o anúncio chega PRONTO
// como prop, montado no componente de servidor.
import type { RaffleAnnouncement } from "@/lib/raffles/orphan-halves";
import { AvailabilityWarning } from "./raffle-extras";

type NumberStatus = "available" | "reserved" | "sold";

// ════════════════════════════════════════════════════════════════════════
// A GRADE PARTIDA (LTM-08, AC1)
//
// A grade vende UNIDADES VENDÁVEIS, e num sorteio divisível a unidade é a
// metade (ADR-0001): o título 42 são duas linhas de `product_numbers`, e
// cada uma tem dono, prazo e estado PRÓPRIOS. Até esta story a grade enviava
// sempre `half: null` (`:70` do arquivo antigo) — o título inteiro —, e era
// o segundo dos pontos em que a meia cota era inalcançável pela interface.
//
// ── O QUE NÃO MUDOU, E É METADE DO AC
//
// Em sorteio de COTA INTEIRA esta grade renderiza exatamente como antes: um
// <button> por título, as mesmas classes medidas com `getComputedStyle` na
// loja da Sorteamos, e o contrato de reserva segue `half: null`. Toda
// diferença desta story está atrás de `announcement.isDivisible`. São 5
// rodadas simultâneas em produção, e a identidade visual da loja é cópia do
// que está no ar — divergência nossa é defeito, não escolha.
//
// ⚠️ O número de colunas NÃO muda aqui. `grid-cols-6 sm:grid-cols-10` é o
// que está no ar; a decisão D4 do founder ("manter 6") fechou a pergunta de
// 6 contra 7, não a de 6 contra 10, e está registrada como divergência em
// aberto no epic. Partir a célula ao meio numa grade de dez deixa o alvo de
// toque menor — é o risco [Baixo→Médio] da story, e é por isso que a banda
// usa a altura inteira da célula em vez de dividi-la na horizontal.
//
// ── POR QUE A LÓGICA ESTÁ EM FUNÇÕES PURAS EXPORTADAS
//
// `NumberGrid` usa `useRouter()`, e `useRouter()` LANÇA sob
// `renderToStaticMarkup` — a razão está escrita em
// `pedido/[orderId]/countdown.tsx` e o teste da LTM-14 topou nela. Então o
// que o AC1 precisa provar (duas bandas independentes, clique numa não
// seleciona a outra, estado por metade) vive em `buildGridCells`,
// `toggleUnit`, `unitsForReserve` e no componente PURO `TitleCell`, todos
// verificáveis sem montar a árvore inteira.
// ════════════════════════════════════════════════════════════════════════

/** Uma unidade vendável na seleção do comprador. */
export interface SelectedUnit {
  readonly number: number;
  /** `null` = o título inteiro — a única linha de um sorteio de cota inteira. */
  readonly half: number | null;
}

/** Uma banda clicável da célula: uma metade, ou o título inteiro. */
export interface GridBand {
  readonly half: number | null;
  readonly status: NumberStatus;
}

/** Um título na grade. Uma banda em cota inteira, duas em sorteio divisível. */
export interface GridCell {
  readonly number: number;
  readonly bands: readonly GridBand[];
}

/**
 * Identidade de uma unidade na seleção.
 *
 * Mesma FORMA do `unitKey` de `validations/reserve.ts:168`, e de propósito —
 * mas aquele é a autoridade (é ele que recusa seleção repetida no servidor,
 * e seleção repetida é recusada em vez de deduplicada porque deduplicar em
 * silêncio cobraria valor diferente do que a tela somou). Este aqui é só
 * identidade de interface: chave de React e teste de pertencimento.
 */
export function unitKeyOf(unit: SelectedUnit): string {
  return `${unit.number}:${unit.half ?? "inteiro"}`;
}

/**
 * As linhas de estoque viram células da grade.
 *
 * Em sorteio divisível, as linhas do mesmo número viram BANDAS da mesma
 * célula, na ordem de `half` — o comprador continua vendo cem títulos, com
 * duas metades cada.
 *
 * Em cota inteira cada número vira UMA banda com `half: null`. Não é
 * `half: 1`, e a diferença não é cosmética: `null` é o que o contrato de
 * reserva entende por "o título todo" (`validations/reserve.ts:11-20`), e é
 * o que esta grade sempre enviou. Toda linha de cota inteira tem `half = 1`
 * no banco (o caso degenerado, `raffles.ts:98-101`), então usar o `half` da
 * linha faria a grade pedir "a metade 1 do 42" num sorteio que não tem
 * metades.
 */
export function buildGridCells(
  units: readonly { number: number; half: number; status: NumberStatus }[],
  product: { readonly isDivisible: boolean },
): GridCell[] {
  const cells = new Map<number, GridBand[]>();
  for (const unit of units) {
    const bands = cells.get(unit.number);
    if (bands === undefined) {
      cells.set(unit.number, [
        { half: product.isDivisible ? unit.half : null, status: unit.status },
      ]);
      continue;
    }
    // Sorteio de cota inteira com duas linhas no mesmo número é estado que
    // o domínio não produz: habilitar e desabilitar a divisibilidade
    // reescreve `product_numbers` na MESMA transação que vira o booleano
    // (`divisibility.ts:16-30`). Se aparecesse, a célula fica com uma banda
    // só em vez de inventar uma segunda metade na tela de um sorteio que não
    // as vende.
    if (!product.isDivisible) continue;
    bands.push({ half: unit.half, status: unit.status });
  }
  return [...cells.entries()].map(([number, bands]) => ({
    number,
    bands: [...bands].sort((a, b) => (a.half ?? 0) - (b.half ?? 0)),
  }));
}

/**
 * Liga/desliga UMA unidade da seleção — a outra metade do mesmo título não é
 * tocada (AC1).
 */
export function toggleUnit(
  selected: readonly SelectedUnit[],
  unit: SelectedUnit,
): SelectedUnit[] {
  const key = unitKeyOf(unit);
  const has = selected.some((item) => unitKeyOf(item) === key);
  return has
    ? selected.filter((item) => unitKeyOf(item) !== key)
    : [...selected, unit];
}

/**
 * A seleção na forma do contrato de reserva (LTM-02, AC9).
 *
 * É a identidade: a seleção JÁ carrega `half: null` em cota inteira e a
 * metade nomeada em sorteio divisível. A função existe para o teste prender
 * esse contrato num lugar só — foi a linha `half: null` cravada que manteve
 * a meia cota invendável.
 */
export function unitsForReserve(
  selected: readonly SelectedUnit[],
): { number: number; half: number | null }[] {
  return selected.map((unit) => ({ number: unit.number, half: unit.half }));
}

// Valores medidos na loja da Sorteamos com getComputedStyle, nao escolhidos.
// Ver docs/research/2026-11-17-paridade-visual-loja.md. Tokens semanticos do
// Tailwind (bg-muted, bg-yellow-400, bg-emerald-500) foram o que causou a
// divergencia visual: sao cores parecidas, nao as mesmas.
const COLOR_FOR: Record<NumberStatus | "selected", string> = {
  available: "bg-[#37495d] text-white hover:bg-[#37495d]/80",
  reserved: "bg-[#ffeb3b] text-black",
  sold: "bg-[#4caf50] text-black",
  selected: "bg-[#266c58] text-white",
};

/**
 * A célula de COTA INTEIRA, na ordem exata em que ela já estava no ar.
 *
 * Ordem de classe não muda o CSS resultante — mas o AC1 pede regressão da
 * grade de cota inteira, e a identidade visual da loja é cópia do que está
 * no ar (decisão do founder, 2026-11-20). Com a string intacta, o teste
 * compara literal contra literal em vez de "parece igual".
 */
const WHOLE_TITLE_CLASS =
  "rounded-[4px] py-2.5 text-sm font-normal tabular-nums transition-colors duration-300 ease-in-out disabled:cursor-default shadow-[0_0_2px_rgba(0,0,0,0.2),0_12px_24px_-4px_rgba(0,0,0,0.12)]";

/** A moldura da célula partida: o mesmo raio e a mesma sombra da de cima. */
const SPLIT_CELL_CLASS =
  "flex overflow-hidden rounded-[4px] shadow-[0_0_2px_rgba(0,0,0,0.2),0_12px_24px_-4px_rgba(0,0,0,0.12)]";

/** Uma banda: altura inteira da célula, metade da largura, clique próprio. */
const HALF_BAND_CLASS =
  "min-w-0 flex-1 border-r border-black/25 py-2.5 text-[11px] font-normal tabular-nums transition-colors duration-300 ease-in-out last:border-r-0 disabled:cursor-default";

/**
 * Um título da grade — PURO, sem hooks, para o AC1 ser verificável no render.
 *
 * Cota inteira: um <button>, com as classes de hoje na mesma ordem.
 * Divisível: duas bandas coladas dentro da mesma célula, cada uma com a cor
 * do seu estado e o seu próprio clique. O número aparece nas duas porque a
 * cor de fundo de cada banda é a do estado dela — um número centralizado
 * sobre as duas ficaria ilegível exatamente no caso que mais importa, o do
 * título com uma metade vendida (fundo claro) e outra livre (fundo escuro).
 */
export function TitleCell({
  cell,
  isSelected,
  onToggle,
}: {
  cell: GridCell;
  isSelected: (unit: SelectedUnit) => boolean;
  onToggle: (unit: SelectedUnit, status: NumberStatus) => void;
}) {
  const label = String(cell.number).padStart(2, "0");

  if (cell.bands.length === 1 && cell.bands[0].half === null) {
    const band = cell.bands[0];
    const selected = isSelected({ number: cell.number, half: null });
    return (
      <button
        type="button"
        disabled={band.status !== "available"}
        onClick={() => onToggle({ number: cell.number, half: null }, band.status)}
        className={`${WHOLE_TITLE_CLASS} ${
          selected ? COLOR_FOR.selected : COLOR_FOR[band.status]
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className={SPLIT_CELL_CLASS}>
      {cell.bands.map((band) => {
        const unit = { number: cell.number, half: band.half };
        const selected = isSelected(unit);
        return (
          <button
            key={band.half ?? "inteiro"}
            type="button"
            disabled={band.status !== "available"}
            onClick={() => onToggle(unit, band.status)}
            aria-label={`Título ${label}, metade ${band.half}`}
            title={`Título ${label} — metade ${band.half}`}
            className={`${HALF_BAND_CLASS} ${
              selected ? COLOR_FOR.selected : COLOR_FOR[band.status]
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function NumberGrid({
  tenantSlug,
  productSlug,
  numbers,
  announcement,
}: {
  tenantSlug: string;
  productSlug: string;
  /**
   * Uma entrada por UNIDADE VENDÁVEL, como o estoque as guarda: número +
   * metade + estado. Num sorteio divisível são DUAS por número.
   *
   * ⚠️ O nome `numbers` ficou, embora a lista não seja mais de números: o
   * AC2 da LTM-20 inspeciona esta prop PELO NOME
   * (`tests/money-path/expiracao-entre-compradores.test.ts:180`,
   * `grade?.props.numbers`) para provar que a grade não pinta de amarelo um
   * número já livre. Renomear aqui quebraria uma regressão de outra story,
   * em arquivo fora da fronteira desta — e o acréscimo de `half` é
   * compatível com o que aquele teste lê. O rename é de quem for dono
   * daquele teste.
   */
  numbers: { number: number; half: number; status: NumberStatus }[];
  /** Os dois valores do anúncio, montados no servidor (AC3). */
  announcement: RaffleAnnouncement;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedUnit[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const divisible = announcement.isDivisible;
  const unitName = announcement.unit;

  const cells = useMemo(
    () => buildGridCells(numbers, { isDivisible: divisible }),
    [numbers, divisible],
  );

  const counts = useMemo(() => {
    const c = { available: 0, reserved: 0, sold: 0 };
    for (const n of numbers) c[n.status]++;
    return c;
  }, [numbers]);

  const selectedKeys = useMemo(
    () => new Set(selected.map(unitKeyOf)),
    [selected],
  );

  function isSelected(unit: SelectedUnit) {
    return selectedKeys.has(unitKeyOf(unit));
  }

  function toggle(unit: SelectedUnit, status: NumberStatus) {
    if (status !== "available") return;
    setSelected((prev) => toggleUnit(prev, unit));
  }

  // O total em CENTAVOS INTEIROS, a partir da string decimal do anúncio.
  // `preço / 2 * quantidade` em `number` é ponto flutuante num caminho de
  // dinheiro (`money.ts:12-20`), e o valor que a tela soma é o que o
  // comprador aceita pagar. `null` quando o preço da unidade não existe —
  // sorteio divisível com preço que não divide exato em centavos, que o
  // domínio recusa criar e a reserva barra como rede de segurança.
  const unitCents =
    announcement.unitPriceText === null ? null : toCents(announcement.unitPriceText);
  const totalText =
    unitCents === null ? null : fromCents(unitCents * selected.length);

  function submit() {
    setError(null);
    startTransition(async () => {
      // O contrato de reserva é lista de UNIDADES VENDÁVEIS (LTM-02, AC9).
      // `half: null` quer dizer "o título inteiro"; `half: 1` ou `2`, uma
      // metade nomeada — e é a grade partida desta story que finalmente as
      // envia.
      const result = await reserveSelectedNumbers({
        tenantSlug,
        productSlug,
        units: unitsForReserve(selected),
        phone,
      });
      // `"error" in result` em vez de `result?.error`: o retorno da action é
      // uma união de `{ orderId }` com `{ error }`, e o `typecheck` passa a
      // exigir o estreitamento explícito — o mesmo padrão que
      // `tests/helpers/actions.ts` já usa. Antes o TypeScript normalizava a
      // união (acrescentando `error?: undefined` a cada ramo) porque todos
      // os `return` eram literais no mesmo corpo de função; agora um dos
      // ramos vem de dentro de `db.transaction()` e a normalização não se
      // aplica mais.
      if ("error" in result) {
        setError(result.error);
        return;
      }
      toast.success(divisible ? "Metades reservadas!" : "Números reservados!");
      router.push(`/loja/${tenantSlug}/${productSlug}/pedido/${result.orderId}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 pt-3">
      {/* AC2 — a contagem nomeia a unidade em sorteio divisível. Em cota
          inteira o texto é o de hoje, medido na Sorteamos, e não muda. */}
      <div className="flex gap-2 text-xs font-medium">
        <span className="flex-1 rounded-[5px] bg-[#6c757d] px-3 py-2 text-center text-white">
          {counts.available} {divisible ? `${unitName.many} livres` : "Livres"}
        </span>
        <span className="flex-1 rounded-[5px] bg-[#ffeb3b] px-3 py-2 text-center text-black">
          {counts.reserved} {divisible ? `${unitName.many} reservadas` : "Reservados"}
        </span>
        <span className="flex-1 rounded-[5px] bg-[#4caf50] px-3 py-2 text-center text-black">
          {counts.sold} {divisible ? `${unitName.many} pagas` : "Pagos"}
        </span>
      </div>

      <AvailabilityWarning available={counts.available} />

      {/* AC3 — OS DOIS VALORES JUNTOS, e só onde se compra metade.
          O preço da metade ao lado do que ELA concorre. Mostrar o prêmio
          cheio aqui seria induzir a erro: quem compra meia cota concorre a
          metade (claims-ledger.md; risco [Alto] da story). */}
      {divisible && (
        <div className="rounded-[5px] bg-black/40 px-3 py-2 text-xs text-white">
          Cada título está partido ao meio: cada lado é uma{" "}
          <b>{unitName.one}</b>, com dono próprio.
          {announcement.unitPriceText !== null && (
            <>
              {" "}
              Uma {unitName.one} custa{" "}
              <b className="tabular-nums">
                {formatCurrency(Number(announcement.unitPriceText))}
              </b>
              {announcement.unitPrizeText !== null ? (
                <>
                  {" "}
                  e concorre a{" "}
                  <b className="tabular-nums">
                    {formatCurrency(Number(announcement.unitPrizeText))}
                  </b>
                  .
                </>
              ) : (
                "."
              )}
            </>
          )}
        </div>
      )}

      {/* SEIS colunas, como no original — nao sete. Com menos colunas a celula
          fica maior e o numero mais legivel, que e o efeito que se quer. */}
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
        {cells.map((cell) => (
          <TitleCell
            key={cell.number}
            cell={cell}
            isSelected={isSelected}
            onToggle={toggle}
          />
        ))}
      </div>

      {/* Fixa no rodape, nao `sticky` dentro do fluxo: na loja da Sorteamos
          isto e a barra do app, com topo arredondado e sem borda. Medido. */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[999] flex flex-col gap-2 rounded-t-2xl bg-[#161c24] px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-1">
            {selected.slice(0, 8).map((unit) => (
              <span
                key={unitKeyOf(unit)}
                className="rounded-[6px] bg-[#198754] px-2 py-0.5 text-xs text-white"
              >
                {String(unit.number).padStart(2, "0")}
                {unit.half !== null && ` (${unit.half}ª)`}
              </span>
            ))}
            {selected.length > 8 && (
              <span className="text-xs text-white/70">+{selected.length - 8}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="flex h-[60px] w-full items-center justify-between rounded-[5px] bg-[#198754] px-4 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0_rgba(0,0,0,0.14),0_1px_5px_0_rgba(0,0,0,0.12)]"
          >
            <span className="flex items-center gap-2 text-base font-normal">
              <CircleCheck className="size-5" />
              Quero participar
            </span>
            <span className="text-base font-semibold tabular-nums">
              {totalText === null ? "—" : formatCurrency(Number(totalText))}
            </span>
          </button>
        </div>
      )}

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          {/* AC2 — o resumo do carrinho nomeia a unidade. "N unidade(s)" era
              o número solto que o GLOSSARY nomeia como o perigo: num sorteio
              divisível, 10 são dez METADES, cinco títulos. */}
          <p className="rounded-md bg-muted p-3 text-sm">
            Você está adquirindo{" "}
            <b>
              {selected.length}{" "}
              {selected.length === 1 ? unitName.one : unitName.many}
            </b>{" "}
            — {totalText === null ? "—" : formatCurrency(Number(totalText))}
            {divisible && announcement.unitPrizeText !== null && (
              <>
                . Cada {unitName.one} concorre a{" "}
                {formatCurrency(Number(announcement.unitPrizeText))}.
              </>
            )}
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Informe seu telefone</Label>
            <Input
              id="phone"
              placeholder="(11) 98888-7777"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Ao confirmar, você declara que leu e concorda com os termos de uso.
          </p>
          <DialogFooter>
            <Button onClick={submit} disabled={isPending || !phone} className="w-full">
              {isPending ? "Reservando..." : "Concluir Reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
