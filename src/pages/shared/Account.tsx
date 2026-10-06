import { useEffect, useState, type FormEvent } from 'react'
import { AtSign, Briefcase, Building2, Calendar, Eye, EyeOff, KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { changeMyPassword, updateMyName } from '../../services/account'
import { humanError } from '../../lib/errors'
import PageHeader from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { useToast } from '../../components/ui/Toast'
import { fmtDate, joinFio, looksLikeFio, splitFio, type Fio } from '../../utils/format'

export default function Account() {
  useTitle('Мой профиль')
  const { profile, refreshProfile } = useAuth()
  const { settings } = useSettings()
  const toast = useToast()
  const [fio, setFio] = useState<Fio>({ last: '', first: '', middle: '' })
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' })
  const [pwErr, setPwErr] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (profile) setFio(looksLikeFio(profile.full_name) ? splitFio(profile.full_name) : { last: '', first: '', middle: '' })
  }, [profile])

  if (!profile) return null
  const admin = profile.role === 'admin'
  const fullName = joinFio(fio)
  const dirty = fullName !== profile.full_name

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    if (!fio.last.trim() || !fio.first.trim()) {
      toast.error('Укажите фамилию и имя')
      return
    }
    setBusy(true)
    try {
      await updateMyName(fullName)
      await refreshProfile()
      toast.success('Профиль сохранён')
    } catch (err) {
      toast.error(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  const savePw = async (e: FormEvent) => {
    e.preventDefault()
    setPwErr('')
    if (pw.next.length < 6) return setPwErr('Новый пароль — минимум 6 символов')
    if (pw.next !== pw.repeat) return setPwErr('Пароли не совпадают')
    if (pw.next === pw.current) return setPwErr('Новый пароль совпадает с текущим')
    setPwBusy(true)
    try {
      await changeMyPassword(pw.current, pw.next)
      setPw({ current: '', next: '', repeat: '' })
      toast.success('Пароль изменён')
    } catch (err) {
      setPwErr(humanError(err))
    } finally {
      setPwBusy(false)
    }
  }

  const info: [typeof AtSign, string, string][] = [
    [AtSign, 'Логин', profile.username],
    [Building2, 'Подразделение', profile.department || '—'],
    [Briefcase, 'Должность', profile.position || (admin ? 'Администратор' : '—')],
    [Calendar, 'В системе с', fmtDate(profile.created_at)],
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Аккаунт" title="Мой профиль" description="Личные данные и безопасность учётной записи." />

      {/* карточка профиля */}
      <div className="card overflow-hidden">
        <div className="relative h-28 bg-brand-grad">
          <div className="absolute inset-0 opacity-[.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '20px 20px' }} />
        </div>
        <div className="relative px-5 pb-6 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
            <Avatar name={profile.full_name} size="xl" className="-mt-10 ring-4 ring-white" />
            <div className="sm:pt-4">
              <h2 className="text-[22px] font-extrabold leading-tight sm:text-[26px]">{profile.full_name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                <span className="font-semibold text-ink-2">@{profile.username}</span>
                {admin ? (
                  <Badge tone="dark">
                    <ShieldCheck size={12} /> Администратор
                  </Badge>
                ) : (
                  <Badge tone="brand">Сотрудник</Badge>
                )}
                <span>{settings.org_name}</span>
              </div>
            </div>
          </div>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {info.map(([I, l, v]) => (
              <div key={l} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                <I size={17} className="shrink-0 text-ink-4" />
                <div className="min-w-0">
                  <dt className="text-[11.5px] text-ink-4">{l}</dt>
                  <dd className="truncate text-[14px] font-semibold text-ink">{v}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {!looksLikeFio(profile.full_name) && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
          Укажите фамилию, имя и отчество — они будут отображаться в приветствии, результатах и отчётах.
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form onSubmit={(e) => void saveName(e)} className="card card-pad space-y-4" noValidate>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <UserRound size={19} />
            </span>
            <div>
              <h3 className="text-[16px] font-bold">Личные данные</h3>
              <p className="text-[12.5px] text-ink-3">Логин, подразделение и должность меняет администратор</p>
            </div>
          </div>
          <Input label="Фамилия" name="last" value={fio.last} onChange={(e) => setFio({ ...fio, last: e.target.value })} placeholder="Иванов" maxLength={60} autoComplete="family-name" />
          <Input label="Имя" name="first" value={fio.first} onChange={(e) => setFio({ ...fio, first: e.target.value })} placeholder="Иван" maxLength={60} autoComplete="given-name" />
          <Input label="Отчество" name="middle" value={fio.middle} onChange={(e) => setFio({ ...fio, middle: e.target.value })} placeholder="Иванович" maxLength={60} autoComplete="additional-name" />
          <Button type="submit" loading={busy} disabled={!dirty} icon={<Save size={16} />} className="w-full sm:w-auto">
            Сохранить
          </Button>
        </form>

        <form onSubmit={(e) => void savePw(e)} className="card card-pad space-y-4" noValidate>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <KeyRound size={19} />
            </span>
            <div>
              <h3 className="text-[16px] font-bold">Смена пароля</h3>
              <p className="text-[12.5px] text-ink-3">Минимум 6 символов</p>
            </div>
          </div>
          <Input
            label="Текущий пароль"
            name="current"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
            right={
              <button type="button" onClick={() => setShow(!show)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-4 hover:bg-gray-100" aria-label="Показать пароли">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <Input label="Новый пароль" name="next" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} maxLength={72} />
          <Input label="Повторите новый пароль" name="repeat" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} maxLength={72} />
          {pwErr && <div className="rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-[13.5px] font-medium text-brand-800">{pwErr}</div>}
          <Button type="submit" variant="secondary" loading={pwBusy} disabled={!pw.current || !pw.next} icon={<KeyRound size={16} />} className="w-full sm:w-auto">
            Изменить пароль
          </Button>
        </form>
      </div>
    </div>
  )
}
