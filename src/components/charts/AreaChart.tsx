import { useEffect, useId, useMemo, useRef, useState } from 'react'

export interface Point {
  label: string
  value: number
  extra?: string
}

/** Плавный линейный график с заливкой, сеткой и подсказкой при наведении */
export default function AreaChart({
  data,
  height = 220,
  max = 100,
  suffix = '%',
  showDots = true,
}: {
  data: Point[]
  height?: number
  max?: number
  suffix?: string
  showDots?: boolean
}) {
  const gid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  // реальная ширина контейнера: подписи остаются чёткими и одного размера на любом экране
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const update = () => setW(Math.max(240, Math.round(el.clientWidth)))
    update()
    if (!('ResizeObserver' in window)) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = W < 480 ? Math.round(height * 0.85) : height
  const pad = { l: 36, r: 10, t: 14, b: 26 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const top = Math.max(max, ...data.map((d) => d.value), 1)

  const pts = useMemo(
    () =>
      data.map((d, i) => ({
        x: pad.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw),
        y: pad.t + ih - (d.value / top) * ih,
        d,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, top, iw, ih, W],
  )

  const path = useMemo(() => {
    if (!pts.length) return ''
    let p = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const cx = (a.x + b.x) / 2
      p += ` C${cx},${a.y} ${cx},${b.y} ${b.x},${b.y}`
    }
    return p
  }, [pts])

  const area = pts.length ? `${path} L${pts[pts.length - 1].x},${pad.t + ih} L${pts[0].x},${pad.t + ih} Z` : ''
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(W / 90))))

  return (
    <div ref={box} className="relative w-full min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full max-w-full overflow-visible" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`a-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#B3162B" stopOpacity=".22" />
            <stop offset="1" stopColor="#B3162B" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = pad.t + ih - t * ih
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#EFEDEE" strokeDasharray={t === 0 ? '' : '3 4'} />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="10.5" fill="#9A9EA6">
                {Math.round(top * t)}
                {suffix}
              </text>
            </g>
          )
        })}
        {area && <path d={area} fill={`url(#a-${gid})`} className="animate-fade-in" />}
        {path && (
          <path
            d={path}
            fill="none"
            stroke="#B3162B"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={1000}
            strokeDasharray="1000"
            className="animate-draw"
          />
        )}
        {pts.map((p, i) => (
          <g key={i}>
            {(i % every === 0 && pts.length - 1 - i >= every * 0.6) || i === pts.length - 1 ? (
              <text x={p.x} y={H - 6} textAnchor="middle" fontSize="10.5" fill="#9A9EA6">
                {p.d.label}
              </text>
            ) : null}
            <rect x={p.x - iw / Math.max(pts.length, 1) / 2} y={pad.t} width={iw / Math.max(pts.length, 1)} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
            {(showDots || hover === i) && (
              <circle cx={p.x} cy={p.y} r={hover === i ? 5.5 : 3.5} fill="#fff" stroke="#B3162B" strokeWidth="2" style={{ transition: 'r .15s' }} pointerEvents="none" />
            )}
          </g>
        ))}
        {hover !== null && pts[hover] && <line x1={pts[hover].x} x2={pts[hover].x} y1={pad.t} y2={pad.t + ih} stroke="#B3162B" strokeOpacity=".25" pointerEvents="none" />}
      </svg>
      {hover !== null && pts[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lift"
          style={{ left: `${(pts[hover].x / W) * 100}%`, top: `${(pts[hover].y / H) * 100}%`, marginTop: -10 }}
        >
          <div className="font-semibold">
            {pts[hover].d.value}
            {suffix}
          </div>
          <div className="text-white/60">
            {pts[hover].d.label}
            {pts[hover].d.extra ? ` · ${pts[hover].d.extra}` : ''}
          </div>
        </div>
      )}
    </div>
  )
}
