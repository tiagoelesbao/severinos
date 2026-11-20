"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defineWinners } from "@/lib/actions/winners";
import type { DefineWinnersResult, PrizePlace } from "@/lib/raffles/define-winners";

// ════════════════════════════════════════════════════════════════════════
// O MODAL `Ganhadores` (LTM-27) — modelado de captura, não inventado
//
// A tela é a da Sorteamos, observada em quatro capturas do founder em
// 2026-11-19: data do sorteio editável, um campo de ganhador por prêmio, o
// aviso de dígitos, e `Fechar` / `Salvar`. O operador digita O NÚMERO; o
// sistema descobre sozinho quem comprou aquele título, se o sorteio é
// divisível e quantas pessoas o número tem.
//
// ── DUAS COISAS QUE A SORTEAMOS NÃO RESOLVE, E ESTA TELA RESOLVE
//
// 1. A MEIA COTA. Num sorteio divisível o título 42 tem DUAS pessoas. Lá a
//    meia cota não existe e um número tem um dono; aqui, resolver para um
//    ganhador só roubaria metade do prêmio de quem pagou. A tela continua
//    pedindo o número — quem decide quantos ganhadores saem dele é o rateio
//    da LTM-07.
//
// 2. O VALOR DE CADA LUGAR. O founder pediu poder cadastrar quantos
//    ganhadores quiser (2026-11-20), e o cadastro do sorteio guarda UM valor
//    de prêmio. Reusá-lo em cada lugar pagaria o prêmio N vezes, e não há de
//    onde derivar o valor do 2º — `prizes` é descrição livre sem valor.
//    Então o valor de cada lugar é CAMPO, digitado por quem sabe quanto ele
//    paga. Em branco = usa o valor do cadastro, que é o caso de um prêmio só.
//
// ⚠️ O FORMULÁRIO É EXPORTADO À PARTE DO DIÁLOGO, e isso é verificabilidade,
// não estilo: o `Dialog` do `@base-ui` monta o conteúdo num PORTAL, e portal
// não produz marcação em render de servidor. O teste do AC3 ("um campo por
// prêmio configurado") não teria o que ler. Mesmo recorte de
// `GatewayConfigForm` (`dashboard/integrations/payments/configure-gateway-dialog.tsx:101-109`).
// ════════════════════════════════════════════════════════════════════════

/** O que o `<input type="datetime-local">` aceita: `YYYY-MM-DDTHH:mm`. */
function localInputValue(iso: string | null): string {
  const quando = iso ? new Date(iso) : new Date();
  if (Number.isNaN(quando.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${quando.getFullYear()}-${pad(quando.getMonth() + 1)}-${pad(quando.getDate())}` +
    `T${pad(quando.getHours())}:${pad(quando.getMinutes())}`
  );
}

/** Uma linha de ganhador do modal, como o operador a preenche. */
interface WinnerLine {
  label: string;
  rawNumber: string;
  prizeDescription: string;
  rawPrizeAmount: string;
}

function lineFor(place: PrizePlace): WinnerLine {
  return {
    label: place.label,
    rawNumber: "",
    prizeDescription: place.description ?? "",
    rawPrizeAmount: "",
  };
}

export interface WinnersFormProps {
  productId: string;
  /**
   * Os prêmios configurados — o PONTO DE PARTIDA das linhas (AC3). O
   * operador acrescenta quantas quiser a partir daqui.
   */
  prizePlaces: readonly PrizePlace[];
  /** Quantos dígitos tem o título deste sorteio (AC6). */
  digits: number;
  /** A data do sorteio cadastrada, que o modal deixa corrigir (AC7). */
  drawDateIso: string | null;
  onSaved?: () => void;
}

export function WinnersForm({
  productId,
  prizePlaces,
  digits,
  drawDateIso,
  onSaved,
}: WinnersFormProps) {
  const [isPending, startTransition] = useTransition();
  const [announcedAt, setAnnouncedAt] = useState<string>(() =>
    localInputValue(drawDateIso),
  );
  const [lines, setLines] = useState<WinnerLine[]>(() => prizePlaces.map(lineFor));
  const [result, setResult] = useState<DefineWinnersResult | null>(null);

  function updateLine(index: number, patch: Partial<WinnerLine>) {
    setLines((atual) =>
      atual.map((linha, i) => (i === index ? { ...linha, ...patch } : linha)),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      // A action DEVOLVE a recusa em vez de lançar, e é por isso que não há
      // `try/catch` aqui pedindo desculpa genérica: não existe `error.tsx`
      // em `src/app`, e um throw deixaria este modal mudo.
      const saida = await defineWinners({
        productId,
        announcedAt: announcedAt || null,
        entries: lines.map((linha, prizeIndex) => ({
          prizeIndex,
          rawNumber: linha.rawNumber,
          prizeDescription: linha.prizeDescription,
          rawPrizeAmount: linha.rawPrizeAmount,
        })),
      });
      setResult(saida);

      if (!saida.ok) {
        toast.error(saida.refusal.message);
        return;
      }

      const recusados = saida.places.filter((place) => !place.ok);
      if (saida.recordedCount > 0) {
        toast.success(
          `${saida.recordedCount} ganhador(es) registrado(s).` +
            (recusados.length > 0 ? ` ${recusados.length} recusado(s).` : ""),
        );
        // Sem `router.refresh()`: o `revalidatePath` da action já devolve a
        // lista nova nesta mesma resposta. E `useRouter` tornaria este
        // formulário irrenderizável fora do contexto do app router, que é
        // onde o teste do AC3 o renderiza.
      } else {
        toast.error("Nenhum ganhador foi registrado. Veja a razão de cada linha.");
      }

      // Fecha só quando NADA foi recusado: a razão da recusa tem de ficar
      // legível na tela (AC2), e fechar o modal a apagaria.
      if (recusados.length === 0) onSaved?.();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`winners-date-${productId}`}>Data do sorteio</Label>
        <Input
          id={`winners-date-${productId}`}
          type="datetime-local"
          value={announcedAt}
          onChange={(event) => setAnnouncedAt(event.target.value)}
          data-winners-date
        />
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p>Informe os números sorteados de acordo com os prêmios.</p>
        <ul className="list-disc pl-4">
          <li>Informe os números corretamente, sem ponto ou vírgula.</li>
          <li data-winners-digits-hint>
            Utilize os dígitos corretos para os números. Essa campanha é de {digits}{" "}
            {digits === 1 ? "dígito" : "dígitos"}.
          </li>
          <li>
            O valor é o deste lugar de prêmio. Em branco, vale o valor declarado
            na aba Prêmios — que é o caso de um prêmio só.
          </li>
        </ul>
      </div>

      {lines.map((linha, index) => (
        <div
          key={`linha-${index}`}
          className="flex flex-col gap-1.5 rounded-md border p-2"
          data-winners-line={index}
        >
          <div className="flex items-center justify-between">
            <Label htmlFor={`winner-${productId}-${index}`}>
              Ganhador: {linha.prizeDescription.trim() || linha.label} *
            </Label>
            {lines.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Remover esta linha"
                onClick={() => setLines((atual) => atual.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          <Input
            id={`winner-${productId}-${index}`}
            name={`winner-${index}`}
            inputMode="numeric"
            autoComplete="off"
            // Sem `maxLength`: cortar `042` em `04` registraria ganhador do
            // título 4 em silêncio. A recusa com razão nomeada é do AC6.
            placeholder={`Número sorteado (${"0".repeat(Math.max(1, digits))})`}
            value={linha.rawNumber}
            onChange={(event) => updateLine(index, { rawNumber: event.target.value })}
            data-winner-field={index}
          />

          <div className="grid grid-cols-2 gap-1.5">
            <Input
              name={`prize-description-${index}`}
              autoComplete="off"
              placeholder="Descrição do prêmio"
              value={linha.prizeDescription}
              onChange={(event) =>
                updateLine(index, { prizeDescription: event.target.value })
              }
              data-winner-description={index}
            />
            <Input
              name={`prize-amount-${index}`}
              inputMode="decimal"
              autoComplete="off"
              // Ponto decimal, e o aviso está no texto da lista acima: o
              // valor vai para `toCents`, que recusa mais de duas casas em
              // vez de arredondar (`money.ts:18-20`).
              placeholder="Valor (ex.: 100000.00)"
              value={linha.rawPrizeAmount}
              onChange={(event) =>
                updateLine(index, { rawPrizeAmount: event.target.value })
              }
              data-winner-amount={index}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        data-winners-add
        onClick={() =>
          setLines((atual) => [
            ...atual,
            lineFor({
              index: atual.length,
              label: `Prêmio ${atual.length + 1}`,
              description: null,
            }),
          ])
        }
      >
        <Plus className="size-4" />
        Acrescentar ganhador
      </Button>

      {result && !result.ok && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
          data-winners-refusal={result.refusal.code}
        >
          {result.refusal.message}
        </p>
      )}

      {result?.ok && (
        <ul className="flex flex-col gap-1.5 text-xs">
          {result.places.map((place) =>
            place.ok ? (
              <li
                key={place.prizeIndex}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2"
                data-winners-place={place.prizeIndex}
                data-winners-place-ok="true"
              >
                <b>{place.prizeLabel}</b> · título {place.winningNumber} ·{" "}
                {place.recorded
                  .map(
                    (ganhador) =>
                      `${ganhador.winnerName}` +
                      (ganhador.winningHalf !== null
                        ? ` (metade ${ganhador.winningHalf})`
                        : "") +
                      ` — R$ ${ganhador.prizeAmount}`,
                  )
                  .join(" · ")}
              </li>
            ) : (
              <li
                key={place.prizeIndex}
                className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-destructive"
                data-winners-place={place.prizeIndex}
                data-winners-refusal={place.refusal.code}
              >
                <b>{place.prizeLabel}</b> · {place.refusal.message}
              </li>
            ),
          )}
        </ul>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onSaved?.()}>
          Fechar
        </Button>
        <Button type="submit" disabled={isPending}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function WinnersDialog({
  open,
  onOpenChange,
  title,
  ...formProps
}: WinnersFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ganhadores</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <WinnersForm {...formProps} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
