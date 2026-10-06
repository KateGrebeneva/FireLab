import { cn } from '../../lib/cn'

export interface HBar {
  label: string
  value: number
  right?: string
  sub?: string
}

/** Горизонтальные полосы — для рейтингов тем, вопросов, сотрудников */
export default function HBarList({ items, max = 100, className, tone = 'brand' }: { items: HBar[]; max?: number; className?: string; tone?: 'brand' | 'green' }) {
  const top = Math.max(max, ...items.map((i) => i.value), 1)
  return (
    <ul className={cn('space-y-3.5', className)}>
      {items.map((it, i) => (
        <li key={i} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink-2" title={it.label}>
              {it.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{it.right ?? `${it.value}%`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                'h-full origin-left animate-growx rounded-full transition-[filter] group-hover:brightness-110',
                tone === 'green' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-brand-400 to-brand-700',
              )}
              style={{ width: `${Math.max(2, (it.value / top) * 100)}%`, animationDelay: `${i * 60}ms` }}
            />
          </div>
          {it.sub && <div className="mt-1 text-[11.5px] text-ink-4">{it.sub}</div>}
        </li>
      ))}
    </ul>
  )
}
