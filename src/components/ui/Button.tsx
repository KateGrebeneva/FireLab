import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Spinner } from './Loader'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'white'
type Size = 'sm' | 'md' | 'lg'

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-brand hover:-translate-y-0.5 hover:from-brand-600 hover:to-brand-800',
  secondary: 'border border-line bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:border-brand-200 hover:text-brand-700',
  ghost: 'text-ink-2 hover:bg-gray-100 hover:text-ink',
  danger: 'bg-white text-brand-700 border border-brand-200 hover:bg-brand-50',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  white: 'bg-white text-brand-800 shadow-lift hover:-translate-y-0.5',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[52px] px-7 text-[15px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, iconRight, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {loading ? <Spinner /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
})

export interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, iconRight, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], 'group', className)} {...rest}>
      {icon}
      {children}
      {iconRight && <span className="transition-transform duration-200 group-hover:translate-x-0.5">{iconRight}</span>}
    </Link>
  )
}

export function IconButton({
  label,
  className,
  children,
  tone = 'default',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid h-9 w-9 place-items-center rounded-lg text-ink-3 transition hover:bg-gray-100 hover:text-ink disabled:opacity-40',
        tone === 'danger' && 'hover:bg-brand-50 hover:text-brand-700',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
