import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'

type Kind = 'success' | 'error' | 'info'
interface T {
  id: number
  kind: Kind
  text: string
}

interface Ctx {
  toast: (text: string, kind?: Kind) => void
  success: (text: string) => void
  error: (text: string) => void
}

const ToastCtx = createContext<Ctx | null>(null)
let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([])
  const remove = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const toast = useCallback(
    (text: string, kind: Kind = 'info') => {
      const id = ++seq
      setItems((xs) => [...xs.slice(-3), { id, kind, text }])
      setTimeout(() => remove(id), kind === 'error' ? 6000 : 3500)
    },
    [remove],
  )
  const value = useMemo<Ctx>(() => ({ toast, success: (t) => toast(t, 'success'), error: (t) => toast(t, 'error') }), [toast])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:items-end">
          {items.map((t) => {
            const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info
            return (
              <div
                key={t.id}
                role="status"
                className="pointer-events-auto flex w-full max-w-sm animate-slide-in items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-lift"
              >
                <Icon size={18} className={cn('mt-0.5 shrink-0', t.kind === 'success' ? 'text-emerald-600' : t.kind === 'error' ? 'text-brand-600' : 'text-ink-3')} />
                <span className="flex-1 text-ink-2">{t.text}</span>
                <button onClick={() => remove(t.id)} className="text-ink-4 hover:text-ink" aria-label="Закрыть">
                  <X size={16} />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const v = useContext(ToastCtx)
  if (!v) throw new Error('ToastProvider missing')
  return v
}
