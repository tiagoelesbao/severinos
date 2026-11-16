"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { createFaq } from "@/lib/actions/site-config";

export function FaqForm() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!question.trim() || !answer.trim()) return;
    startTransition(async () => {
      await createFaq(question, answer);
      setQuestion("");
      setAnswer("");
      toast.success("Pergunta adicionada.");
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="question">Pergunta</Label>
        <Input id="question" value={question} onChange={(e) => setQuestion(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="answer">Resposta</Label>
        <Textarea id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      </div>
      <Button onClick={submit} disabled={isPending} className="self-start">
        {isPending ? "Adicionando..." : "Adicionar"}
      </Button>
    </Card>
  );
}
