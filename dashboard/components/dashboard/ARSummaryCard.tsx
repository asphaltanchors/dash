// ABOUTME: AR Summary Card showing accounts receivable overview with aging breakdown
// ABOUTME: Displays total AR, problem accounts count, and risk indicators for executive dashboard
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, AlertTriangle } from "lucide-react"
import { ARAgingDetail } from "@/lib/queries"
import { formatCurrency } from "@/lib/utils"

interface Props {
  arDetails: ARAgingDetail[]
}

export default function ARSummaryCard({ arDetails }: Props) {
  // Get summary data
  const summaryData = arDetails.filter(item => item.analysisLevel === 'Aging Summary')
  const individualInvoices = arDetails.filter(item => item.analysisLevel === 'Individual Invoices')
  
  // Calculate totals
  const totalAR = summaryData.reduce((sum, item) => sum + Number(item.totalArAmount), 0)
  const totalInvoices = summaryData.reduce((sum, item) => sum + item.openInvoiceCount, 0)
  
  // Count high-risk accounts
  const problemAccounts = individualInvoices.filter(item => 
    item.collectionRisk === 'High Risk' || item.collectionRisk === 'Critical Risk'
  ).length

  if (summaryData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">—</div>
          <p className="text-xs text-muted-foreground">
            No AR data available
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(totalAR, { showCents: false })}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {totalInvoices} open invoices
          </span>
          
          {problemAccounts > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {problemAccounts} at risk
            </Badge>
          )}
        </div>

        {/* Show aging breakdown */}
        <div className="mt-3 space-y-1">
          {summaryData
            .sort((a, b) => {
              const order = ['Current', 'Past Due', 'Overdue']
              const aOrder = order.findIndex(o => a.agingBucket?.includes(o)) || 999
              const bOrder = order.findIndex(o => b.agingBucket?.includes(o)) || 999
              return aOrder - bOrder
            })
            .slice(0, 3)
            .map((bucket) => {
            const bucketColor = bucket.agingBucket?.includes('Current') ? 'bg-green-500' :
                               bucket.agingBucket?.includes('Past Due') ? 'bg-yellow-500' : 'bg-red-500'
            
            return (
              <div key={bucket.agingBucket} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${bucketColor}`} />
                  <span>{bucket.agingBucket}</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(bucket.totalArAmount, { showCents: false })}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}