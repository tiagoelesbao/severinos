import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  Clock,
  Hash,
  BarChart3,
  Check,
  ShieldCheck,
  Star,
  Zap,
  GraduationCap,
  RefreshCw,
  History,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sincronizarResultados } from "@/lib/sorteios.functions";
import { EMOJIS, formatarData, nomeGrupo, type Sorteio } from "@/lib/bicho";
import { AppHeader } from "@/components/AppHeader";
import { BotaoCheckout } from "@/components/BotaoCheckout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bicho Stats — Pare de apostar no achismo" },
      {
        name: "description",
        content:
          "Estatísticas do jogo do bicho em tempo real: bichos quentes, atrasados, milhares e dezenas que mais repetem. Resultado do dia grátis, análise completa para assinantes.",
      },
      { property: "og:title", content: "Bicho Stats — Pare de apostar no achismo" },
      {
        property: "og:description",
        content:
          "Bichos quentes, atrasados e números que mais repetem, atualizados a cada extração.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const BENEFICIOS = [
  {
    icone: TrendingUp,
    titulo: "Bichos quentes e frios",
    texto: "Ranking dos 25 animais por frequência real, extração por extração.",
  },
  {
    icone: Clock,
    titulo: "Atrasômetro",
    texto: "Veja quantos sorteios cada bicho está sem sair e ataque na hora certa.",
  },
  {
    icone: Hash,
    titulo: "Milhar, centena e dezena",
    texto: "Os números que mais repetem, com contagem exata em vez de palpite.",
  },
  {
    icone: BarChart3,
    titulo: "Comparação por horário",
    texto: "PPT, PTM, PT, PTV, PTN e Coruja lado a lado. Cada horário tem um padrão.",
  },
  {
    icone: Zap,
    titulo: "Atualização automática",
    texto: "Os resultados entram sozinhos, poucos minutos depois de cada extração.",
  },
  {
    icone: GraduationCap,
    titulo: "Táticas e estratégias exclusivas",
    texto: "Um guia do básico ao avançado para montar seu jogo com método, não com palpite.",
  },
  {
    icone: ShieldCheck,
    titulo: "Dados, não achismo",
    texto: "Tudo calculado do histórico oficial. Nenhuma promessa mágica.",
  },
  {
    icone: History,
    titulo: "Histórico sempre à mão",
    texto: "Consulte períodos diferentes sem depender de caderno, print ou memória.",
  },
  {
    icone: Target,
    titulo: "Filtros para decidir melhor",
    texto: "Analise por período, prêmio e extração para enxergar o recorte que importa.",
  },
];

const AULAS = [
  {
    nivel: "Básico",
    titulo: "Fundamentos e gestão de banca",
    texto:
      "Como funciona o tabuleiro, qual prêmio jogar e como dividir seu dinheiro para durar o mês inteiro.",
  },
  {
    nivel: "Intermediário",
    titulo: "Bichos quentes, atrasômetro e montagem do jogo",
    texto:
      "Quando confiar no bicho quente, em que janela atacar o atrasado e como combinar grupo, dezena, centena e milhar.",
  },
  {
    nivel: "Avançado",
    titulo: "Leitura por horário, ciclos e plano semanal",
    texto:
      "Cruze os rankings de cada extração, identifique blocos de dezenas ativos e siga uma rotina de 5 passos por semana.",
  },
];

const DEPOIMENTOS = [
  {
    nome: "Paulo R.",
    texto: "Eu anotava tudo em caderno. Agora abro o app e já sei quem está atrasado no PTV.",
  },
  {
    nome: "Cida M.",
    texto: "O ranking por horário mudou meu jeito de jogar. Parei de repetir bicho à toa.",
  },
  {
    nome: "Jhon S.",
    texto: "Resultado na hora e estatística junto. Vale mais que qualquer grupo de palpite.",
  },
];

function Landing() {
  const queryClient = useQueryClient();
  const { data: sorteios = [], dataUpdatedAt } = useQuery({
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryKey: ["sorteios-hoje"],
    queryFn: async (): Promise<Sorteio[]> => {
      const { data: ultimo } = await supabase
        .from("sorteios")
        .select("data_sorteio")
        .order("data_sorteio", { ascending: false })
        .limit(1);
      const dia = ultimo?.[0]?.data_sorteio;
      if (!dia) return [];
      const { data, error } = await supabase
        .from("sorteios")
        .select("*")
        .eq("data_sorteio", dia)
        .order("premio");
      if (error) throw error;
      return (data ?? []) as Sorteio[];
    },
  });

  const atualizar = useMutation({
    mutationFn: () => sincronizarResultados(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["sorteios-hoje"] }),
  });

  useEffect(() => {
    const id = setInterval(() => atualizar.mutate(), 5 * 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const porExtracao = sorteios.reduce<Record<string, Sorteio[]>>((acc, s) => {
    (acc[s.extracao] ??= []).push(s);
    return acc;
  }, {});
  const dia = sorteios[0]?.data_sorteio;
  const horaAtualizacao = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "";

  return (
    <div className="min-h-screen">
      <AppHeader />

      {/* HERO */}
      <section className="hero-gradiente border-b border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <p className="mb-4 inline-block rounded-full border border-gold/40 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-gold">
            Resultado + estatística em um só lugar
          </p>
          <h1 className="text-4xl leading-[0.95] sm:text-7xl">
            Pare de jogar no achismo.
            <br />
            <span className="text-gold">Jogue com número na mão.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            O Bicho Stats acompanha todas as extrações e mostra, em segundos, quais bichos estão
            saindo, quais estão atrasados e quais milhares e dezenas mais repetem em cada horário.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <BotaoCheckout mostrarPlanos>Conhecer os planos</BotaoCheckout>
            <a
              href="#resultados"
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Ver o resultado de hoje grátis
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Acesso liberado na hora • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* DOR */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:grid-cols-3">
          {[
            "Você anota resultado em caderno e perde o histórico.",
            "Aposta no mesmo bicho há semanas sem saber se ele está frio.",
            "Segue palpite de grupo de WhatsApp sem nenhum dado por trás.",
          ].map((texto) => (
            <p key={texto} className="text-sm text-muted-foreground">
              <span className="mr-2 text-destructive">✕</span>
              {texto}
            </p>
          ))}
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-center text-3xl sm:text-4xl">O que você recebe</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
          Tudo calculado automaticamente a partir dos resultados oficiais.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <Card key={b.titulo} className="cartao-sombra">
              <CardContent className="flex items-start gap-3 py-6">
                <b.icone className="mt-0.5 size-5 shrink-0 text-gold" />
                <div>
                  <p className="font-semibold">{b.titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{b.texto}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <BotaoCheckout mostrarPlanos>Escolher meu plano</BotaoCheckout>
        </div>
      </section>

      {/* RESULTADOS DE HOJE */}
      <section id="resultados" className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-3xl sm:text-4xl">
            Sorteios {dia ? `de ${formatarData(dia)}` : "de hoje"}
            <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
              Rio de Janeiro
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta parte é grátis. A leitura estatística completa é para assinantes.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => atualizar.mutate()}
              disabled={atualizar.isPending}
            >
              <RefreshCw className={atualizar.isPending ? "size-4 animate-spin" : "size-4"} />
              Atualizar agora
            </Button>
            <span className="text-xs text-muted-foreground">
              {horaAtualizacao
                ? `Atualizado às ${horaAtualizacao} • busca automática a cada minuto`
                : "Busca automática a cada minuto"}
            </span>
          </div>


          {sorteios.length === 0 ? (
            <Card className="mt-6">
              <CardContent className="py-10 text-center text-muted-foreground">
                Aguardando a próxima extração do dia.
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {Object.entries(porExtracao).map(([nome, itens]) => (
                <Card key={nome} className="cartao-sombra">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">{nome}</CardTitle>
                    <CardDescription>{itens.length} prêmios divulgados</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {itens.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{s.premio}º</span>
                        <span className="numero-sorteio">{s.numero}</span>
                        <span className="flex-1 text-right">
                          {EMOJIS[s.grupo]} {nomeGrupo(s.grupo)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ESTRATÉGIAS */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-gold">
          O grande diferencial
        </p>
        <h2 className="mt-2 text-center text-3xl sm:text-4xl">
          Não é só estatística: é o manual de como jogar
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Dentro do app você recebe um pacote completo e explicativo de táticas e estratégias, do
          básico ao avançado. Se você nunca soube montar um jogo, ou joga há anos e não sai do
          lugar, aqui está o passo a passo que ninguém te explicou.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {AULAS.map((a) => (
            <Card key={a.titulo} className="cartao-sombra border-gold/30">
              <CardHeader className="pb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                  {a.nivel}
                </p>
                <CardTitle className="text-xl">{a.titulo}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{a.texto}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <BotaoCheckout plano="completo">Quero estatísticas + estratégias</BotaoCheckout>
          <p className="mt-3 text-xs text-muted-foreground">
            Estratégia é método, não promessa de prêmio. Jogue com responsabilidade.
          </p>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-center text-3xl sm:text-4xl">Quem já usa</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {DEPOIMENTOS.map((d) => (
            <Card key={d.nome} className="cartao-sombra">
              <CardContent className="py-6">
                <div className="flex gap-0.5 text-gold">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm">“{d.texto}”</p>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">{d.nome}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="scroll-mt-20 border-y border-border/60 hero-gradiente">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              Escolha seu acesso
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl">Do dado à estratégia completa</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Comece pelas estatísticas ou leve também o método para transformar os números em um
              jogo mais consciente.
            </p>
          </div>

          <div className="mt-9 grid items-stretch gap-5 md:grid-cols-2">
            <Card className="cartao-sombra flex flex-col">
              <CardHeader>
                <CardTitle className="text-3xl">Plano Estatísticas</CardTitle>
                <CardDescription>Para quem quer analisar os números por conta própria.</CardDescription>
                <p className="pt-4">
                  <span className="font-display text-6xl text-gold">R$ 29,90</span>
                  <span className="ml-1 text-sm text-muted-foreground">/mês</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-2 text-sm">
                  {[
                    "Ranking dos 25 bichos por período",
                    "Atrasômetro por bicho e por horário",
                    "Milhar, centena e dezena mais frequentes",
                    "Comparação entre as extrações do dia",
                    "Bichos favoritos salvos na sua conta",
                    "Resultados atualizados automaticamente",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <BotaoCheckout plano="estatisticas" variant="outline" className="mt-6 w-full">
                  Assinar Estatísticas
                </BotaoCheckout>
              </CardContent>
            </Card>

            <Card className="cartao-sombra relative flex flex-col border-gold/60">
              <div className="absolute right-4 top-4 rounded-md bg-gold px-2.5 py-1 text-xs font-bold uppercase text-gold-foreground">
                Melhor escolha
              </div>
              <CardHeader className="pr-32">
                <CardTitle className="text-3xl">Plano Completo</CardTitle>
                <CardDescription>Estatísticas e estratégias validadas, do básico ao avançado.</CardDescription>
                <p className="pt-4">
                  <span className="font-display text-6xl text-gold">R$ 49,90</span>
                  <span className="ml-1 text-sm text-muted-foreground">/mês</span>
                </p>
                <p className="text-xs font-semibold text-primary">Só R$ 20 a mais pelo método completo</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-2 text-sm">
                  {[
                    "Tudo do Plano Estatísticas",
                    "Guia completo de táticas e estratégias",
                    "Conteúdo organizado por nível",
                    "Gestão de banca e montagem de jogo",
                    "Leitura de bichos quentes e atrasados",
                    "Ciclos, horários e plano semanal",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <BotaoCheckout plano="completo" className="mt-6 w-full">
                  Assinar Estatísticas + Estratégias
                </BotaoCheckout>
              </CardContent>
            </Card>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Pagamento seguro • Acesso liberado na hora • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-center text-3xl sm:text-4xl">Perguntas frequentes</h2>
        <div className="mt-8 space-y-4">
          {[
            {
              p: "O app garante que eu vou ganhar?",
              r: "Não. Sorteio é sorteio. O que entregamos é o histórico organizado e a estatística real para você decidir melhor.",
            },
            {
              p: "De onde vêm os resultados?",
              r: "De fontes públicas de divulgação, coletados automaticamente após cada extração. Confira sempre na banca oficial.",
            },
            {
              p: "Como recebo meu acesso?",
              r: "Depois do pagamento, seu login e senha são liberados e você entra pelo botão Entrar aqui no topo.",
            },
            {
              p: "Funciona no celular?",
              r: "Sim, o app foi feito para o celular e funciona direto no navegador, sem instalar nada.",
            },
          ].map((f) => (
            <Card key={f.p}>
              <CardContent className="py-5">
                <p className="font-semibold">{f.p}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.r}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-10 text-center">
          <BotaoCheckout mostrarPlanos>Comparar planos</BotaoCheckout>
        </div>
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Conteúdo informativo e estatístico. Não vendemos apostas. Jogue com responsabilidade.
      </footer>
    </div>
  );
}
