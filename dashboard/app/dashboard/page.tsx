import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function DashboardPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
            <p className="text-muted-foreground">
              Choose a section from the sidebar to view your analytics
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-muted/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
            <h3 className="text-lg font-medium mb-2">Orders Dashboard</h3>
            <p className="text-sm text-muted-foreground text-center">
              View order metrics, revenue charts, and recent orders
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
            <h3 className="text-lg font-medium mb-2">Products Dashboard</h3>
            <p className="text-sm text-muted-foreground text-center">
              Analyze product performance and inventory metrics
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
