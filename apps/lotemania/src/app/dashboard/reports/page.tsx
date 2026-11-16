import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { ReportsForm } from "./reports-form";

export default async function ReportsPage() {
  const user = await requireUser();
  const productList = await db
    .select({ id: products.id, title: products.title })
    .from(products)
    .where(eq(products.tenantId, user.tenantId));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
      </div>
      <ReportsForm products={productList} />
    </div>
  );
}
