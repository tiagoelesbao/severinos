"use client";

import { useState } from "react";

// "Mostrar QR Code" — e o campo de configuração que ninguém lia (LTM-14, AC4).
//
// ════════════════════════════════════════════════════════════════════════
// O CAMPO EXISTIA E ERA MORTO
//
// `siteConfig.showQrCodeByDefault` está em
// `src/lib/validations/site-config.ts` e na tela de configurações do painel
// desde sempre, e NENHUM código da loja o consultava — conferido na story e
// reconferido aqui. O operador marcava a opção e nada acontecia. É a mesma
// classe de defeito de `reservationExpiryMinutes` e de
// `paymentGatewayProvider`: campo configurável na tela, ignorado pelo
// código.
//
// Este componente é o primeiro leitor dele. `showByDefault` decide o estado
// INICIAL, não o permanente: o comprador continua podendo abrir e fechar.
//
// ════════════════════════════════════════════════════════════════════════
// O QUADRO DO QR NÃO DESENHA UM QR, E ISSO É OMISSÃO DECLARADA
//
// Desenhar a matriz exige um codificador (Reed-Solomon, seleção de versão,
// máscara) que não existe em `package.json`, e acrescentar dependência no
// caminho do dinheiro é decisão de @architect — a LTM-03b registrou
// exatamente isso e a decisão não mudou. Mandar o BR Code para um gerador
// de QR de terceiros seria pior: entregaria o código de pagar do comprador
// a um serviço que não é nosso.
//
// Então o painel diz o que é verdade: o QR ainda não é desenhado aqui, e o
// caminho que FUNCIONA é o copia e cola. É a mesma regra do AC7 aplicada a
// outro artefato — nunca um código falso, nunca um quadro vazio fingindo
// ser um QR.
// ════════════════════════════════════════════════════════════════════════

export interface QrToggleProps {
  /** `siteConfig.showQrCodeByDefault` — decide o estado inicial (AC4). */
  readonly showByDefault: boolean;
  /** O aviso âmbar, que a tela observada REPETE abaixo do QR. */
  readonly children?: React.ReactNode;
}

export function QrToggle({ showByDefault, children }: QrToggleProps) {
  const [aberto, setAberto] = useState(showByDefault);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <button
          type="button"
          data-qr-toggle
          aria-expanded={aberto}
          onClick={() => setAberto((valor) => !valor)}
          className="shrink-0 rounded-full bg-muted px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80"
        >
          {aberto ? "Ocultar QR Code" : "Mostrar QR Code"}
        </button>
        <span className="h-px flex-1 bg-border" />
      </div>

      {aberto ? (
        <div data-qr-panel className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold">QR Code</p>
          <p className="text-center text-xs text-muted-foreground">
            Acesse o app do seu banco, escolha a opção de pagar com QR Code,
            escaneie o código acima e confirme o pagamento.
          </p>
          <p
            data-qr-unavailable
            className="rounded-md border border-dashed px-3 py-2 text-center text-xs text-muted-foreground"
          >
            A imagem do QR Code ainda não é gerada aqui. Use o código PIX copia
            e cola acima — todo app de banco aceita.
          </p>
          {children}
        </div>
      ) : null}
    </div>
  );
}
