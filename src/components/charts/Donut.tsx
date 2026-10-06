export interface Slice {
  label: string
  value: number
  color: string
}

export default function Donut({ slices, size = 150, center, sub }: { slices: Slice[]; size?: number; center?: string; sub?: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = size / 2 - 12
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3EEEF" strokeWidth="16" />
          {total > 0 &&
            slices.map((s) => {
              const len = (s.value / total) * c
              const el = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="16"
                  strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                  strokeDashoffset={-acc}
                  className="animate-fade-in"
                />
              )
              acc += len
              return el
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-2xl font-extrabold text-ink">{center ?? total}</div>
            {sub && <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{sub}</div>}
          </div>
        </div>
      </div>
      <ul className="space-y-2.5 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <i className="h-3 w-3 rounded" style={{ background: s.color }} />
            <span className="text-ink-2">{s.label}</span>
            <b className="ml-auto pl-4 tabular-nums text-ink">{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
