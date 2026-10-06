import { cn } from '../../lib/cn'

export default function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,.03)]', className)} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all duration-200',
            o.value === value ? 'bg-ink text-white shadow' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
