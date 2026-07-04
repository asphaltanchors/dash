"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Store,
  BarChart3,
  ShoppingCart,
  Package,
  ClipboardList,
  Building2,
  Users,
  DollarSign,
  Target,
  Calendar,
  Radar,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const data = {
  navMain: [
    {
      title: "Cockpit",
      url: "/",
      icon: BarChart3,
    },
    {
      title: "Orders",
      url: "/orders",
      icon: ShoppingCart,
    },
    {
      title: "Marketing Attribution",
      url: "/marketing-attribution",
      icon: Target,
    },
    {
      title: "Trade Shows",
      url: "/trade-shows",
      icon: Calendar,
    },
    {
      title: "Cash Flow",
      url: "/cash-flow",
      icon: DollarSign,
    },
    {
      title: "Products",
      url: "/products",
      icon: Package,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: ClipboardList,
    },
    {
      title: "Companies",
      url: "/companies",
      icon: Building2,
    },
    {
      title: "Account Attention",
      url: "/account-attention",
      icon: Radar,
    },
    {
      title: "Contacts",
      url: "/contacts",
      icon: Users,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar
      collapsible="icon"
      className="[--sidebar:#07101d] [--sidebar-accent:#10234a] [--sidebar-accent-foreground:#eff6ff] [--sidebar-border:#1e293b] [--sidebar-foreground:#cbd5e1] [--sidebar-primary:#2563eb] [--sidebar-primary-foreground:#eff6ff]"
      {...props}
    >
      <SidebarHeader className="border-b border-slate-800 px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-11 text-slate-200 hover:bg-slate-800/80 hover:text-white"
            >
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/20">
                  <Store className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-slate-50">AAC BI</span>
                  <span className="truncate text-xs text-slate-500">Business cockpit</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-1 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="h-6 px-2 text-[10px] uppercase text-slate-500">Operate</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={item.url === "/" ? pathname === "/" : pathname.startsWith(item.url)}
                  tooltip={item.title}
                  className={cn(
                    "h-9 text-slate-400 hover:bg-slate-800/80 hover:text-slate-50 data-[active=true]:bg-blue-500/20 data-[active=true]:text-blue-100",
                    "data-[active=true]:shadow-[inset_2px_0_0_rgba(96,165,250,0.9)]"
                  )}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail className="after:bg-slate-700" />
    </Sidebar>
  )
}
