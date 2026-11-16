"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { generateReport, type ReportType } from "@/lib/actions/reports";

const REPORT_TYPE_ITEMS: Record<ReportType, string> = {
  vendas_por_dia: "Vendas por Dia",
  relatorio_vendas: "Relatório de Vendas",
  relatorio_expirados: "Relatório de Expirados",
  relatorio_participantes: "Relatório de Participantes",
  faturamento: "Faturamento",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportsForm({ products }: { products: { id: string; title: string }[] }) {
  const [type, setType] = useState<ReportType>("vendas_por_dia");
  const [productId, setProductId] = useState("all");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [result, setResult] = useState<{ columns: string[]; rows: (string | number)[][] } | null>(null);
  const [isPending, startTransition] = useTransition();

  const productItems = Object.fromEntries([
    ["all", "Todos Sorteios"],
    ...products.map((p) => [p.id, p.title]),
  ]);

  function submit() {
    startTransition(async () => {
      const data = await generateReport({
        type,
        productId: productId === "all" ? undefined : productId,
        startDate,
        endDate,
      });
      setResult(data);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
        <Select items={REPORT_TYPE_ITEMS} value={type} onValueChange={(v) => setType(v as ReportType)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(REPORT_TYPE_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={productItems} value={productId} onValueChange={setProductId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Sorteios</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
      </div>
      <Button onClick={submit} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500">
        {isPending ? "Gerando..." : "Gerar Relatório"}
      </Button>

      {result && (
        <Card className="overflow-hidden p-0">
          {result.rows.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {result.columns.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j} className="font-mono tabular-nums">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
