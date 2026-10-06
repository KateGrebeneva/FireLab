import { useId } from 'react'
import { cn } from '../../lib/cn'

/**
 * Векторные иллюстрации пожарной тематики (собственные, без внешних изображений).
 * Каждая масштабируется через className (ширина), высота — по viewBox.
 */

const useGid = () => useId().replace(/:/g, '')

export function Extinguisher({ className }: { className?: string }) {
  const id = useGid()
  return (
    <svg viewBox="0 0 140 230" className={cn('h-auto', className)} aria-hidden>
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#8A0F20" />
          <stop offset=".35" stopColor="#D2243A" />
          <stop offset=".6" stopColor="#E0384C" />
          <stop offset="1" stopColor="#7A0D1C" />
        </linearGradient>
        <linearGradient id={`m${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#3A3D44" />
          <stop offset=".5" stopColor="#6B6F78" />
          <stop offset="1" stopColor="#2A2C31" />
        </linearGradient>
      </defs>
      <ellipse cx="62" cy="222" rx="44" ry="6" fill="#1D1F23" opacity=".12" />
      {/* шланг */}
      <path d="M86 44c26 4 40 22 40 52v70c0 14-6 22-16 22" fill="none" stroke="#2A2C31" strokeWidth="7" strokeLinecap="round" />
      <path d="M104 186h14l4 20h-22z" fill="#2A2C31" />
      {/* корпус */}
      <rect x="26" y="52" width="72" height="168" rx="30" fill={`url(#b${id})`} />
      <rect x="34" y="62" width="9" height="140" rx="4.5" fill="#fff" opacity=".22" />
      {/* этикетка */}
      <rect x="26" y="112" width="72" height="56" fill="#fff" opacity=".95" />
      <rect x="26" y="112" width="72" height="6" fill="#B3162B" opacity=".25" />
      <text x="62" y="143" textAnchor="middle" fontFamily="Manrope, Inter, Arial" fontWeight="800" fontSize="17" fill="#B3162B">
        ОП-5
      </text>
      <rect x="40" y="151" width="44" height="4" rx="2" fill="#D9D6D7" />
      <rect x="46" y="159" width="32" height="3" rx="1.5" fill="#E7E4E5" />
      {/* горловина и рукоять */}
      <rect x="46" y="36" width="32" height="20" rx="4" fill={`url(#m${id})`} />
      <path d="M40 30h46l14-10c3-2 6 2 3 5L90 38H40z" fill="#2A2C31" />
      <path d="M42 22h30l-4 8H42z" fill="#4B4F57" />
      <circle cx="80" cy="44" r="9" fill="#fff" stroke="#2A2C31" strokeWidth="3" />
      <path d="M80 44l4-4" stroke="#B3162B" strokeWidth="2" strokeLinecap="round" />
      <rect x="54" y="14" width="4" height="10" rx="2" fill="#F5B342" />
    </svg>
  )
}

export function Helmet({ className }: { className?: string }) {
  const id = useGid()
  return (
    <svg viewBox="0 0 220 170" className={cn('h-auto', className)} aria-hidden>
      <defs>
        <linearGradient id={`h${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E0384C" />
          <stop offset=".55" stopColor="#B3162B" />
          <stop offset="1" stopColor="#7A0D1C" />
        </linearGradient>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCD27A" />
          <stop offset="1" stopColor="#D9932A" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="160" rx="88" ry="7" fill="#1D1F23" opacity=".1" />
      {/* поля каски */}
      <path d="M14 128c0-10 30-16 96-16s98 8 98 18c0 8-14 14-32 14H44c-18 0-30-6-30-16z" fill="#7A0D1C" />
      <path d="M20 126c8-6 40-10 90-10s84 4 92 10" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="3" />
      {/* купол */}
      <path d="M36 122c0-56 32-96 76-96s72 40 72 96z" fill={`url(#h${id})`} />
      {/* рёбра */}
      <path d="M112 28v94" stroke="#7A0D1C" strokeOpacity=".35" strokeWidth="8" />
      <path d="M78 40c-12 22-16 50-16 82M146 40c12 22 16 50 16 82" stroke="#7A0D1C" strokeOpacity=".25" strokeWidth="5" fill="none" />
      <path d="M60 60c8-18 22-28 38-32" stroke="#fff" strokeOpacity=".35" strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* щиток-эмблема */}
      <path d="M112 62l20 7v16c0 12-8 20-20 24-12-4-20-12-20-24V69z" fill={`url(#g${id})`} stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
      <path d="M113 72c1 5 7 7 7 14a8 8 0 0 1-16 0c0-4 2-6 4-7 0 2 1 4 3 4-1-4 0-8 2-11z" fill="#B3162B" />
      {/* светоотражающая полоса */}
      <path d="M40 112h144" stroke="#F5F5F5" strokeWidth="6" strokeLinecap="round" opacity=".85" />
      <path d="M40 112h144" stroke="#F5B342" strokeWidth="2" strokeDasharray="10 8" opacity=".9" />
    </svg>
  )
}

export function Hydrant({ className }: { className?: string }) {
  const id = useGid()
  return (
    <svg viewBox="0 0 120 170" className={cn('h-auto', className)} aria-hidden>
      <defs>
        <linearGradient id={`y${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#8A0F20" />
          <stop offset=".45" stopColor="#D2243A" />
          <stop offset="1" stopColor="#7A0D1C" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="162" rx="44" ry="5" fill="#1D1F23" opacity=".12" />
      <rect x="26" y="146" width="68" height="12" rx="4" fill="#5E0C18" />
      <path d="M34 58h52v88H34z" fill={`url(#y${id})`} />
      <path d="M28 46h64l-6 14H34z" fill="#7A0D1C" />
      <path d="M36 46c0-20 10-30 24-30s24 10 24 30z" fill={`url(#y${id})`} />
      <rect x="54" y="6" width="12" height="12" rx="3" fill="#5E0C18" />
      <rect x="12" y="84" width="24" height="22" rx="5" fill="#B3162B" />
      <rect x="84" y="84" width="24" height="22" rx="5" fill="#B3162B" />
      <circle cx="60" cy="98" r="13" fill="#8A0F20" />
      <circle cx="60" cy="98" r="6" fill="#5E0C18" />
      <rect x="40" y="64" width="6" height="74" rx="3" fill="#fff" opacity=".2" />
    </svg>
  )
}

export function Flame({ className }: { className?: string }) {
  const id = useGid()
  return (
    <svg viewBox="0 0 120 160" className={cn('h-auto', className)} aria-hidden>
      <defs>
        <linearGradient id={`f1${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#B3162B" />
          <stop offset="1" stopColor="#F2545B" />
        </linearGradient>
        <linearGradient id={`f2${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#F07B2C" />
          <stop offset="1" stopColor="#F5B342" />
        </linearGradient>
      </defs>
      <path d="M62 6c6 30 46 46 46 92a48 48 0 0 1-96 0c0-26 14-38 24-48 0 14 8 24 18 24-6-22 0-48 8-68z" fill={`url(#f1${id})`} />
      <path d="M62 62c4 16 26 24 26 50a28 28 0 0 1-56 0c0-14 8-20 14-26 0 8 4 14 10 14-3-12 2-28 6-38z" fill={`url(#f2${id})`} />
      <path d="M60 104c2 8 12 12 12 22a12 12 0 0 1-24 0c0-6 4-9 6-11 0 3 2 6 4 6-1-6 0-12 2-17z" fill="#FFE9B0" />
    </svg>
  )
}

export function AlarmButton({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 150" className={cn('h-auto', className)} aria-hidden>
      <ellipse cx="70" cy="144" rx="50" ry="5" fill="#1D1F23" opacity=".1" />
      <rect x="14" y="8" width="112" height="128" rx="14" fill="#B3162B" />
      <rect x="14" y="8" width="112" height="128" rx="14" fill="none" stroke="#7A0D1C" strokeWidth="4" />
      <rect x="28" y="22" width="84" height="84" rx="8" fill="#F7F3F3" />
      <rect x="28" y="22" width="84" height="84" rx="8" fill="none" stroke="#fff" strokeWidth="3" opacity=".8" />
      <circle cx="70" cy="64" r="22" fill="#fff" stroke="#E3DADB" strokeWidth="3" />
      <circle cx="70" cy="64" r="12" fill="#D2243A" />
      <path d="M40 34l14 14M100 34L86 48M40 94l14-14M100 94L86 80" stroke="#D9D0D1" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="40" y="114" width="60" height="10" rx="3" fill="#fff" opacity=".9" />
      <path d="M48 119h44" stroke="#B3162B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function ExitSign({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 100" className={cn('h-auto', className)} aria-hidden>
      <rect x="4" y="6" width="172" height="88" rx="10" fill="#0E8A4E" />
      <rect x="10" y="12" width="160" height="76" rx="6" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
      {/* дверь */}
      <rect x="22" y="22" width="40" height="58" rx="2" fill="#fff" />
      <rect x="28" y="28" width="28" height="52" fill="#0E8A4E" />
      {/* бегущий человек */}
      <circle cx="88" cy="28" r="7" fill="#fff" />
      <path
        d="M84 38l-12 10 4 4 9-7 2 12-10 16 5 3 10-14 7 6v14h6V64l-8-8-2-10 7 6h10v-6h-8l-10-10z"
        fill="#fff"
      />
      {/* стрелка */}
      <path d="M124 50h30m-12-12l12 12-12 12" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function FireTruck({ className }: { className?: string }) {
  const id = useGid()
  return (
    <svg viewBox="0 0 360 170" className={cn('h-auto', className)} aria-hidden>
      <defs>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E0384C" />
          <stop offset="1" stopColor="#A3132A" />
        </linearGradient>
      </defs>
      <ellipse cx="180" cy="160" rx="170" ry="7" fill="#000" opacity=".18" />
      {/* лестница */}
      <rect x="40" y="22" width="190" height="12" rx="3" fill="#D9D6D7" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={48 + i * 15} y="22" width="4" height="12" fill="#9A9EA6" />
      ))}
      {/* кузов */}
      <rect x="20" y="44" width="230" height="86" rx="8" fill={`url(#t${id})`} />
      <rect x="32" y="56" width="58" height="50" rx="4" fill="#8A0F20" opacity=".55" />
      <rect x="98" y="56" width="58" height="50" rx="4" fill="#8A0F20" opacity=".55" />
      <rect x="164" y="56" width="74" height="50" rx="4" fill="#8A0F20" opacity=".55" />
      <path d="M20 112h230" stroke="#fff" strokeWidth="6" />
      <path d="M20 112h230" stroke="#F5B342" strokeWidth="2" strokeDasharray="12 10" />
      {/* кабина */}
      <path d="M250 60h50l36 34v36H250z" fill={`url(#t${id})`} />
      <path d="M262 70h34l24 24h-58z" fill="#CFE3F2" />
      <path d="M266 74h12l-6 16h-6z" fill="#fff" opacity=".6" />
      <rect x="252" y="112" width="84" height="6" fill="#fff" />
      <rect x="326" y="104" width="14" height="10" rx="2" fill="#FCD27A" />
      {/* мигалка */}
      <rect x="270" y="50" width="22" height="10" rx="3" fill="#4F8DF5" />
      <rect x="270" y="50" width="11" height="10" rx="3" fill="#F2545B" />
      {/* колёса */}
      {[70, 190, 296].map((x) => (
        <g key={x}>
          <circle cx={x} cy="134" r="22" fill="#1D1F23" />
          <circle cx={x} cy="134" r="10" fill="#9A9EA6" />
          <circle cx={x} cy="134" r="4" fill="#1D1F23" />
        </g>
      ))}
    </svg>
  )
}

export function FirstAidKit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 130" className={cn('h-auto', className)} aria-hidden>
      <ellipse cx="75" cy="124" rx="56" ry="5" fill="#1D1F23" opacity=".1" />
      <path d="M52 22V14a6 6 0 0 1 6-6h34a6 6 0 0 1 6 6v8" fill="none" stroke="#6B6F78" strokeWidth="7" />
      <rect x="12" y="22" width="126" height="96" rx="14" fill="#fff" stroke="#E7E1E2" strokeWidth="3" />
      <rect x="12" y="22" width="126" height="22" rx="12" fill="#F3EEEF" />
      <path d="M64 54h22v18h18v22H86v18H64V94H46V72h18z" fill="#D2243A" />
    </svg>
  )
}
