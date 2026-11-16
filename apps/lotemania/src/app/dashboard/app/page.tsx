import { eq, and, sql, gte, lt, desc } from "drizzle-orm";
import Link from "next/link";
import {
  Wallet,
  ShoppingCart,
  Receipt,
  Eye,
  History,
  Users,
  MessageCircle,
  Headphones,
} from "lucide-react";
import { db } from "@/db";
import { orders, users, settings, pageViews } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SalesChart, type SalesChartPoint } from "./sales-chart";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function maskPhone(phone: string | null) {
  if (!phone) return "(--) --****";
  const digits = phone.replace(/\D/g, "");
  const ddd = digits.slice(-11, -9) || digits.slice(0, 2);
  const prefix = digits.slice(-9, -7);
  return `(${ddd}) ${prefix}****`;
}

export default async function DashboardHomePage() {
  const session = await requireUser();

  const [[currentUser], [tenantSettings]] = await Promise.all([
    db
      .select({ name: users.name, twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.id, session.sub))
      .limit(1),
    db
      .select({ captchaEnabled: settings.captchaEnabled })
      .from(settings)
      .where(eq(settings.tenantId, session.tenantId))
      .limit(1),
  ]);

  const [revenueRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${orders.amount}), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(orders)
    .where(and(eq(orders.status, "paid"), eq(orders.tenantId, session.tenantId)));

  const totalRevenue = Number(revenueRow?.total ?? 0);
  const totalOrders = Number(revenueRow?.count ?? 0);
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const [[visitsToday], [visitsYesterday], [visitsTotal], [participantsRow], [participantsToday]] =
    await Promise.all([
      db
        .select({ count: sql<string>`count(*)` })
        .from(pageViews)
        .where(and(eq(pageViews.tenantId, session.tenantId), gte(pageViews.createdAt, todayStart))),
      db
        .select({ count: sql<string>`count(*)` })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.tenantId, session.tenantId),
            gte(pageViews.createdAt, yesterdayStart),
            lt(pageViews.createdAt, todayStart),
          ),
        ),
      db
        .select({ count: sql<string>`count(*)` })
        .from(pageViews)
        .where(eq(pageViews.tenantId, session.tenantId)),
      db
        .select({ count: sql<string>`count(*)` })
        .from(users)
        .where(and(eq(users.tenantId, session.tenantId), eq(users.role, "subscriber"))),
      db
        .select({ count: sql<string>`count(*)` })
        .from(users)
        .where(
          and(
            eq(users.tenantId, session.tenantId),
            eq(users.role, "subscriber"),
            gte(users.createdAt, todayStart),
          ),
        ),
    ]);

  const stats = [
    { label: "Faturamento Total", value: formatCurrency(totalRevenue), icon: Wallet },
    { label: "Compras", value: totalOrders.toLocaleString("pt-BR"), icon: ShoppingCart },
    { label: "Ticket Médio", value: formatCurrency(avgTicket), icon: Receipt },
  ];

  const visitStats = [
    { label: "Visitas Hoje", value: formatCompact(Number(visitsToday?.count ?? 0)), icon: Eye },
    { label: "Visitas Ontem", value: formatCompact(Number(visitsYesterday?.count ?? 0)), icon: History },
    { label: "Visitas Total", value: formatCompact(Number(visitsTotal?.count ?? 0)), icon: Eye },
  ];

  const totalParticipants = Number(participantsRow?.count ?? 0);
  const newParticipantsToday = Number(participantsToday?.count ?? 0);

  // "Vendas na última hora": orders from the last 60 minutes, bucketed by
  // 5-minute window and status, matching the original's Pagos/Reservados/
  // Expirados area chart.
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentOrders = await db
    .select({
      createdAt: orders.createdAt,
      status: orders.status,
    })
    .from(orders)
    .where(and(eq(orders.tenantId, session.tenantId), gte(orders.createdAt, hourAgo)));

  const buckets = new Map<string, SalesChartPoint>();
  for (let i = 12; i >= 0; i--) {
    const bucketTime = new Date(now.getTime() - i * 5 * 60 * 1000);
    bucketTime.setSeconds(0, 0);
    bucketTime.setMinutes(Math.floor(bucketTime.getMinutes() / 5) * 5);
    const key = bucketTime.toTimeString().slice(0, 5);
    buckets.set(key, { time: key, pagos: 0, reservados: 0, expirados: 0 });
  }
  for (const order of recentOrders) {
    const bucketTime = new Date(order.createdAt);
    bucketTime.setSeconds(0, 0);
    bucketTime.setMinutes(Math.floor(bucketTime.getMinutes() / 5) * 5);
    const key = bucketTime.toTimeString().slice(0, 5);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (order.status === "paid") bucket.pagos += 1;
    else if (order.status === "pending") bucket.reservados += 1;
    else if (order.status === "expired" || order.status === "canceled") bucket.expirados += 1;
  }
  const chartData = Array.from(buckets.values());

  // Top 5 Compradores no total: ranked by total tickets bought.
  const topBuyers = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      totalSpent: sql<string>`coalesce(sum(${orders.amount}), 0)`,
      totalQty: sql<string>`coalesce(sum(${orders.quantity}), 0)`,
      purchaseCount: sql<string>`count(${orders.id})`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(and(eq(orders.tenantId, session.tenantId), eq(orders.status, "paid")))
    .groupBy(users.id, users.name, users.phone)
    .orderBy(desc(sql`sum(${orders.quantity})`))
    .limit(5);

  return (
    <div className="flex flex-col gap-6">
      {!currentUser?.twoFactorEnabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-900/60 px-5 py-4 text-rose-50">
          <p className="text-sm">
            Para aumentar a segurança da sua conta, ative a autenticação de dois fatores
            (2FA) clicando no botão abaixo.
          </p>
          <Button
            size="sm"
            render={<Link href="/dashboard/settings" />}
            nativeButton={false}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            Ativar 2FA
          </Button>
        </div>
      )}
      {!tenantSettings?.captchaEnabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-700/60 px-5 py-4 text-amber-50">
          <p className="text-sm">
            A proteção contra robôs (captcha) está desativada. Ative para proteger o
            login, o cadastro e a consulta de números.
          </p>
          <Button
            size="sm"
            render={<Link href="/dashboard/settings" />}
            nativeButton={false}
            className="bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            Ativar Captcha
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="flex flex-col justify-center gap-2 border-none bg-emerald-950/40 p-8">
          <h2 className="text-xl font-semibold text-emerald-50">
            Bem vindo de volta!
            <br />
            {currentUser?.name ?? "Admin"}
          </h2>
          <p className="max-w-md text-sm text-emerald-200/80">
            Se você está procurando facilidade na hora de gerenciar seus ganhos, você
            precisa saber que com a Lotemania você tem tudo o que precisa!
          </p>
        </Card>
        <Card className="flex flex-col items-center justify-center gap-3 border-none bg-card p-8 text-center">
          <Headphones className="size-10 text-primary" />
          <p className="text-sm font-medium">Suporte Online</p>
          <p className="text-xs text-muted-foreground">
            Precisa de ajuda? Pode contar com a gente.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-row items-center justify-between p-6">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <stat.icon className="size-6 text-primary" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visitStats.map((stat) => (
          <Card key={stat.label} className="flex flex-row items-center justify-between p-6">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <stat.icon className="size-6 text-primary" />
            </div>
          </Card>
        ))}
        <Card className="flex flex-row items-center justify-between p-6">
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCompact(totalParticipants)}
            </p>
            <p className="text-sm text-muted-foreground">
              Participantes
              <br />
              {newParticipantsToday} Hoje
            </p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="size-6 text-primary" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Vendas na última hora</h3>
          <SalesChart data={chartData} />
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold">Top 5 Compradores no total</h3>
          <p className="mb-4 text-xs text-muted-foreground">Por quantidade</p>
          <div className="flex flex-col gap-4">
            {topBuyers.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma compra paga ainda.</p>
            )}
            {topBuyers.map((buyer) => (
              <div key={buyer.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                    <Users className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{buyer.name ?? "Comprador"}</p>
                    <p className="text-xs text-muted-foreground">{maskPhone(buyer.phone)}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatCompact(Number(buyer.totalSpent))}</span>
                      <span>{Number(buyer.totalQty).toLocaleString("pt-BR")}</span>
                      <span>{buyer.purchaseCount}x</span>
                    </div>
                  </div>
                </div>
                <MessageCircle className="size-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
