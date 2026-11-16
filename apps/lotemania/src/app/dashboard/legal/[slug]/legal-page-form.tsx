"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertSitePage } from "@/lib/actions/site-config";

export function LegalPageForm({
  slug,
  initialTitle,
  initialContent,
}: {
  slug: string;
  initialTitle: string;
  initialContent: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await upsertSitePage(slug, title, content);
      toast.success("Página salva.");
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Conteúdo</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-80"
        />
      </div>
      <Button onClick={submit} disabled={isPending} className="self-start">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}
