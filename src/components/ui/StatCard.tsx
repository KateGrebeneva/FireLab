import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export default function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
  className,
  style,
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      style={style}
      className={cn(
        'group relative min-w-0 animate-fade-up overflow-hidden rounded-2xl border p-4 transition sm:p-5 duration-300 hover:-translate-y-0.5 hover:shadow-lift',
        accent ? 'border-transparent bg-brand-grad text-white shadow-brand' : 'border-line/70 bg-white shadow-card',
        className,
      )}
    >
      {accent && <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />}
      <div className="flex items-center justify-between gap-3">
        <span className={cn('min-w-0 text-[12.5px] font-medium leading-snug sm:text-[13px]', accent ? 'text-white/80' : 'text-ink-3')}>{label}</span>
        {icon && (
          <span className={cn('hidden h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform min-[400px]:grid duration-300 group-hover:scale-110', accent ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-600')}>
            {icon}
          </span>
        )}
      </div>
      <div className={cn('mt-3 truncate font-display text-[24px] font-extrabold leading-none tracking-tight sm:text-[30px]', accent ? 'text-white' : 'text-ink')}>{value}</div>
      {hint && <div className={cn('mt-2 text-[11.5px] leading-snug sm:text-xs', accent ? 'text-white/75' : 'text-ink-3')}>{hint}</div>}
    </div>
  )
}
