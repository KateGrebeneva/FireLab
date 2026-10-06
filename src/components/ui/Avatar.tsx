import { cn } from '../../lib/cn'
import { initials } from '../../utils/format'

const palette = ['from-brand-400 to-brand-700', 'from-rose-400 to-rose-700', 'from-slate-500 to-slate-800', 'from-amber-500 to-orange-700', 'from-red-400 to-red-800']

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const idx = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length
  const sz = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-base', xl: 'h-20 w-20 text-2xl' }[size]
  return (
    <span className={cn('inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-inset', palette[idx], sz, className)}>
      {initials(name)}
    </span>
  )
}
