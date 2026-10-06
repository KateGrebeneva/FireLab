import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '../../lib/cn'

export default function Empty({ icon, title, text, action, className }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">{icon ?? <Inbox size={24} />}</span>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-3">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="card card-pad flex flex-col items-start gap-3 border-brand-100 bg-brand-50/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-brand-800">{text}</div>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-semibold text-brand-700 hover:underline">
          Повторить
        </button>
      )}
    </div>
  )
}
