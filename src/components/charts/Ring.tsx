import { useEffect, useId, useState } from 'react'
import { cn } from '../../lib/cn'

/** Кольцевой индикатор процента с анимацией заполнения */
export default function Ring({
  value,
  size = 140,
  stroke = 12,
  label,
  sub,
  tone = 'brand',
  className,
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
  sub?: string
  tone?: 'brand' | 'green' | 'light'
  className?: string
}) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setV(Math.max(0, Math.min(100, value))), 60)
    return () => clearTimeout(t)
  }, [value])
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const id = `ring-${useId().replace(/:/g, '')}`
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {tone === 'green' ? (
              <>
                <stop offset="0" stopColor="#34D399" />
                <stop offset="1" stopColor="#047857" />
              </>
            ) : tone === 'light' ? (
              <>
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#FDE4E7" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="#E25A6B" />
                <stop offset="1" stopColor="#8A0F20" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone === 'light' ? 'rgba(255,255,255,.18)' : '#F3EEEF'} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={cn('font-display font-extrabold leading-none tracking-tight', tone === 'light' ? 'text-white' : 'text-ink')} style={{ fontSize: size * 0.22 }}>
            {label ?? `${Math.round(value)}%`}
          </div>
          {sub && <div className={cn('mt-1 text-[11px] font-semibold uppercase tracking-wider', tone === 'light' ? 'text-white/70' : 'text-ink-3')}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}
