import { Hourglass, Info, TriangleAlert } from "lucide-react";

import { CampaignCard } from "@/components/loja/campaign-card";

import { PixSteps } from "./copy-pix";
import { QrToggle } from "./qr-toggle";
import type { OrderView } from "./order-view";

// Os SETE BLOCOS da tela de acompanhamento, na ordem observada (LTM-14).
//
// A ordem e os textos vêm da tela vista ao vivo em 2026-11-19
// (`docs/research/2026-11-18-inventario-sorteamos/fluxo-de-compra.md`), e os
// textos dos passos, do aviso âmbar e do QR são LITERAIS:
//
//   1. ampulheta + "Aguardando pagamento!" + "Realize o pagamento"
//   2. a contagem regressiva
//   3. os três passos numerados, com o campo do BR Code e o COPIAR
//   4. "Mostrar QR Code"
//   5. o aviso âmbar
//   6. o cartão da campanha
//   7. "Detalhes da sua compra"
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE A CONTAGEM E OS BOTÕES ENTRAM POR FENDA (`countdown`, `actions`)
//
// Os dois usam `useRouter()`, que LANÇA sob `renderToStaticMarkup`
// (*"invariant expected app router to be mounted"*) — medido na LTM-03a,
// registrado em `payment-status.tsx`. Se eles fossem montados aqui dentro, o
// único jeito de verificar a tela inteira seria jsdom, isto é: dependência
// nova no caminho do dinheiro.
//
// Com fenda, a PÁGINA injeta os componentes de verdade e o TESTE injeta as
// variantes puras (`ReservationCountdownView`). O que se renderiza na suíte
// é a tela inteira, com o `OrderView` de verdade — que é o que o AC5 precisa
// para varrer o HTML servido.
// ════════════════════════════════════════════════════════════════════════

/** O aviso âmbar, no texto exato. Aparece no corpo e DE NOVO abaixo do QR. */
export function AmberWarning() {
  return (
    <p
      data-amber-warning
      className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs leading-snug text-amber-200"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
      <span>
        Este pagamento só pode ser realizado dentro do tempo. Após este
        período, caso o pagamento não seja confirmado, os títulos voltam a
        ficar disponíveis.
      </span>
    </p>
  );
}

/**
 * O cabeçalho de estado (bloco 1).
 *
 * ⚠️ `paid` e `expired` da Sorteamos NÃO foram observados. O cabeçalho de
 * `waiting` é o medido, palavra por palavra; os outros dois são o mínimo
 * honesto — e a story os mantém `[CONFIRMAR]`.
 */
function StateHeader({ state }: { readonly state: OrderView["state"] }) {
  if (state === "paid") {
    return (
      <div className="flex flex-col items-center gap-1" data-state-header="paid">
        <p className="text-lg font-bold">Pagamento confirmado!</p>
        <p className="text-sm text-muted-foreground">
          Seus títulos já estão disponíveis abaixo.
        </p>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div
        className="flex flex-col items-center gap-1"
        data-state-header="expired"
      >
        <p className="text-lg font-bold">Reserva expirada</p>
        <p className="text-sm text-muted-foreground">
          Os títulos voltaram a ficar disponíveis para outros compradores.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-1"
      data-state-header="waiting"
    >
      <div className="flex items-center gap-2">
        {/* A ampulheta dourada, animada — medida na tela observada. */}
        <Hourglass
          data-hourglass
          className="size-5 animate-[spin_3s_linear_infinite] text-amber-400"
        />
        <p className="text-lg font-bold">Aguardando pagamento!</p>
      </div>
      <p className="text-sm text-muted-foreground">Realize o pagamento</p>
    </div>
  );
}

/** Uma linha do bloco 7: rótulo em negrito, valor ao lado. */
function DetailRow({
  label,
  value,
  testId,
}: {
  readonly label: string;
  readonly value: string;
  readonly testId: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-bold">{label}</span>
      <span {...{ [`data-detail-${testId}`]: "" }} className="text-xs">
        {value}
      </span>
    </div>
  );
}

export interface OrderScreenProps {
  readonly view: OrderView;
  /** A contagem (bloco 2). Ver o bloco do topo sobre as fendas. */
  readonly countdown?: React.ReactNode;
  /** Os botões de ação — gerar cobrança, ou simular pagamento. */
  readonly actions?: React.ReactNode;
}

export function OrderScreen({ view, countdown, actions }: OrderScreenProps) {
  const esperando = view.state === "waiting";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5" data-order-screen>
      {/* ── 1. Cabeçalho de estado ─────────────────────────────────────── */}
      <StateHeader state={view.state} />

      {/* ── 2. Contagem regressiva ─────────────────────────────────────── */}
      {countdown}

      {/* ── 3. Os três passos, com o campo e o COPIAR (ou o "gerando") ── */}
      {esperando ? <PixSteps brCode={view.brCode} /> : null}

      {actions ? <div className="flex justify-center">{actions}</div> : null}

      {/* ── 4. Mostrar QR Code, com o aviso âmbar repetido dentro ──────── */}
      {esperando && view.brCode ? (
        <QrToggle showByDefault={view.showQrByDefault}>
          <AmberWarning />
        </QrToggle>
      ) : null}

      {/* ── 5. O aviso âmbar ───────────────────────────────────────────── */}
      {esperando ? <AmberWarning /> : null}

      {/* ── 6. O cartão da campanha — o MESMO do catálogo ──────────────── */}
      {view.campaign ? (
        <CampaignCard
          title={view.campaign.title}
          subtitle={view.campaign.subtitle}
          imageUrl={view.campaign.imageUrl}
        />
      ) : null}

      {/* ── 7. Detalhes da sua compra ──────────────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-xl border p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Info className="size-4 text-muted-foreground" />
          Detalhes da sua compra
        </p>
        <p className="font-mono text-[11px] text-muted-foreground" data-order-id>
          {view.orderId}
        </p>

        <DetailRow
          label="Comprador:"
          value={view.details.buyerName}
          testId="buyer"
        />
        <DetailRow
          label="Telefone:"
          value={view.details.buyerPhone}
          testId="phone"
        />
        <DetailRow
          label="Situação:"
          value={view.details.situation}
          testId="situation"
        />
        <DetailRow
          label="Data/horário:"
          value={view.details.createdAt}
          testId="created"
        />
        <DetailRow
          label="Expira em:"
          value={view.details.expiresAt}
          testId="expires"
        />
        <DetailRow
          label="Quantidade:"
          value={String(view.details.quantity)}
          testId="quantity"
        />
        <DetailRow label="Total:" value={view.details.total} testId="total" />

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold">Títulos:</span>
          {view.titles ? (
            <div className="flex flex-wrap gap-1.5" data-titles>
              {view.titles.map((titulo) => (
                <span
                  key={titulo}
                  className="rounded-md border bg-muted px-2 py-1 font-mono text-xs tabular-nums"
                >
                  {titulo}
                </span>
              ))}
            </div>
          ) : (
            // Os títulos NÃO são listados antes do pagamento — é o que a tela
            // observada faz, e é coerente: a reserva pode vencer e eles
            // voltam ao estoque.
            <span
              data-titles-pending
              className="flex items-start gap-1.5 text-xs text-muted-foreground"
            >
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Os títulos serão disponibilizados quando o pagamento for
              identificado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
