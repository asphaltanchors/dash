// ABOUTME: Cash Flow Dashboard with DSO metrics and accounts receivable aging analysis
// ABOUTME: Displays Days Sales Outstanding, AR aging, and collection risk analytics
import { Suspense } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, TrendingUp, DollarSign, Calendar, Users } from "lucide-react"
import { getCurrentDSO, getARAgingDetails, getProblemAccounts } from "@/lib/queries"
import { formatCurrency, formatNumber } from "@/lib/utils"

async function DSOSummary() {
  const currentDSO = await getCurrentDSO()
  
  if (!currentDSO) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>DSO data is not available</AlertDescription>
      </Alert>
    )
  }

  const dsoValue = Number(currentDSO.dsoDays)
  const assessmentColor = currentDSO.dsoAssessment === 'Excellent' ? 'text-green-600' : 
                         currentDSO.dsoAssessment === 'Good' ? 'text-blue-600' :
                         currentDSO.dsoAssessment === 'Fair' ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Current DSO</p>
          </div>
          <p className="text-2xl font-bold">{dsoValue.toFixed(0)} days</p>
          <p className={`text-xs font-medium ${assessmentColor}`}>{currentDSO.dsoAssessment}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Total A/R</p>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(currentDSO.totalAccountsReceivable, { showCents: false })}</p>
          <p className="text-xs text-muted-foreground">{currentDSO.openInvoiceCount} open invoices</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Collection Efficiency</p>
          </div>
          <p className="text-2xl font-bold">{currentDSO.collectionEfficiencyPct}%</p>
          <p className="text-xs text-muted-foreground">AR as % of recent sales</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Daily Avg Sales</p>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(currentDSO.dailyAvgSales, { showCents: false })}</p>
          <p className="text-xs text-muted-foreground">Used in DSO calculation</p>
        </CardContent>
      </Card>
    </div>
  )
}

async function ARAgingBreakdown() {
  const arDetails = await getARAgingDetails()
  const summaryData = arDetails.filter(item => item.analysisLevel === 'Aging Summary')
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aging Bucket</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
          <TableHead className="text-right">Avg Days</TableHead>
          <TableHead>Risk Level</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summaryData
          .sort((a, b) => {
            const order = ['Current', 'Past Due', 'Overdue', 'Severely Overdue']
            const aOrder = order.findIndex(o => a.agingBucket?.includes(o)) ?? 999
            const bOrder = order.findIndex(o => b.agingBucket?.includes(o)) ?? 999
            return aOrder - bOrder
          })
          .map((item, index) => {
          const riskColor = item.collectionRisk === 'Low Risk' ? 'bg-green-100 text-green-800' :
                           item.collectionRisk === 'Medium Risk' ? 'bg-yellow-100 text-yellow-800' :
                           item.collectionRisk === 'High Risk' ? 'bg-orange-100 text-orange-800' :
                           'bg-red-100 text-red-800'
          
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.agingBucket}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(item.totalArAmount, { showCents: false })}
              </TableCell>
              <TableCell className="text-right">{formatNumber(item.openInvoiceCount)}</TableCell>
              <TableCell className="text-right">{item.avgDaysOutstanding}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={riskColor}>
                  {item.collectionRisk}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

async function ProblemAccountsTable() {
  const problemAccounts = await getProblemAccounts()
  
  if (problemAccounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No high-risk accounts found</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Days Outstanding</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Payment Pattern</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {problemAccounts.slice(0, 10).map((account, index) => {
          const riskColor = account.collectionRisk === 'High Risk' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
          
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{account.customer}</TableCell>
              <TableCell>
                <span className="font-mono text-sm">{account.orderNumber}</span>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(account.totalAmount)}
              </TableCell>
              <TableCell className="text-right">
                <span className="font-medium">{account.daysOutstanding}</span> days
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={riskColor}>
                  {account.collectionRisk}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm">{account.paymentPattern || 'Unknown'}</span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function LoadingCard() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-8 bg-muted rounded animate-pulse"></div>
              <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function LoadingTable() {
  return (
    <div className="space-y-3">
      <div className="h-12 bg-muted/20 border-b animate-pulse"></div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="h-4 bg-muted rounded flex-1 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
        </div>
      ))}
    </div>
  )
}

export default async function CashFlowPage() {
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
                <BreadcrumbPage>Cash Flow</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cash Flow Dashboard</h1>
            <p className="text-muted-foreground">
              Days Sales Outstanding, AR aging analysis, and collection performance
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>DSO Overview</CardTitle>
              <CardDescription>Current Days Sales Outstanding metrics and collection efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingCard />}>
                <DSOSummary />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accounts Receivable Aging</CardTitle>
              <CardDescription>AR breakdown by aging buckets with collection risk assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingTable />}>
                <ARAgingBreakdown />
              </Suspense>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Problem Accounts Alert</CardTitle>
              <CardDescription>High-risk and critical accounts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingTable />}>
                <ProblemAccountsTable />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}