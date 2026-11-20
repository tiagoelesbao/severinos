"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { formatRemaining, remainingMs } from "./order-view";

// A contagem regressiva da reserva (LTM-14, AC1 e AC2).
//
// ════════════════════════════════════════════════════════════════════════
// O DEFEITO CLÁSSICO QUE ESTE ARQUIVO EXISTE PARA NÃO COMETER
//
// O jeito errado — e é o mais natural de escrever — é guardar a DURAÇÃO e
// descontar um segundo por tique:
//
//     const [restante, setRestante] = useState(30 * 60);   // ERRADO
//
// Isso reinicia em toda recarga de aba. O comprador que recarregou aos 28
// minutos volta a ver 30, acha que tem meia hora e perde os títulos com a
// tela aberta. Dois aparelhos mostrariam números diferentes do MESMO prazo.
//
// Aqui o único dado que atravessa é `deadlineMs`, o INSTANTE do vencimento,
// derivado de `product_numbers.reserved_until` pelo `buildOrderView`. A
// contagem é sempre `deadlineMs - agora`. Recarregar recalcula a mesma
// diferença; dois aparelhos calculam a mesma diferença; e nenhum dos dois
// pode se adiantar ao estoque, porque o prazo é o mesmo que a varredura de
// expiração lê.
//
// ── POR QUE `initialNowMs` VEM DO SERVIDOR
//
// A primeira renderização do cliente tem de produzir o MESMO texto que o
// HTML servido, senão o React acusa divergência de hidratação e a tela
// pisca. Então o primeiro valor usa o instante do servidor (o mesmo que
// gerou o HTML) e só o `useEffect` passa a usar o relógio do aparelho. A
// diferença entre os dois é o tempo de rede, e ela se corrige no primeiro
// tique.
//
// ── POR QUE A DIVISÃO EM DOIS COMPONENTES
//
// `useRouter()` LANÇA sob `renderToStaticMarkup` (*"invariant expected app
// router to be mounted"*), medido na LTM-03a e registrado em
// `payment-status.tsx`. Com a navegação e a exibição no mesmo componente, o
// AC2 seria inverificável sem jsdom. Então `ReservationCountdownView` é pura
// e é o que o teste renderiza; `ReservationCountdown` é a casca que sabe
// avisar o servidor.
// ════════════════════════════════════════════════════════════════════════

/** Um tique por segundo: a tela mostra `mm:ss`, nada mais fino é visível. */
const TICK_MS = 1000;

export interface ReservationCountdownViewProps {
  /** Quanto falta, em milissegundos. Zero significa vencida. */
  readonly remainingMs: number;
}

/**
 * O texto da contagem — exatamente o da tela observada.
 *
 * *"Você tem **29:17** para pagar"*, com o relógio em negrito.
 */
export function ReservationCountdownView({
  remainingMs: restante,
}: ReservationCountdownViewProps) {
  if (restante <= 0) {
    return (
      <p
        data-countdown-expired
        className="text-center text-sm font-semibold text-destructive"
      >
        O tempo para pagar terminou. Os títulos voltam a ficar disponíveis.
      </p>
    );
  }

  return (
    <p className="text-center text-base text-foreground">
      Você tem{" "}
      <strong data-countdown className="font-mono tabular-nums">
        {formatRemaining(restante)}
      </strong>{" "}
      para pagar
    </p>
  );
}

export interface ReservationCountdownProps {
  /** O INSTANTE do vencimento. Nunca uma duração — ver o bloco do topo. */
  readonly deadlineMs: number;
  /** O instante do servidor que gerou o HTML, para a hidratação casar. */
  readonly initialNowMs: number;
}

export function ReservationCountdown({
  deadlineMs,
  initialNowMs,
}: ReservationCountdownProps) {
  const router = useRouter();
  const [restante, setRestante] = useState(() =>
    remainingMs(deadlineMs, initialNowMs),
  );
  // O aviso ao servidor acontece UMA vez. Sem esta trava, cada tique depois
  // do vencimento dispararia um `refresh()` — um por segundo, para sempre.
  const avisado = useRef(false);

  useEffect(() => {
    function tique() {
      const agora = remainingMs(deadlineMs, Date.now());
      setRestante(agora);
      if (agora <= 0 && !avisado.current) {
        avisado.current = true;
        // ⚠️ AC2: a tela muda de estado SOZINHA. O texto acima já virou o de
        // vencido sem recarga nenhuma; este `refresh()` é o que faz o
        // SERVIDOR reavaliar o pedido e a página inteira acompanhar.
        router.refresh();
      }
    }

    tique();
    const id = setInterval(tique, TICK_MS);
    return () => clearInterval(id);
  }, [deadlineMs, router]);

  return <ReservationCountdownView remainingMs={restante} />;
}
