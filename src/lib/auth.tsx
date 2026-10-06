import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import type { Profile, Role } from '../types'
import { PageLoader } from '../components/ui/Loader'

interface AuthCtx {
  profile: Profile | null
  loading: boolean
  signIn: (login: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export const useAuth = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('AuthProvider missing')
  return v
}

async function loadProfile(): Promise<Profile | null> {
  const { data: s } = await supabase.auth.getSession()
  if (!s.session) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', s.session.user.id).maybeSingle()
  if (!data) return null
  const p = data as Profile
  if (!p.is_active) {
    await supabase.auth.signOut()
    return null
  }
  return p
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    setProfile(await loadProfile())
  }, [])

  useEffect(() => {
    let alive = true
    void loadProfile()
      .then((p) => alive && setProfile(p))
      .finally(() => alive && setLoading(false))

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        return
      }
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // не вызываем запросы синхронно внутри колбэка (рекомендация Supabase)
        setTimeout(() => {
          void loadProfile().then((p) => alive && setProfile(p))
        }, 0)
      }
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (login: string, password: string) => {
    let email = login.trim()
    if (!email || !password) return 'Введите логин и пароль'
    if (!email.includes('@')) {
      const { data, error } = await supabase.rpc('email_for_login', { p_login: email })
      if (error) return /fetch/i.test(error.message) ? 'Нет соединения с сервером' : 'Неверный логин или пароль'
      if (!data) return 'Неверный логин или пароль'
      email = data as string
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (/banned/i.test(error.message)) return 'Учётная запись заблокирована администратором'
      if (/fetch/i.test(error.message)) return 'Нет соединения с сервером'
      return 'Неверный логин или пароль'
    }
    const p = await loadProfile()
    setProfile(p)
    if (!p) return 'Учётная запись заблокирована или профиль не найден'
    return null
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return <Ctx.Provider value={{ profile, loading, signIn, signOut, refreshProfile }}>{children}</Ctx.Provider>
}

export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : '/employee')

/** Защищённый маршрут. Дополнительно доступ ограничен RLS-политиками в базе. */
export function Guard({ role }: { role: Role }) {
  const { profile, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />
  return <Outlet />
}
