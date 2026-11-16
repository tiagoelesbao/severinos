"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  role: string;
  status: string;
};

export function ExportUsersButton({ rows }: { rows: Row[] }) {
  function exportCsv() {
    const header = "Nome,Telefone,Email,CPF,Função,Status";
    const lines = rows.map((r) =>
      [r.name, r.phone, r.email, r.cpf, r.role, r.status]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "usuarios.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="icon" title="Exportar" onClick={exportCsv}>
      <Download className="size-4" />
    </Button>
  );
}
