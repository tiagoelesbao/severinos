import {
  LayoutDashboard,
  Ticket,
  Users,
  Landmark,
  Link2,
  BarChart3,
  Mail,
  UserCog,
  Plug,
  ShieldCheck,
  Megaphone,
  HelpCircle,
  LineChart,
  Link,
  Webhook,
  Share2,
  BadgeCheck,
  HeartHandshake,
  FileText,
  Lock,
  Info,
  Palette,
  Settings,
  RefreshCw,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  children?: { title: string; href: string }[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    label: "Geral",
    items: [
      { title: "Início", href: "/dashboard/app", icon: LayoutDashboard },
      { title: "Sorteios", href: "/dashboard/products", icon: Ticket },
      { title: "Afiliados", href: "/dashboard/affiliates", icon: Users },
      {
        title: "Bancos",
        href: "/dashboard/transactions",
        icon: Landmark,
        children: [
          { title: "Pagamentos", href: "/dashboard/transactions" },
        ],
      },
      {
        title: "Links de Desconto",
        href: "/dashboard/discount-links",
        icon: Link2,
      },
      { title: "Relatórios", href: "/dashboard/reports", icon: BarChart3 },
      { title: "Contatos", href: "/dashboard/contacts", icon: Mail },
      { title: "Usuários", href: "/dashboard/users", icon: UserCog },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Integrações", href: "/dashboard/integrations", icon: Plug },
      {
        title: "Capitalizadoras",
        href: "/dashboard/capitalizers",
        icon: ShieldCheck,
      },
      {
        title: "Comunicados",
        href: "/dashboard/communications",
        icon: Megaphone,
      },
      { title: "Perguntas Frequentes", href: "/dashboard/faq", icon: HelpCircle },
      { title: "Analytics", href: "/dashboard/analytics", icon: LineChart },
      { title: "Links UTM", href: "/dashboard/utm-links", icon: Link },
      { title: "Webhooks", href: "/dashboard/integrations/webhooks", icon: Webhook },
      { title: "Redes Sociais", href: "/dashboard/social", icon: Share2 },
      { title: "Certificado", href: "/dashboard/certificate", icon: BadgeCheck },
      { title: "Filantropia", href: "/dashboard/philanthropy", icon: HeartHandshake },
      { title: "Termos De Uso", href: "/dashboard/legal/termos", icon: FileText },
      { title: "Privacidade", href: "/dashboard/legal/privacidade", icon: Lock },
      { title: "Sobre", href: "/dashboard/legal/sobre", icon: Info },
      { title: "Personalizar Tema", href: "/dashboard/theme", icon: Palette },
      { title: "Configurações", href: "/dashboard/settings", icon: Settings },
      { title: "Atualizações", href: "/dashboard/updates", icon: RefreshCw },
    ],
  },
];
