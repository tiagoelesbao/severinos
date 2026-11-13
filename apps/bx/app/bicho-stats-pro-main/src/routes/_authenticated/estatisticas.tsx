import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sincronizarResultados } from "@/lib/sorteios.functions";
import { EMOJIS, formatarData, nomeGrupo, type Sorteio } from "@/lib/bicho";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas do jogo do bicho — Bicho Stats" },
      {
        name: "description",
        content:
          "Frequência dos 25 bichos, atrasos, milhares, centenas e dezenas mais sorteadas por banca e horário.",
      },
      { property: "og:title", content: "Estatísticas do jogo do bicho — Bicho Stats" },
      {
        property: "og:description",
        content: "Frequência, atraso e números quentes do jogo do bicho por banca e horário.",
      },
    ],
  }),
  component: Estatisticas,
});

function diasAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function Estatisticas() {
  const queryClient = useQueryClient();
  const [dias, setDias] = useState("30");
  const [premio, setPremio] = useState("todos");
  const [extracao, setExtracao] = useState("todas");

  const { data: sorteios = [], isLoading } = useQuery({
    refetchInterval: 2 * 60_000,
    refetchOnWindowFocus: true,
    queryKey: ["sorteios", dias],
    queryFn: async (): Promise<Sorteio[]> => {
      const { data, error } = await supabase
        .from("sorteios")
        .select("*")
        .gte("data_sorteio", diasAtras(Number(dias)))
        .order("data_sorteio", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Sorteio[];
    },
  });

  const { data: favoritos = [] } = useQuery({
    queryKey: ["favoritos"],
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase.from("favoritos").select("grupo");
      if (error) throw error;
      return (data ?? []).map((f) => f.grupo as number);
    },
  });

  const sincronizar = useMutation({
    mutationFn: () => sincronizarResultados(),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(`Resultados atualizados (${r.total} números).`);
        queryClient.invalidateQueries({ queryKey: ["sorteios"] });
      } else {
        toast.error("A fonte não respondeu agora. Tente de novo em instantes.");
      }
    },
  });

  const alternarFavorito = useMutation({
    mutationFn: async (grupo: number) => {
      const { data: sessao } = await supabase.auth.getUser();
      const userId = sessao.user?.id;
      if (!userId) throw new Error("sem sessão");
      if (favoritos.includes(grupo)) {
        const { error } = await supabase.from("favoritos").delete().eq("grupo", grupo);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favoritos").insert({ grupo, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favoritos"] }),
  });

  const extracoes = useMemo(
    () => Array.from(new Set(sorteios.map((s) => s.extracao))).sort(),
    [sorteios],
  );

  const filtrados = useMemo(
    () =>
      sorteios.filter(
        (s) =>
          (premio === "todos" || s.premio === Number(premio)) &&
          (extracao === "todas" || s.extracao === extracao),
      ),
    [sorteios, premio, extracao],
  );

  const frequencia = useMemo(() => {
    const contagem = new Map<number, number>();
    for (const s of filtrados) contagem.set(s.grupo, (contagem.get(s.grupo) ?? 0) + 1);
    return Array.from({ length: 25 }, (_, i) => ({
      grupo: i + 1,
      total: contagem.get(i + 1) ?? 0,
    })).sort((a, b) => b.total - a.total);
  }, [filtrados]);

  const atrasos = useMemo(() => {
    const concursos = Array.from(
      new Set(filtrados.map((s) => `${s.data_sorteio}|${s.extracao}`)),
    ).sort((a, b) => (a > b ? -1 : 1));
    const indice = new Map(concursos.map((c, i) => [c, i]));
    const ultimo = new Map<number, number>();
    for (const s of filtrados) {
      const pos = indice.get(`${s.data_sorteio}|${s.extracao}`) ?? 0;
      const atual = ultimo.get(s.grupo);
      if (atual === undefined || pos < atual) ultimo.set(s.grupo, pos);
    }
    return Array.from({ length: 25 }, (_, i) => ({
      grupo: i + 1,
      atraso: ultimo.get(i + 1) ?? concursos.length,
      nunca: !ultimo.has(i + 1),
    })).sort((a, b) => b.atraso - a.atraso);
  }, [filtrados]);

  function topNumeros(tamanho: number) {
    const contagem = new Map<string, number>();
    for (const s of filtrados) {
      const chave = s.numero.slice(4 - tamanho);
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
    return Array.from(contagem.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }

  const comparacao = useMemo(() => {
    const mapa = new Map<string, { total: number; contagem: Map<number, number> }>();
    for (const s of sorteios.filter((x) => premio === "todos" || x.premio === Number(premio))) {
      const atual = mapa.get(s.extracao) ?? { total: 0, contagem: new Map<number, number>() };
      atual.total += 1;
      atual.contagem.set(s.grupo, (atual.contagem.get(s.grupo) ?? 0) + 1);
      mapa.set(s.extracao, atual);
    }
    return Array.from(mapa.entries())
      .map(([nome, info]) => {
        const top = Array.from(info.contagem.entries()).sort((a, b) => b[1] - a[1])[0];
        return {
          extracao: nome,
          total: info.total,
          topGrupo: top?.[0] ?? 0,
          topTotal: top?.[1] ?? 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [sorteios, premio]);

  const maxFreq = frequencia[0]?.total || 1;
  const ultimaData = sorteios[0]?.data_sorteio;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl">Estatísticas</h1>
            <p className="text-sm text-muted-foreground">
              {filtrados.length} números analisados
              {ultimaData ? ` · último resultado em ${formatarData(ultimaData)}` : ""}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => sincronizar.mutate()}
            disabled={sincronizar.isPending}
          >
            <RefreshCw className={sincronizar.isPending ? "size-4 animate-spin" : "size-4"} />
            Atualizar resultados
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Select value={dias} onValueChange={setDias}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Select value={premio} onValueChange={setPremio}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os prêmios</SelectItem>
              <SelectItem value="1">Só 1º (cabeça)</SelectItem>
              <SelectItem value="2">2º prêmio</SelectItem>
              <SelectItem value="3">3º prêmio</SelectItem>
              <SelectItem value="4">4º prêmio</SelectItem>
              <SelectItem value="5">5º prêmio</SelectItem>
            </SelectContent>
          </Select>
          <Select value={extracao} onValueChange={setExtracao}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os horários</SelectItem>
              {extracoes.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-muted-foreground">Carregando…</p>
        ) : sorteios.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-10 text-center text-muted-foreground">
              Ainda não há resultados salvos. Toque em “Atualizar resultados” para buscar os
              sorteios de hoje.
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="frequencia" className="mt-6">
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="frequencia">Bichos</TabsTrigger>
              <TabsTrigger value="atraso">Atraso</TabsTrigger>
              <TabsTrigger value="numeros">Números</TabsTrigger>
              <TabsTrigger value="comparar">Comparar</TabsTrigger>
            </TabsList>

            <TabsContent value="frequencia" className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>Mais e menos sorteados</CardTitle>
                  <CardDescription>Quantas vezes cada bicho saiu no período.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {frequencia.map((f) => (
                    <div key={f.grupo} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => alternarFavorito.mutate(f.grupo)}
                        aria-label={`Favoritar ${nomeGrupo(f.grupo)}`}
                        className="text-muted-foreground transition-colors hover:text-gold"
                      >
                        <Star
                          className={
                            favoritos.includes(f.grupo) ? "size-4 fill-gold text-gold" : "size-4"
                          }
                        />
                      </button>
                      <span className="w-32 shrink-0 text-sm">
                        {EMOJIS[f.grupo]} {String(f.grupo).padStart(2, "0")} {nomeGrupo(f.grupo)}
                      </span>
                      <Progress value={(f.total / maxFreq) * 100} className="h-2 flex-1" />
                      <span className="w-8 text-right text-sm tabular-nums">{f.total}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="atraso">
              <Card>
                <CardHeader>
                  <CardTitle>Bichos atrasados</CardTitle>
                  <CardDescription>
                    Há quantos sorteios cada bicho não aparece (com os filtros atuais).
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {atrasos.map((a) => (
                    <div
                      key={a.grupo}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2"
                    >
                      <span className="text-sm">
                        {EMOJIS[a.grupo]} {String(a.grupo).padStart(2, "0")} {nomeGrupo(a.grupo)}
                      </span>
                      <Badge variant={a.atraso > 10 ? "destructive" : "secondary"}>
                        {a.nunca ? `${a.atraso}+ sorteios` : `${a.atraso} sorteios`}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="numeros" className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["Milhares", 4],
                  ["Centenas", 3],
                  ["Dezenas", 2],
                ] as const
              ).map(([titulo, tamanho]) => (
                <Card key={titulo}>
                  <CardHeader>
                    <CardTitle>{titulo}</CardTitle>
                    <CardDescription>Mais repetidos no período.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {topNumeros(tamanho).map(([num, qtd]) => (
                      <div
                        key={num}
                        className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
                      >
                        <span className="numero-sorteio">{num}</span>
                        <span className="text-xs text-muted-foreground">{qtd}x</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="comparar">
              <Card>
                <CardHeader>
                  <CardTitle>Bancas e horários</CardTitle>
                  <CardDescription>
                    Volume de resultados e bicho campeão de cada extração.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comparacao.map((c) => (
                    <div
                      key={c.extracao}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                    >
                      <span className="font-medium">{c.extracao}</span>
                      <span className="text-sm text-muted-foreground">
                        {c.total} números · campeão {EMOJIS[c.topGrupo]} {nomeGrupo(c.topGrupo)} (
                        {c.topTotal}x)
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
