import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type Tone = 'brand' | 'green' | 'gray' | 'amber' | 'blue' | 'dark'

const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  gray: 'bg-gray-100 text-ink-2 ring-gray-200/60',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  blue: 'bg-sky-50 text-sky-700 ring-sky-100',
  dark: 'bg-ink text-white ring-ink',
}

export function Badge({ tone = 'gray', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
