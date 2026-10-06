import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Ban, Eye, EyeOff, KeyRound, Lock, MoreHorizontal, Pencil, Search, Trash2, Unlock, UserPlus, Users, UserRound } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { createEmployee, deleteEmployee, listEmployees, setEmployeeActive, updateEmployee, type EmployeeInput } from '../../services/employees'
import { humanError } from '../../lib/errors'
import PageHeader from '../../components/ui/PageHeader'
import Segmented from '../../components/ui/Segmented'
import Modal from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Loader'
import Empty, { ErrorBox } from '../../components/ui/Empty'
import { PctBar } from '../../components/AttemptsTable'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { fmtRelative, joinFio, splitFio, type Fio } from '../../utils/format'
import { cn } from '../../lib/cn'
import type { EmployeeWithStats, Profile } from '../../types'

type Status = 'all' | 'active' | 'blocked'

export default function Employees() {
  useTitle('Сотрудники')
  const { settings } = useSettings()
  const toast = useToast()
  const confirm = useConfirm()
  const loc = useLocation()
  const nav = useNavigate()
  const { data, loading, error, reload } = useAsync(listEmployees, [])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [dept, setDept] = useState('')
  const [edit, setEdit] = useState<Profile | null>(null)
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)

  useEffect(() => {
    if ((loc.state as { create?: boolean } | null)?.create) {
      setEdit(null)
      setOpen(true)
      nav(loc.pathname, { replace: true, state: null })
    }
  }, [loc, nav])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  const depts = useMemo(() => [...new Set((data ?? []).map((e) => e.department).filter((d): d is string => Boolean(d)))].sort(), [data])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (data ?? []).filter(
      (e) =>
        (status === 'all' || (status === 'active' ? e.is_active : !e.is_active)) &&
        (!dept || e.department === dept) &&
        (!s || [e.full_name, e.username, e.department, e.position].some((v) => v?.toLowerCase().includes(s))),
    )
  }, [data, q, status, dept])

  const toggleActive = async (e: EmployeeWithStats) => {
    const block = e.is_active
    if (block) {
      const ok = await confirm({
        title: 'Заблокировать сотрудника?',
        text: (
          <>
            <b>{e.full_name}</b> не сможет войти в систему. Результаты сохранятся, разблокировать можно в любой момент.
          </>
        ),
        confirmText: 'Заблокировать',
        danger: true,
      })
      if (!ok) return
    }
    try {
      await setEmployeeActive(e.id, !block)
      toast.success(block ? 'Сотрудник заблокирован' : 'Сотрудник разблокирован')
      void reload()
    } catch (err) {
      toast.error(humanError(err))
    }
  }

  const remove = async (e: EmployeeWithStats) => {
    const ok = await confirm({
      title: 'Удалить сотрудника?',
      text: (
        <>
          Учётная запись <b>{e.full_name}</b> и все её попытки будут удалены безвозвратно. Если нужно лишь закрыть доступ — используйте блокировку.
        </>
      ),
      confirmText: 'Удалить навсегда',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteEmployee(e.id)
      toast.success('Сотрудник удалён')
      void reload()
    } catch (err) {
      toast.error(humanError(err))
    }
  }

  const actions = (e: EmployeeWithStats) => [
    { icon: UserRound, label: 'Профиль и результаты', on: () => nav(`/admin/employees/${e.id}`) },
    {
      icon: Pencil,
      label: 'Редактировать',
      on: () => {
        setEdit(e)
        setOpen(true)
      },
    },
    { icon: e.is_active ? Lock : Unlock, label: e.is_active ? 'Заблокировать' : 'Разблокировать', on: () => void toggleActive(e) },
    { icon: Trash2, label: 'Удалить', on: () => void remove(e), danger: true },
  ]

  const total = data?.length ?? 0
  const active = data?.filter((e) => e.is_active).length ?? 0

  return (
    <div>
      <PageHeader
        eyebrow="Управление"
        title="Сотрудники"
        description={`${total} в системе · ${active} активных · ${total - active} заблокировано`}
        actions={
          <Button
            icon={<UserPlus size={17} />}
            onClick={() => {
              setEdit(null)
              setOpen(true)
            }}
          >
            Добавить сотрудника
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input className="lg:max-w-sm lg:flex-1" placeholder="Поиск по ФИО, логину, должности…" value={q} onChange={(e) => setQ(e.target.value)} left={<Search size={17} />} />
        {depts.length > 0 && (
          <select className="input lg:w-56" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Подразделение">
            <option value="">Все подразделения</option>
            {depts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        )}
        <Segmented
          className="lg:ml-auto"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'active', label: 'Активные' },
            { value: 'blocked', label: 'Заблокированные' },
          ]}
        />
      </div>

      {error && <ErrorBox text={error} onRetry={() => void reload()} />}

      <div className="card overflow-visible">
        {loading && !data ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Empty
            icon={<Users size={22} />}
            title={total ? 'Никого не найдено' : 'Сотрудников пока нет'}
            text={total ? 'Измените условия поиска или фильтры.' : 'Добавьте первого сотрудника — он сможет войти по логину и паролю.'}
            action={
              !total && (
                <Button icon={<UserPlus size={16} />} onClick={() => setOpen(true)}>
                  Добавить сотрудника
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="px-5 py-3">Сотрудник</th>
                    <th className="px-5 py-3">Подразделение</th>
                    <th className="px-5 py-3">Статус</th>
                    <th className="px-5 py-3 text-right">Попыток</th>
                    <th className="px-5 py-3">Средний</th>
                    <th className="px-5 py-3">Последняя</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} className={cn('table-row', !e.is_active && 'opacity-60')}>
                      <td className="px-5 py-3">
                        <Link to={`/admin/employees/${e.id}`} className="group flex items-center gap-3">
                          <Avatar name={e.full_name} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-ink group-hover:text-brand-700">{e.full_name}</div>
                            <div className="truncate text-[12.5px] text-ink-3">@{e.username}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-ink-2">{e.department || '—'}</div>
                        <div className="text-[12.5px] text-ink-4">{e.position || ''}</div>
                      </td>
                      <td className="px-5 py-3">
                        {e.is_active ? (
                          <Badge tone="green" dot>
                            Активен
                          </Badge>
                        ) : (
                          <Badge tone="gray" dot>
                            Заблокирован
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-2">{e.stats?.attempts ?? 0}</td>
                      <td className="px-5 py-3">{e.stats?.attempts ? <PctBar pct={e.stats.avg_pct} pass={settings.pass_percent} /> : <span className="text-ink-4">—</span>}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-3">{fmtRelative(e.stats?.last_at)}</td>
                      <td className="relative px-3 py-3 text-right">
                        <RowMenu id={e.id} open={menu === e.id} setOpen={setMenu} items={actions(e)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line lg:hidden">
              {rows.map((e) => (
                <li key={e.id} className={cn('relative flex items-center gap-3 px-4 py-3.5', !e.is_active && 'opacity-60')}>
                  <Link to={`/admin/employees/${e.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={e.full_name} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">{e.full_name}</div>
                      <div className="truncate text-[12.5px] text-ink-3">
                        @{e.username}
                        {e.department ? ` · ${e.department}` : ''}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-3">
                        {e.is_active ? <Badge tone="green">Активен</Badge> : <Badge tone="gray">Заблокирован</Badge>}
                        {e.stats?.attempts ? `${e.stats.attempts} поп. · ср. ${e.stats.avg_pct}%` : 'нет попыток'}
                      </div>
                    </div>
                  </Link>
                  <RowMenu id={e.id} open={menu === e.id} setOpen={setMenu} items={actions(e)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <EmployeeModal
        open={open}
        employee={edit}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false)
          void reload()
        }}
      />
    </div>
  )
}

interface MenuItem {
  icon: typeof Pencil
  label: string
  on: () => void
  danger?: boolean
}

function RowMenu({ id, open, setOpen, items }: { id: string; open: boolean; setOpen: (v: string | null) => void; items: MenuItem[] }) {
  return (
    <div className="relative inline-block">
      <button
        onClick={(ev) => {
          ev.stopPropagation()
          setOpen(open ? null : id)
        }}
        className={cn('grid h-9 w-9 place-items-center rounded-lg text-ink-3 transition hover:bg-gray-100 hover:text-ink', open && 'bg-gray-100 text-ink')}
        aria-label="Действия"
        aria-expanded={open}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 animate-scale-in overflow-hidden rounded-xl border border-line bg-white py-1 text-left shadow-lift" onClick={(e) => e.stopPropagation()}>
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                setOpen(null)
                it.on()
              }}
              className={cn('flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] transition', it.danger ? 'text-brand-700 hover:bg-brand-50' : 'text-ink-2 hover:bg-gray-50')}
            >
              <it.icon size={16} className={it.danger ? '' : 'text-ink-4'} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const emptyForm: EmployeeInput = { username: '', password: '', full_name: '', department: '', position: '' }

export function EmployeeModal({ open, employee, onClose, onSaved }: { open: boolean; employee: Profile | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState<EmployeeInput>(emptyForm)
  const [fio, setFio] = useState<Fio>({ last: '', first: '', middle: '' })
  const [errs, setErrs] = useState<Partial<Record<keyof EmployeeInput | 'last' | 'first', string>>>({})
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrs({})
    setShow(false)
    setF(
      employee
        ? { username: employee.username, password: '', full_name: employee.full_name, department: employee.department ?? '', position: employee.position ?? '' }
        : emptyForm,
    )
    setFio(employee ? splitFio(employee.full_name) : { last: '', first: '', middle: '' })
  }, [open, employee])

  const gen = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const arr = new Uint32Array(10)
    crypto.getRandomValues(arr)
    setF({ ...f, password: Array.from(arr, (n) => chars[n % chars.length]).join('') })
    setShow(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v: typeof errs = {}
    if (!fio.last.trim()) v.last = 'Укажите фамилию'
    if (!fio.first.trim()) v.first = 'Укажите имя'
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(f.username.trim())) v.username = 'Латиница, цифры, точка, дефис, _ (3–40 символов)'
    if (!employee && (f.password ?? '').length < 6) v.password = 'Минимум 6 символов'
    if (employee && f.password && f.password.length < 6) v.password = 'Минимум 6 символов'
    setErrs(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      const payload = { ...f, username: f.username.trim(), full_name: joinFio(fio) }
      if (employee) {
        if (!payload.password) delete payload.password
        await updateEmployee(employee.id, payload)
        toast.success('Данные сотрудника обновлены')
      } else {
        await createEmployee(payload)
        toast.success(`Сотрудник создан. Логин: ${payload.username}`)
      }
      onSaved()
    } catch (err) {
      toast.error(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? 'Редактирование сотрудника' : 'Новый сотрудник'}
      description={employee ? 'Измените данные или задайте новый пароль.' : 'Сотрудник войдёт по логину и паролю, которые вы укажете.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="emp-form" loading={busy}>
            {employee ? 'Сохранить' : 'Создать сотрудника'}
          </Button>
        </>
      }
    >
      <form id="emp-form" onSubmit={(e) => void submit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Фамилия" name="last" value={fio.last} onChange={(e) => setFio({ ...fio, last: e.target.value })} placeholder="Иванов" error={errs.last} maxLength={60} />
        <Input label="Имя" name="first" value={fio.first} onChange={(e) => setFio({ ...fio, first: e.target.value })} placeholder="Иван" error={errs.first} maxLength={60} />
        <Input className="sm:col-span-2" label="Отчество" name="middle" value={fio.middle} onChange={(e) => setFio({ ...fio, middle: e.target.value })} placeholder="Иванович (если есть)" maxLength={60} />
        <Input label="Подразделение" name="department" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} placeholder="1-й караул" maxLength={120} />
        <Input label="Должность" name="position" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} placeholder="Пожарный" maxLength={120} />
        <Input
          label="Логин"
          name="username"
          value={f.username}
          onChange={(e) => setF({ ...f, username: e.target.value.replace(/\s/g, '') })}
          placeholder="ivanov"
          autoComplete="off"
          error={errs.username}
          hint="Латиница, цифры, точка, дефис"
          maxLength={40}
        />
        <Input
          label={employee ? 'Новый пароль' : 'Пароль'}
          name="password"
          type={show ? 'text' : 'password'}
          value={f.password ?? ''}
          onChange={(e) => setF({ ...f, password: e.target.value })}
          placeholder={employee ? 'Оставьте пустым, чтобы не менять' : 'Минимум 6 символов'}
          autoComplete="new-password"
          error={errs.password}
          maxLength={72}
          right={
            <button type="button" onClick={() => setShow(!show)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-4 hover:bg-gray-100" aria-label="Показать пароль">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          hint={
            <button type="button" onClick={gen} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              <KeyRound size={12} /> Сгенерировать пароль
            </button>
          }
        />
        {employee && !employee.is_active && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5 text-[13px] text-ink-3 sm:col-span-2">
            <Ban size={15} /> Сотрудник заблокирован — разблокируйте его в меню действий.
          </div>
        )}
      </form>
    </Modal>
  )
}
