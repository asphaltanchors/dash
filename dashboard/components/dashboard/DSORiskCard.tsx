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
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">—</div>
          <p className="text-xs text-muted-foreground">
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
      badgeClass = "bg-green-100 text-green-800 hover:bg-green-100"
      Icon = TrendingUp
      break
    case 'Good':
      badgeClass = "bg-blue-100 text-blue-800 hover:bg-blue-100"
      Icon = TrendingUp
      break
    case 'Fair':
      badgeClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      Icon = Calendar
      break
    case 'Poor':
      badgeClass = "bg-red-100 text-red-800 hover:bg-red-100"
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
        <Icon className="h-4 w-4 text-muted-foreground" />
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
          <p className="text-xs text-muted-foreground">
            {collectionEff.toFixed(1)}% efficiency
          </p>
        </div>
      </CardContent>
    </Card>
  )
}