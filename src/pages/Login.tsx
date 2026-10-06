import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Lock, ShieldCheck, User } from 'lucide-react'
import Logo from '../components/Logo'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { PageLoader } from '../components/ui/Loader'
import Ring from '../components/charts/Ring'
import { homeFor, useAuth } from '../lib/auth'
import { useTitle } from '../hooks/useTitle'

export default function Login() {
  useTitle('Вход')
  const { signIn, profile, loading } = useAuth()
  const loc = useLocation()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <PageLoader />
  if (profile) {
    const from = (loc.state as { from?: string } | null)?.from
    const home = homeFor(profile.role)
    return <Navigate to={from && from.startsWith(home) ? from : home} replace />
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setErr('')
    setBusy(true)
    const msg = await signIn(login, password)
    setBusy(false)
    // при успехе профиль появится в контексте и сработает <Navigate> выше
    if (msg) setErr(msg)
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <div className="relative flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="flex items-center gap-1.5 text-[13px] font-medium text-ink-3 transition hover:text-brand-700">
            <ArrowLeft size={15} /> На главную
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <div className="animate-fade-up">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <KeyRound size={22} />
            </span>
            <h1 className="mt-6 text-[32px] font-extrabold leading-tight text-ink">Вход в систему</h1>
            <p className="mt-2 text-[15px] text-ink-3">Используйте логин или email и пароль, выданные администратором.</p>
          </div>

          <form onSubmit={(e) => void submit(e)} className="mt-8 animate-fade-up space-y-4 [animation-delay:80ms]" noValidate>
            <Input
              label="Логин или email"
              name="login"
              autoComplete="username"
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Например, ivanov"
              left={<User size={17} />}
              maxLength={120}
            />
            <Input
              label="Пароль"
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              left={<Lock size={17} />}
              maxLength={72}
              right={
                <button type="button" onClick={() => setShow(!show)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-4 hover:bg-gray-100 hover:text-ink" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            {err && <div className="animate-fade-in rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-[13.5px] font-medium text-brand-800">{err}</div>}
            <Button type="submit" size="lg" className="w-full" loading={busy} iconRight={<ArrowRight size={17} />}>
              Войти
            </Button>
          </form>

          <p className="mt-8 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-4">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            Учётные записи сотрудников создаёт администратор. Если вы забыли пароль — обратитесь к начальнику части.
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-grad lg:block">
        <div className="pointer-events-none absolute inset-0 opacity-[.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full bg-black/25 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center p-16 text-white">
          <div className="max-w-md">
            <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/60">Пожарная безопасность</div>
            <h2 className="mt-4 text-[40px] font-extrabold leading-[1.05]">Знания, которые спасают жизни</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-white/75">Регулярная тренировка и честная аттестация — с мгновенной проверкой и разбором каждой ошибки.</p>
          </div>
          <div className="mt-12 grid max-w-lg grid-cols-[auto_1fr] items-center gap-6 rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
            <Ring value={92} size={110} stroke={10} tone="light" sub="экзамен" />
            <div className="space-y-2.5 text-[14px]">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/70">Правильных</span>
                <b>23 / 25</b>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/70">Проходной балл</span>
                <b>80%</b>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Статус</span>
                <b className="rounded-full bg-white px-2 py-0.5 text-[12px] text-emerald-700">Сдан</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
