import { Card } from "@/components/ui/card";

const CHANGELOG = [
  {
    date: "2026-10-24",
    title: "Paridade visual e funcional com a plataforma de origem",
    items: [
      "Dashboard reconstruído com gráfico de vendas, Top 5 compradores e banners de segurança reais",
      "Loja: página do sorteio com prêmios, ganhadores, descrição e botões de suporte",
      "Sorteios: busca, filtros, status editável e ações completas por linha",
      "Novas páginas: FAQ, Links UTM, Analytics, Redes Sociais, Certificado, Filantropia, Tema e páginas legais",
    ],
  },
  {
    date: "2026-10-20",
    title: "Importação de dados reais e autenticação por usuário",
    items: [
      "Login por usuário e senha, sessão com refresh token",
      "Sorteio espelho importado com números, imagem e configurações reais",
    ],
  },
  {
    date: "2026-10-15",
    title: "Lançamento da base multi-tenant",
    items: [
      "Arquitetura white-label com isolamento completo por operador",
      "Checkout, reserva de números e jogos bônus",
    ],
  },
];

export default function UpdatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atualizações</h1>
        <p className="text-muted-foreground">Histórico de novidades da plataforma.</p>
      </div>
      <div className="flex flex-col gap-4">
        {CHANGELOG.map((entry) => (
          <Card key={entry.date} className="p-5">
            <p className="text-xs text-muted-foreground">{entry.date}</p>
            <h3 className="mb-2 font-semibold">{entry.title}</h3>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
