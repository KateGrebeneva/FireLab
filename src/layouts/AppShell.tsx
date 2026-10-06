import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useSettings } from '../hooks/useSettings'
import Logo from '../components/Logo'
import { Avatar } from '../components/ui/Avatar'
import { cn } from '../lib/cn'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export default function AppShell({ items, section }: { items: NavItem[]; section: string }) {
  const { profile, signOut } = useAuth()
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0 })
  }, [loc.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const logout = async () => {
    await signOut()
    nav('/login', { replace: true })
  }

  const home = profile?.role === 'admin' ? '/admin' : '/employee'

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-2 pb-6 pt-1">
        <Logo to={home} />
      </div>
      <div className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-4">{section}</div>
      <nav className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200',
                isActive ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-brand' : 'text-ink-2 hover:bg-white hover:text-ink hover:shadow-card',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.9} className={cn('transition-transform duration-200 group-hover:scale-110', isActive ? 'text-white' : 'text-ink-3 group-hover:text-brand-600')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3 pt-8">
        <div className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
          <Link to={`${home}/account`} className="group -m-1.5 flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-gray-50" title="Мой профиль">
            <Avatar name={profile?.full_name ?? '?'} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink group-hover:text-brand-700">{profile?.full_name}</div>
              <div className="flex items-center gap-1 truncate text-xs text-ink-3">
                {profile?.role === 'admin' && <ShieldCheck size={12} className="text-brand-600" />}@{profile?.username}
              </div>
            </div>
          </Link>
          <button
            onClick={() => void logout()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2 text-[13px] font-semibold text-ink-2 transition hover:border-brand-200 hover:text-brand-700"
          >
            <LogOut size={15} /> Выйти
          </button>
        </div>
        <div className="truncate px-2 text-[11px] text-ink-4">{settings.org_name}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      {/* mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line/70 bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo to={home} />
        <button
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink shadow-card"
          aria-label="Открыть меню"
          aria-expanded={open}
        >
          <Menu size={20} />
        </button>
      </header>

      {/* mobile drawer */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
        <div className={cn('absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} onClick={() => setOpen(false)} />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-[86%] max-w-[320px] overflow-y-auto bg-canvas p-4 shadow-lift transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button onClick={() => setOpen(false)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-white" aria-label="Закрыть меню">
            <X size={18} />
          </button>
          {sidebar}
        </aside>
      </div>

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 overflow-y-auto border-r border-line/70 bg-gradient-to-b from-white/70 to-canvas p-5 lg:block">{sidebar}</aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div key={loc.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
