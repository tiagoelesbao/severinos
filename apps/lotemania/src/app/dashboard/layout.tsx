import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, settings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminHeader } from "@/components/admin-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();

  let userName = "Usuário";
  let userRole = session?.role ?? "subscriber";
  let brandName = "Lotemania";
  let logoUrl: string | null = null;

  if (session) {
    const [user] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, session.sub))
      .limit(1);
    if (user) {
      // users.name e nullable no schema; mantem o fallback declarado acima.
      userName = user.name ?? userName;
      userRole = user.role;
    }

    const [tenantSettings] = await db
      .select({ siteName: settings.siteName, logoUrl: settings.logoUrl })
      .from(settings)
      .where(eq(settings.tenantId, session.tenantId))
      .limit(1);
    if (tenantSettings) {
      brandName = tenantSettings.siteName;
      logoUrl = tenantSettings.logoUrl;
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar
        brandName={brandName}
        logoUrl={logoUrl}
        userName={userName}
        userRole={userRole}
      />
      <SidebarInset>
        <AdminHeader userName={userName} userRole={userRole} />
        <div className="flex flex-1 justify-center p-4 md:p-6">
          <div className="flex w-full max-w-5xl flex-col gap-4">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
