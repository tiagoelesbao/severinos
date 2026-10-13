import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Download, Play, Save, Scissors, Trash2, Undo2, Wand2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, IconButton, Section, Tip } from "./ui";

/** Kit de componentes do Video Studio (VEX-07) — estados e variantes. */

function KitPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [razor, setRazor] = useState(false);
  return (
    <div className="bg-surface-1 min-h-screen p-6 space-y-6 max-w-[720px]">
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Default</Button>
          <Button variant="accent"><Download className="size-4" /> Exportar</Button>
          <Button variant="ok"><Save className="size-4" /> Salvar</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" /> Remover…
          </Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
        </div>
      </Section>

      <Section title="Icon buttons (transporte)">
        <div className="flex items-center gap-1.5">
          <Tip label="Play/Pause (Espaço)"><IconButton><Play className="size-4" /></IconButton></Tip>
          <Tip label="Desfazer (Ctrl+Z)"><IconButton><Undo2 className="size-4" /></IconButton></Tip>
          <Tip label={razor ? "Cortar: ON (C)" : "Cortar (C)"}>
            <IconButton active={razor} onClick={() => setRazor((v) => !v)}>
              <Scissors className="size-4" />
            </IconButton>
          </Tip>
          <Tip label="Preparar criativo (Whisper + montagem)">
            <IconButton variant="ghost"><Wand2 className="size-4" /></IconButton>
          </Tip>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge tone="ok">ingestável</Badge>
          <Badge tone="warn">sem materiais</Badge>
          <Badge tone="danger">gate FAIL</Badge>
          <Badge tone="accent">plano</Badge>
          <Badge>neutro</Badge>
        </div>
      </Section>

      <Section title="ConfirmDialog (substitui window.confirm)">
        <p className="text-[12px] text-fg-muted mt-0">
          Clique em "Remover…" acima. Ações destrutivas sempre passam por aqui.
        </p>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remover criativo?"
        description="Isso apaga a pasta do criativo no disco, incluindo os Materiais Brutos gravados. Não há como desfazer."
        confirmLabel="Apagar tudo"
        danger
        onConfirm={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof KitPage> = {
  title: "Design System/Componentes",
  component: KitPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

export const Componentes: StoryObj<typeof KitPage> = {};
