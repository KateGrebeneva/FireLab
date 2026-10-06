import { useId } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

export function LogoMark({ className }: { className?: string }) {
  // уникальный id градиента: иначе скрытая копия логотипа «ломает» видимую
  const gid = `lm-${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 64 64" className={cn('h-10 w-10 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D2243A" />
          <stop offset="1" stopColor="#8A0F20" />
        </linearGradient>
      </defs>
      <path d="M32 3 56 12v18c0 15-10 26-24 31C18 56 8 45 8 30V12z" fill={`url(#${gid})`} />
      <path d="M32 7.5 52 15v15c0 12.5-8 21.6-20 26.2C20 51.6 12 42.5 12 30V15z" fill="none" stroke="#fff" strokeOpacity=".25" />
      <path d="M33 16c1 6 9 9 9 18a10 10 0 0 1-20 0c0-5 3-7 5-9 0 3 2 5 4 5-1-5 0-10 2-14z" fill="#fff" />
    </svg>
  )
}

export default function Logo({ to = '/', compact = false, light = false }: { to?: string; compact?: boolean; light?: boolean }) {
  return (
    <Link to={to} className="group flex items-center gap-3" aria-label="FireLab — на главную">
      <LogoMark className="transition-transform duration-300 group-hover:scale-105" />
      {!compact && (
        <span className="leading-tight">
          <span className={cn('block font-display text-[19px] font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')}>
            Fire<span className={light ? 'text-brand-200' : 'text-brand'}>Lab</span>
          </span>
          <span className={cn('block whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.06em]', light ? 'text-white/60' : 'text-ink-3')}>
            Подготовка и аттестация
          </span>
        </span>
      )}
    </Link>
  )
}
