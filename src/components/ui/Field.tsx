import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface Wrap {
  label?: string
  hint?: ReactNode
  error?: string | null
  className?: string
}

export function FieldWrap({ label, hint, error, className, children, htmlFor }: Wrap & { children: ReactNode; htmlFor?: string }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-brand-700">{error}</p> : hint ? <p className="mt-1.5 text-xs text-ink-3">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Wrap & { left?: ReactNode; right?: ReactNode }>(
  function Input({ label, hint, error, className, left, right, id, ...rest }, ref) {
    const fid = id ?? rest.name
    return (
      <FieldWrap label={label} hint={hint} error={error} className={className} htmlFor={fid}>
        <div className="relative">
          {left && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4">{left}</span>}
          <input ref={ref} id={fid} className={cn('input', left ? 'pl-10' : '', right ? 'pr-11' : '', error ? 'border-brand-300' : '')} {...rest} />
          {right && <span className="absolute right-2 top-1/2 -translate-y-1/2">{right}</span>}
        </div>
      </FieldWrap>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Wrap>(function Textarea(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const fid = id ?? rest.name
  return (
    <FieldWrap label={label} hint={hint} error={error} className={className} htmlFor={fid}>
      <textarea ref={ref} id={fid} className={cn('input min-h-[88px] resize-y leading-relaxed', error ? 'border-brand-300' : '')} {...rest} />
    </FieldWrap>
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Wrap>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref,
) {
  const fid = id ?? rest.name
  return (
    <FieldWrap label={label} hint={hint} error={error} className={className} htmlFor={fid}>
      <select
        ref={ref}
        id={fid}
        className="input cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B6F78' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {children}
      </select>
    </FieldWrap>
  )
})

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-ink-3">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-gray-200',
        )}
      >
        <span className={cn('block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-5' : 'translate-x-0')} />
      </button>
    </label>
  )
}
