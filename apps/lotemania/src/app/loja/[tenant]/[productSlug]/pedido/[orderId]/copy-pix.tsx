"use client";

import { useState } from "react";

// Os três passos do pagamento e o botão COPIAR (LTM-14, AC3 e AC7).
//
// Os textos dos passos são LITERAIS da tela observada ao vivo em 2026-11-19
// (`docs/research/2026-11-18-inventario-sorteamos/fluxo-de-compra.md`).
// Reescrevê-los "melhor" romperia a paridade que é o ponto da story.
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE O CAMPO GUARDA O BR CODE INTEIRO, E A TELA O CORTA NO CSS
//
// O risco [Médio] da story é COPIAR copiando o texto truncado: o comprador
// cola no banco, o app recusa, e ele culpa a plataforma sem entender nada.
//
// Havia duas formas de reproduzir a tela observada, onde o código aparece
// cortado:
//
//   (a) truncar a STRING e manter o código inteiro só no botão
//   (b) manter a string inteira no campo e cortar a EXIBIÇÃO no CSS
//
// Esta é a (b), e a razão é o comprador que não usa o botão. Em (a), quem
// seleciona o campo com o dedo e copia à mão leva um código quebrado — e
// essa pessoa existe, principalmente em celular onde o botão às vezes não
// responde ao primeiro toque. Em (b) os DOIS caminhos entregam código
// pagável, e o defeito que o AC3 teme deixa de ter por onde acontecer: não
// existe, em nenhum ponto do arquivo, uma versão curta do código para ser
// copiada por engano.
//
// `copyBrCodeTo` recebe a área de transferência como ARGUMENTO. Não é
// enfeite de testabilidade: é o que permite ao teste LER o que foi copiado
// (AC3: *"Teste lê o conteúdo copiado"*) sem jsdom e sem simular clique.
// ════════════════════════════════════════════════════════════════════════

/** O mínimo que a área de transferência precisa saber fazer. */
export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

/**
 * Põe o BR Code **completo** na área de transferência.
 *
 * O argumento é a cobrança inteira, não uma string já preparada: receber a
 * string permitiria ao chamador passar a versão exibida, que é exatamente o
 * erro que o AC3 proíbe. Aqui só existe um campo a copiar.
 */
export async function copyBrCodeTo(
  clipboard: ClipboardLike | undefined,
  charge: { readonly brCode: string },
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(charge.brCode);
    return true;
  } catch {
    // Área de transferência negada pelo navegador (contexto não seguro, ou
    // permissão recusada). O campo continua selecionável à mão, e é por isso
    // que ele guarda o código inteiro.
    return false;
  }
}

/** Os três passos, nas palavras exatas da tela observada. */
export const PIX_STEPS = [
  "Copie o código PIX abaixo.",
  "Abra o app do seu banco e escolha a opção PIX, como se fosse fazer uma transferência.",
  "Selecione a opção PIX cópia e cola, cole a chave copiada e confirme o pagamento.",
] as const;

export interface PixStepsProps {
  /** O BR Code GRAVADO, ou `null` enquanto a cobrança não existir (AC7). */
  readonly brCode: string | null;
}

export function PixSteps({ brCode }: PixStepsProps) {
  const [copiado, setCopiado] = useState(false);

  return (
    <ol className="flex flex-col gap-4" data-pix-steps>
      {PIX_STEPS.map((texto, indice) => (
        <li key={texto} className="flex items-start gap-3">
          {/* Numeral em círculo verde — medido na tela observada. */}
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#198754] text-xs font-bold text-white">
            {indice + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm leading-snug">{texto}</p>
            {indice === 0 ? (
              brCode ? (
                <div className="flex items-stretch gap-2">
                  <input
                    readOnly
                    data-br-code-field
                    value={brCode}
                    aria-label="Código PIX copia e cola"
                    // `truncate` corta a EXIBIÇÃO; o valor continua inteiro.
                    className="min-w-0 flex-1 truncate rounded-md border bg-muted px-2 py-2 font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    data-copy-pix
                    onClick={() => {
                      void copyBrCodeTo(
                        typeof navigator === "undefined"
                          ? undefined
                          : navigator.clipboard,
                        { brCode },
                      ).then(setCopiado);
                    }}
                    className="shrink-0 rounded-md bg-[#198754] px-3 text-xs font-bold text-white hover:bg-[#198754]/90"
                  >
                    {copiado ? "COPIADO" : "COPIAR"}
                  </button>
                </div>
              ) : (
                // ⚠️ AC7: nunca campo vazio, nunca código falso. Enquanto a
                // cobrança não existir em `pix_charges`, o que vai no lugar
                // do campo é o aviso — e o botão que a cria fica ao lado,
                // porque renderizar a página é um GET e GET não cria
                // cobrança no provedor (decisão da LTM-03b).
                <p
                  data-pix-generating
                  className="rounded-md border border-dashed px-2 py-2 text-xs text-muted-foreground"
                >
                  Estamos gerando o seu código PIX. Assim que ele estiver
                  pronto, aparece aqui para você copiar.
                </p>
              )
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
