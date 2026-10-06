import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import { Button } from './Button'

interface Opts {
  title: string
  text?: ReactNode
  confirmText?: string
  danger?: boolean
}

type ConfirmFn = (o: Opts) => Promise<boolean>
const ConfirmCtx = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Opts | null>(null)
  const resolver = useRef<((v: boolean) => void) | undefined>(undefined)

  const confirm = useCallback<ConfirmFn>(
    (o) =>
      new Promise<boolean>((res) => {
        resolver.current = res
        setOpts(o)
      }),
    [],
  )

  const close = useCallback((v: boolean) => {
    resolver.current?.(v)
    resolver.current = undefined
    setOpts(null)
  }, [])

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => close(false)}
        title={opts?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Отмена
            </Button>
            <Button variant="primary" data-autofocus onClick={() => close(true)}>
              {opts?.confirmText ?? 'Подтвердить'}
            </Button>
          </>
        }
      >
        <div className="flex gap-4">
          {opts?.danger && (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
              <AlertTriangle size={20} />
            </span>
          )}
          <div className="text-sm leading-relaxed text-ink-2">{opts?.text}</div>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  )
}

export function useConfirm() {
  const v = useContext(ConfirmCtx)
  if (!v) throw new Error('ConfirmProvider missing')
  return v
}
