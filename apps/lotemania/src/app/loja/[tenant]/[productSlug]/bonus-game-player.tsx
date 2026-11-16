"use client";

import { useState, useRef, useEffect, useTransition } from "react";
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
import { formatCurrency } from "@/lib/format";
import {
  purchaseBonusGamePlay,
  simulateBonusGamePaymentAndReveal,
} from "@/lib/actions/bonus-play";

type Kind = "awardedBox" | "rewardSpin" | "scratchCard";

const kindMeta: Record<Kind, { icon: string; title: string; verb: string }> = {
  awardedBox: { icon: "🎁", title: "Caixa Premiada", verb: "Abrir caixa" },
  rewardSpin: { icon: "🎡", title: "Roleta Premiada", verb: "Girar roleta" },
  scratchCard: { icon: "🎟️", title: "Raspadinha", verb: "Raspar" },
};

export function BonusGamePlayer({
  tenantSlug,
  kind,
  title,
  combos,
}: {
  tenantSlug: string;
  kind: Kind;
  title: string;
  combos: { id: string; quantity: number; price: string }[];
}) {
  const meta = kindMeta[kind];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"combos" | "phone" | "revealing" | "done">("combos");
  const [selectedCombo, setSelectedCombo] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [playId, setPlayId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setStep("combos");
    setSelectedCombo(null);
    setPlayId(null);
    setOutcome(null);
  }

  function buy() {
    if (!selectedCombo) return;
    startTransition(async () => {
      const result = await purchaseBonusGamePlay({ tenantSlug, kind, comboId: selectedCombo, phone });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setPlayId(result.playId!);
      setStep("revealing");
      const revealed = await simulateBonusGamePaymentAndReveal(result.playId!);
      if (revealed?.error) {
        toast.error(revealed.error);
        return;
      }
      setOutcome(revealed.outcome!);
      setStep("done");
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {meta.icon} {title}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {meta.icon} {title}
            </DialogTitle>
          </DialogHeader>

          {step === "combos" && (
            <div className="flex flex-col gap-2">
              {combos.map((combo) => (
                <button
                  key={combo.id}
                  onClick={() => {
                    setSelectedCombo(combo.id);
                    setStep("phone");
                  }}
                  className="flex items-center justify-between rounded-md border p-3 text-left hover:border-primary"
                >
                  <span>{combo.quantity}x</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatCurrency(Number(combo.price))}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === "phone" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Informe seu telefone</Label>
                <Input
                  placeholder="(11) 98888-7777"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={buy} disabled={isPending || !phone} className="w-full">
                  {isPending ? "Processando..." : `Pagar e ${meta.verb.toLowerCase()}`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "revealing" && <RevealAnimation kind={kind} />}

          {step === "done" && outcome && (
            <OutcomeReveal kind={kind} outcome={outcome} onPlayAgain={reset} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RevealAnimation({ kind }: { kind: Kind }) {
  const emoji = kind === "rewardSpin" ? "🎡" : kind === "scratchCard" ? "🎟️" : "🎁";
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <span className="animate-spin text-5xl">{emoji}</span>
      <p className="text-sm text-muted-foreground">Sorteando resultado...</p>
    </div>
  );
}

function OutcomeReveal({
  kind,
  outcome,
  onPlayAgain,
}: {
  kind: Kind;
  outcome: string[];
  onPlayAgain: () => void;
}) {
  if (kind === "scratchCard") {
    return (
      <div className="flex flex-col gap-3">
        {outcome.map((prize, i) => (
          <ScratchCell key={i} prize={prize} />
        ))}
        <Button variant="outline" onClick={onPlayAgain}>
          Jogar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {outcome.map((prize, i) => (
        <div
          key={i}
          className="rounded-md border border-primary bg-primary/10 p-4 text-center font-medium"
        >
          🏆 {prize}
        </div>
      ))}
      <Button variant="outline" onClick={onPlayAgain}>
        Jogar novamente
      </Button>
    </div>
  );
}

function ScratchCell({ prize }: { prize: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const scratching = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#4b5563";
    ctx.font = "14px sans-serif";
    ctx.fillText("Raspe aqui", 10, canvas.height / 2);
  }, []);

  function scratchAt(x: number, y: number) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!scratching.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    scratchAt(e.clientX - rect.left, e.clientY - rect.top);
  }

  return (
    <div className="relative h-16 overflow-hidden rounded-md border">
      <div className="flex h-full items-center justify-center font-medium">
        🏆 {prize}
      </div>
      {!revealed && (
        <canvas
          ref={canvasRef}
          width={320}
          height={64}
          className="absolute inset-0 h-full w-full cursor-pointer"
          onMouseDown={() => (scratching.current = true)}
          onMouseUp={() => {
            scratching.current = false;
            setRevealed(true);
          }}
          onMouseMove={handleMove}
          onMouseLeave={() => (scratching.current = false)}
        />
      )}
    </div>
  );
}
