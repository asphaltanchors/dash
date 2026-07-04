// ABOUTME: DSO Risk Card component showing current Days Sales Outstanding with assessment
// ABOUTME: Displays DSO value, assessment level, and risk indicators for executive dashboard
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, AlertTriangle } from "lucide-react"
import { DSOMetric } from "@/lib/queries"

interface Props {
  dsoMetric: DSOMetric | null
}

export default function DSORiskCard({ dsoMetric }: Props) {
  if (!dsoMetric) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">DSO Assessment</CardTitle>
          <Calendar className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">—</div>
          <p className="text-xs text-slate-400">
            DSO data unavailable
          </p>
        </CardContent>
      </Card>
    )
  }

  const dsoValue = Number(dsoMetric.dsoDays)
  const collectionEff = Number(dsoMetric.collectionEfficiencyPct)
  
  // Determine badge style and icon based on assessment
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"
  let badgeClass = ""
  let Icon = Calendar
  
  switch (dsoMetric.dsoAssessment) {
    case 'Excellent':
      badgeClass = "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
      Icon = TrendingUp
      break
    case 'Good':
      badgeClass = "border-blue-500/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
      Icon = TrendingUp
      break
    case 'Fair':
      badgeClass = "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
      Icon = Calendar
      break
    case 'Poor':
      badgeClass = "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
      Icon = AlertTriangle
      break
    default:
      badgeVariant = "outline"
      Icon = Calendar
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">DSO Assessment</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{dsoValue.toFixed(0)} days</div>
        <div className="flex items-center justify-between mt-2">
          <Badge 
            variant={badgeVariant}
            className={badgeClass}
          >
            {dsoMetric.dsoAssessment}
          </Badge>
          <p className="text-xs text-slate-400">
            {collectionEff.toFixed(1)}% efficiency
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
