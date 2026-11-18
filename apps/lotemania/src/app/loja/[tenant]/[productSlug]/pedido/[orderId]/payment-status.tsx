"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { simulatePayment } from "@/lib/actions/checkout";
import { ensurePixCharge } from "@/lib/actions/pix-charge";

// O que o comprador vê enquanto o pedido não fecha (LTM-03b, AC8 e AC13).
//
// ════════════════════════════════════════════════════════════════════════
// "SIMULAR PAGAMENTO" SAI DO CAMINHO QUANDO EXISTE CAMINHO DE DINHEIRO
//
// O botão não é removido, e isso é decisão registrada: `simulatePayment`
// continua sendo o caminho de teste e continua chamando `settle-order` — a
// MESMA função que o webhook chama, que é o que impede o caminho de teste e
// o do dinheiro de divergirem (AC-C3 da LTM-03a).
//
// O que muda é QUANDO ele aparece: só quando o operador não tem gateway
// ativo. Com gateway ligado, um botão que marca o pedido como pago sem
// dinheiro entrar é um caminho para fraude de um clique na loja pública.
// Sem gateway, ele é o único jeito de o operador ver o fluxo funcionando.
//
// ⚠️ O QR VISUAL NÃO É RENDERIZADO, e é omissão DECLARADA, não esquecimento.
// Desenhar a matriz do QR exige um codificador (Reed-Solomon, seleção de
// versão, máscara) que não existe em `package.json` — e `package.json` está
// fora do conjunto de arquivos desta story, então acrescentar dependência no
// caminho do dinheiro sem passar por @architect seria decidir por ele. O que
// vai ao ar é o BR Code copia-e-cola, que é o artefato PAGÁVEL: todo app de
// banco aceita "Pix copia e cola". Registrado no Dev Agent Record.
// ════════════════════════════════════════════════════════════════════════

export interface PixChargeProps {
  readonly referenceCode: string;
  readonly brCode: string;
  readonly expiresAt: Date;
}

export interface PaymentStatusProps {
  readonly orderId: string;
  readonly status: string;
  /** Existe gateway LIGADO para este operador? Decide o AC13. */
  readonly hasActiveGateway: boolean;
  /** A cobrança GRAVADA — vinda de `pix_charges`, nunca de memória (AC8). */
  readonly charge: PixChargeProps | null;
}

/**
 * O que a tela do pedido mostra — a casca que sabe navegar.
 *
 * ⚠️ ELA NÃO DECIDE NADA. A decisão (qual botão aparece) mora em
 * `PaymentStatusView`, e a separação tem causa medida: `useRouter()` exige
 * um roteador montado e LANÇA sob `renderToStaticMarkup`
 * (*"invariant expected app router to be mounted"*). Com a decisão e a
 * navegação no mesmo componente, o AC13 — "o botão de simular NÃO é
 * renderizado quando há gateway" — seria inverificável sem jsdom e sem
 * biblioteca de teste de componente, isto é: sem dependência nova.
 *
 * Então a navegação entra por `onSettled`, e o que o teste renderiza é a
 * decisão.
 */
export function PaymentStatus(props: PaymentStatusProps) {
  const router = useRouter();
  return <PaymentStatusView {...props} onSettled={() => router.refresh()} />;
}

export function PaymentStatusView({
  orderId,
  status,
  hasActiveGateway,
  charge,
  onSettled,
}: PaymentStatusProps & {
  /** Chamada depois de toda ação que pode ter mudado o pedido. */
  readonly onSettled?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (status === "paid") {
    return <Badge>Pago</Badge>;
  }

  // ── Com gateway ativo: o caminho é a cobrança de verdade.
  if (hasActiveGateway) {
    if (charge) {
      return (
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline">Aguardando pagamento</Badge>
          <Button
            size="sm"
            variant="outline"
            data-copy-br-code
            onClick={() => {
              void navigator.clipboard?.writeText(charge.brCode);
              setCopiado(true);
            }}
          >
            {copiado ? "Código copiado" : "Copiar código Pix"}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-end gap-2">
        <Badge variant="outline">Aguardando pagamento</Badge>
        <Button
          size="sm"
          disabled={isPending}
          data-create-pix-charge
          onClick={() =>
            startTransition(async () => {
              const result = await ensurePixCharge(orderId);
              // Recusa é NOMEADA na tela. "Erro ao gerar cobrança" deixaria
              // o comprador sem saber se tenta de novo ou procura o
              // suporte — e as causas são bem diferentes entre si
              // (credencial do operador, valor abaixo do mínimo, limite de
              // taxa).
              setErro(result.ok ? null : result.reason);
              onSettled?.();
            })
          }
        >
          {isPending ? "Gerando..." : "Gerar código Pix"}
        </Button>
        {erro ? (
          <p
            data-pix-charge-error
            className="max-w-xs text-right text-xs text-destructive"
          >
            {erro}
          </p>
        ) : null}
      </div>
    );
  }

  // ── Sem gateway ativo: o caminho de teste, como era.
  return (
    <div className="flex flex-col items-end gap-2">
      <Badge variant="outline">Aguardando pagamento</Badge>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        data-simulate-payment
        onClick={() =>
          startTransition(async () => {
            await simulatePayment(orderId);
            onSettled?.();
          })
        }
      >
        {isPending ? "Confirmando..." : "Simular pagamento (ambiente de teste)"}
      </Button>
    </div>
  );
}

/**
 * O BR Code copia-e-cola, exibido no corpo do pedido.
 *
 * Componente próprio porque é o que o AC8 verifica: o valor que aparece aqui
 * vem de `pix_charges`, lido pela página, e não de um retorno de função que
 * ficou em memória. O atributo `data-br-code` é o que o teste extrai do
 * render, em vez de comparar com uma string escrita à mão.
 */
export function PixCodeBlock({ charge }: { charge: PixChargeProps }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-muted-foreground">
        Pague com Pix copia e cola
      </p>
      <code
        data-br-code
        className="block overflow-x-auto rounded-md border bg-muted px-2 py-2 font-mono text-[11px] leading-relaxed break-all"
      >
        {charge.brCode}
      </code>
      <p className="text-xs text-muted-foreground">
        Cobrança {charge.referenceCode} · válida até{" "}
        {charge.expiresAt.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
