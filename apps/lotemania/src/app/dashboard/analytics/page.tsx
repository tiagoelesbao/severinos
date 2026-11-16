// Rota placeholder. O page.tsx original tem 0 bytes desde 2026-10-24 e nao
// estava no bundle publico — nao ha o que recuperar. O unico sobrevivente da
// pasta e analytics-chart.tsx, que desenha visitas por dia a partir de
// { day, views }[]; nao existe tabela nem action que produza essa serie, logo
// montar a tela aqui seria inventar a fonte de dados. A tela declara na UI que
// nao foi construida, em vez de exibir um grafico vazio como se fosse um dado.
// Titulo conforme src/lib/nav-config.ts.
import { EmptyState } from "@/components/ui/empty-state";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      </div>

      <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-400">
        Esta tela ainda não foi construída. O gráfico de visitas já existe em
        <code className="px-1">analytics-chart.tsx</code>, mas não há ainda uma
        fonte de dados de visitas para alimentá-lo.
      </div>

      <div className="rounded-lg border bg-card">
        <EmptyState label="Tela não construída" />
      </div>
    </div>
  );
}
