import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Lightbulb } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ESTRATEGIAS } from "@/lib/estrategias";

export const Route = createFileRoute("/_authenticated/estrategias")({
  head: () => ({
    meta: [
      { title: "Táticas e estratégias do jogo do bicho — Bicho Stats" },
      {
        name: "description",
        content:
          "Guia completo do básico ao avançado: gestão de banca, leitura de bichos quentes, atrasômetro, montagem de jogo e plano semanal.",
      },
      { property: "og:title", content: "Táticas e estratégias do jogo do bicho — Bicho Stats" },
      {
        property: "og:description",
        content: "Do básico ao avançado: como montar seu jogo com método em vez de palpite.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Estrategias,
});

const NIVEIS = ["Todos", "Básico", "Intermediário", "Avançado"] as const;

function Estrategias() {
  const [nivel, setNivel] = useState<(typeof NIVEIS)[number]>("Todos");
  const lista = ESTRATEGIAS.filter((e) => nivel === "Todos" || e.nivel === nivel);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3">
          <GraduationCap className="size-7 text-gold" />
          <h1 className="text-3xl sm:text-4xl">Táticas e estratégias</h1>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          O pacote completo e explicativo para montar seu jogo com método: do primeiro palpite
          consciente até a leitura cruzada por horário.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {NIVEIS.map((n) => (
            <Button
              key={n}
              size="sm"
              variant={nivel === n ? "default" : "outline"}
              onClick={() => setNivel(n)}
            >
              {n}
            </Button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {lista.map((e) => (
            <Card key={e.id} className="cartao-sombra">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{e.nivel}</Badge>
                </div>
                <CardTitle className="text-2xl">{e.titulo}</CardTitle>
                <CardDescription>{e.resumo}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {e.passos.map((p, i) => (
                    <li key={p} className="flex gap-3">
                      <span className="font-display text-lg leading-none text-gold">{i + 1}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 flex gap-2 rounded-md border border-border/60 bg-card/50 p-3 text-sm text-muted-foreground">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold" />
                  {e.dica}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Conteúdo educativo e estatístico. Nenhuma estratégia garante prêmio. Jogue com
          responsabilidade.
        </p>
      </main>
    </div>
  );
}
