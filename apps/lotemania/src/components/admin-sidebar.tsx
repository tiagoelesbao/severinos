"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { navSections } from "@/lib/nav-config";

export function AdminSidebar({
  brandName,
  logoUrl,
  userName,
  userRole,
}: {
  brandName: string;
  logoUrl?: string | null;
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const initial = userName.trim().charAt(0).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="size-6 object-contain" />
          ) : (
            <Crown className="size-5 fill-amber-400 text-amber-400" />
          )}
          <span className="font-semibold uppercase tracking-wide group-data-[collapsible=icon]:hidden">
            {brandName}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent px-2.5 py-2.5 group-data-[collapsible=icon]:hidden">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userRole}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[11px] font-bold tracking-widest text-sidebar-foreground/50 uppercase">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        className={
                          isActive
                            ? "!rounded-xl !bg-emerald-500/15 !text-emerald-400 !font-medium"
                            : "!rounded-xl"
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {item.children && (
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                render={<Link href={child.href} />}
                                isActive={pathname === child.href}
                              >
                                {child.title}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Lotemania
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
