"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateThemeConfig } from "@/lib/actions/site-config";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-8 cursor-pointer rounded border border-input bg-transparent"
        />
        <span className="font-mono text-sm text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}

export function ThemeForm({
  initialAccent,
  initialBackground,
  initialPanel,
}: {
  initialAccent: string;
  initialBackground: string;
  initialPanel: string;
}) {
  const [accent, setAccent] = useState(initialAccent);
  const [background, setBackground] = useState(initialBackground);
  const [panel, setPanel] = useState(initialPanel);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await updateThemeConfig({
        accentColor: accent,
        background,
        panelBackground: panel,
      });
      toast.success("Tema salvo.");
    });
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <ColorField label="Cor de destaque" value={accent} onChange={setAccent} />
      <ColorField label="Fundo" value={background} onChange={setBackground} />
      <ColorField label="Fundo dos painéis" value={panel} onChange={setPanel} />
      <Button onClick={submit} disabled={isPending} className="self-start">
        {isPending ? "Salvando..." : "Salvar tema"}
      </Button>
    </div>
  );
}
