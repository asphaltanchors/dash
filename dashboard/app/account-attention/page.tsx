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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAccountAttentionQueue } from '@/lib/queries'
import { formatCurrency } from '@/lib/utils'

export default async function AccountAttentionPage() {
  const accounts = await getAccountAttentionQueue(100)

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Account Attention</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-4 p-4 pt-2 md:p-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Account Attention</h1>
          <p className="text-sm text-muted-foreground">Prioritized current-safe company risk and opportunity queue</p>
        </div>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold">{accounts.length} queued accounts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">1Y Revenue</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Reasons</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.companyDomainKey}>
                      <TableCell className="min-w-56 font-medium">{account.companyName}</TableCell>
                      <TableCell className="text-right tabular-nums">{account.attentionScore}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.totalRevenue, { showCents: false })}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.trailing1yRevenue, { showCents: false })}</TableCell>
                      <TableCell className="text-right tabular-nums">{account.daysSinceLastOrder}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{account.healthScore}</div>
                          <div className="text-xs text-muted-foreground">{account.activityStatus}</div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-60">
                        <div className="flex flex-wrap gap-1">
                          {account.reasonCodes.map((reason) => (
                            <Badge key={reason} variant="outline" className="text-xs">{reason}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-56">
                        <div className="space-y-1">
                          <div className="text-sm">{account.bestContactName || 'No named contact'}</div>
                          <div className="text-xs text-muted-foreground">{account.bestContactEmail || 'No email'}</div>
                          <div className="flex gap-1">
                            {account.bestContactIsLikelyHuman && <Badge variant="secondary" className="text-xs">human</Badge>}
                            {account.bestContactIsBilling && <Badge variant="outline" className="text-xs">billing</Badge>}
                            {account.bestContactIsGeneric && <Badge variant="outline" className="text-xs">generic</Badge>}
                            {account.bestContactIsInternal && <Badge variant="outline" className="text-xs">internal</Badge>}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
