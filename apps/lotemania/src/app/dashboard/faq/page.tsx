import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { FaqForm } from "./faq-form";
import { FaqRow } from "./faq-row";

export default async function FaqPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(faqs)
    .where(eq(faqs.tenantId, user.tenantId))
    .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perguntas Frequentes</h1>
        <p className="text-muted-foreground">
          Gerencie o FAQ exibido para os participantes na loja.
        </p>
      </div>

      <FaqForm />

      {rows.length === 0 && (
        <p className="rounded-lg border p-10 text-center text-muted-foreground">
          Nenhuma pergunta cadastrada ainda.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <FaqRow key={row.id} id={row.id} question={row.question} answer={row.answer} isActive={row.isActive} />
        ))}
      </div>
    </div>
  );
}
