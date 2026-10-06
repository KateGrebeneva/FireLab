import { useState } from 'react'

export interface Bar {
  label: string
  value: number
  secondary?: number
  hint?: string
}

/** Вертикальные столбцы (опционально — с наложенной второй серией) */
export default function BarChart({ data, height = 200, suffix = '', legend }: { data: Bar[]; height?: number; suffix?: string; legend?: [string, string] }) {
  const [hover, setHover] = useState<number | null>(null)
  const top = Math.max(1, ...data.map((d) => d.value))
  const nice = top <= 5 ? 5 : Math.ceil(top / 5) * 5
  const every = Math.max(1, Math.ceil(data.length / 7))
  return (
    <div>
      {legend && (
        <div className="mb-3 flex gap-4 text-xs text-ink-3">
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-brand-200" />
            {legend[0]}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-brand-600" />
            {legend[1]}
          </span>
        </div>
      )}
      <div className="relative flex gap-2" style={{ height }}>
        <div className="flex flex-col justify-between pb-5 text-right text-[10.5px] text-ink-4">
          {[1, 0.5, 0].map((t) => (
            <span key={t}>{Math.round(nice * t)}</span>
          ))}
        </div>
        <div className="relative flex flex-1 items-end gap-[3px] border-b border-line pb-0 sm:gap-1.5" style={{ marginBottom: 20 }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
          {data.map((d, i) => (
            <div key={i} className="group relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div
                className="relative w-full max-w-[26px] origin-bottom animate-grow rounded-t-md bg-brand-200 transition-colors group-hover:bg-brand-300"
                style={{ height: `${(d.value / nice) * 100}%`, animationDelay: `${i * 18}ms` }}
              >
                {d.secondary !== undefined && (
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-md bg-gradient-to-t from-brand-700 to-brand-500"
                    style={{ height: d.value ? `${(d.secondary / d.value) * 100}%` : 0 }}
                  />
                )}
              </div>
              {((i % every === 0 && data.length - 1 - i >= every * 0.6) || i === data.length - 1) && (
                <span className="absolute -bottom-5 whitespace-nowrap text-[10.5px] text-ink-4">{d.label}</span>
              )}
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lift">
                  <div className="font-semibold">
                    {d.value}
                    {suffix}
                    {d.secondary !== undefined && legend ? ` · ${legend[1].toLowerCase()}: ${d.secondary}` : ''}
                  </div>
                  <div className="text-white/60">{d.hint ?? d.label}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
