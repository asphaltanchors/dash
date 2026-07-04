import type { ComponentType, ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'

export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan' | 'neutral'
export type ReportTone = Tone | 'good' | 'warn' | 'bad' | 'critical' | 'orange'

export const toneStyles: Record<Tone, {
  icon: string
  text: string
  muted: string
  border: string
  bg: string
  stroke: string
  fill: string
}> = {
  blue: {
    icon: 'text-blue-300',
    text: 'text-blue-300',
    muted: 'text-blue-200',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    stroke: '#60a5fa',
    fill: '#3b82f6',
  },
  green: {
    icon: 'text-emerald-300',
    text: 'text-emerald-300',
    muted: 'text-emerald-200',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    stroke: '#34d399',
    fill: '#10b981',
  },
  amber: {
    icon: 'text-amber-300',
    text: 'text-amber-300',
    muted: 'text-amber-200',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    stroke: '#fbbf24',
    fill: '#f59e0b',
  },
  red: {
    icon: 'text-red-300',
    text: 'text-red-300',
    muted: 'text-red-200',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    stroke: '#f87171',
    fill: '#ef4444',
  },
  purple: {
    icon: 'text-violet-300',
    text: 'text-violet-300',
    muted: 'text-violet-200',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    stroke: '#a78bfa',
    fill: '#8b5cf6',
  },
  cyan: {
    icon: 'text-cyan-300',
    text: 'text-cyan-300',
    muted: 'text-cyan-200',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    stroke: '#22d3ee',
    fill: '#06b6d4',
  },
  neutral: {
    icon: 'text-slate-300',
    text: 'text-slate-300',
    muted: 'text-slate-400',
    border: 'border-slate-700',
    bg: 'bg-slate-800/70',
    stroke: '#94a3b8',
    fill: '#64748b',
  },
}

const toneAliases: Record<ReportTone, Tone> = {
  blue: 'blue',
  green: 'green',
  amber: 'amber',
  red: 'red',
  purple: 'purple',
  cyan: 'cyan',
  neutral: 'neutral',
  good: 'green',
  warn: 'amber',
  bad: 'red',
  critical: 'red',
  orange: 'amber',
}

export function resolveTone(tone: ReportTone = 'neutral') {
  return toneAliases[tone] ?? 'neutral'
}

export function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function formatCompactCurrency(value: number | string | null | undefined, digits = 1) {
  const numeric = toNumber(value)
  const abs = Math.abs(numeric)

  if (abs >= 1_000_000) return `$${formatNumber(numeric / 1_000_000, digits)}M`
  if (abs >= 1_000) return `$${formatNumber(numeric / 1_000, 0)}K`
  return formatCurrency(numeric, { showCents: false })
}

export function formatWholeCurrency(value: number | string | null | undefined) {
  return formatCurrency(toNumber(value), { showCents: false })
}

export function formatIsoDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : 'n/a'
}

export function ReportPanel({
  className,
  id,
  children,
}: {
  className?: string
  id?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={cn('rounded-md border border-slate-800/90 bg-[#0b1322] shadow-[0_10px_24px_rgba(0,0,0,0.16)]', className)}>
      {children}
    </section>
  )
}

export function ReportHeader({
  title,
  eyebrow,
  action,
  className,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-3 border-b border-slate-800 px-3 py-2', className)}>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-slate-100">{title}</h2>
        {eyebrow ? <p className="mt-0.5 truncate text-xs text-slate-400">{eyebrow}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function CompactBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: ReportTone
  className?: string
}) {
  const styles = toneStyles[resolveTone(tone)]

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 rounded-sm border-slate-700 bg-slate-900/80 px-1.5 text-[11px] font-medium text-slate-300',
        styles.border,
        styles.bg,
        styles.text,
        className,
      )}
    >
      {children}
    </Badge>
  )
}

export function InlineBar({
  value,
  tone = 'blue',
  className,
}: {
  value: number
  tone?: ReportTone
  className?: string
}) {
  const styles = toneStyles[resolveTone(tone)]

  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-800', className)}>
      <div className="h-full rounded-full" style={{ width: `${clampPercent(value)}%`, backgroundColor: styles.fill }} />
    </div>
  )
}

export function ReportIconButton({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950/30 text-slate-300 transition hover:border-slate-500 hover:text-slate-50"
    >
      <Icon className="size-4" />
    </button>
  )
}

function Sparkline({
  values,
  tone = 'blue',
  className,
}: {
  values: Array<number | string | null | undefined>
  tone?: ReportTone
  className?: string
}) {
  const styles = toneStyles[resolveTone(tone)]
  const series = values.map(toNumber).filter((value) => Number.isFinite(value))
  const safeSeries = series.length === 0 ? [0, 0] : series.length === 1 ? [series[0], series[0]] : series
  const width = 144
  const height = 38
  const padding = 2
  const min = Math.min(...safeSeries)
  const max = Math.max(...safeSeries)
  const range = max - min || 1
  const points = safeSeries.map((value, index) => {
    const x = padding + (index / Math.max(safeSeries.length - 1, 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const areaPoints = [`${padding},${height - padding}`, ...points, `${width - padding},${height - padding}`].join(' ')

  return (
    <svg className={cn('h-9 w-full overflow-visible', className)} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={areaPoints} fill={styles.fill} opacity="0.12" />
      <polyline points={points.join(' ')} fill="none" stroke={styles.stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
  trend,
  className,
}: {
  label: string
  value: ReactNode
  detail: ReactNode
  icon: ComponentType<{ className?: string }>
  tone?: ReportTone
  trend?: Array<number | string | null | undefined>
  className?: string
}) {
  const styles = toneStyles[resolveTone(tone)]

  return (
    <ReportPanel className={cn('min-h-36 p-3', styles.border, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase text-slate-400">
            <Icon className={cn('size-3.5 shrink-0', styles.icon)} />
            <span className="truncate">{label}</span>
          </div>
          <div className="mt-1 truncate text-2xl font-semibold tabular-nums text-slate-50">{value}</div>
        </div>
      </div>
      <div className="mt-1 min-h-8 text-xs leading-4 text-slate-400">{detail}</div>
      {trend ? <Sparkline values={trend} tone={tone} className="mt-1" /> : null}
    </ReportPanel>
  )
}
