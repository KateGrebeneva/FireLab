import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Award, Briefcase, Building2, Calendar, CheckCircle2, ClipboardCheck, Flame, History, Lock, Pencil, Target, Trash2, TrendingUp, Unlock } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { getProfile, deleteEmployee, setEmployeeActive } from '../../services/employees'
import { listAttempts } from '../../services/attempts'
import { getCategoryStats } from '../../services/stats'
import { humanError } from '../../lib/errors'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import StatCard from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/Loader'
import Empty, { ErrorBox } from '../../components/ui/Empty'
import Segmented from '../../components/ui/Segmented'
import AttemptsTable from '../../components/AttemptsTable'
import AreaChart from '../../components/charts/AreaChart'
import HBarList from '../../components/charts/HBarList'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { avg, fmtDate, fmtShortDay } from '../../utils/format'
import { EmployeeModal } from './Employees'
import type { AttemptType } from '../../types'

export default function EmployeeProfile() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { settings } = useSettings()
  const [type, setType] = useState<AttemptType | 'all'>('all')
  const [editOpen, setEditOpen] = useState(false)

  const { data, loading, error, reload } = useAsync(async () => {
    const [p, att, cats] = await Promise.all([getProfile(id), listAttempts({ userId: id, pageSize: 500 }), getCategoryStats(id)])
    return { p, att: att.rows, cats }
  }, [id])
  useTitle(data?.p.full_name ?? 'Профиль сотрудника')

  if (loading && !data) return <PageLoader />
  if (error) return <ErrorBox text={error} onRetry={() => void reload()} />
  if (!data) return null

  const { p, att, cats } = data
  const exams = att.filter((a) => a.type === 'exam')
  const passed = exams.filter((a) => a.passed).length
  const lastExam = exams[0]
  const shown = type === 'all' ? att : att.filter((a) => a.type === type)
  const trend = [...att].reverse().slice(-20)
  const weak = cats
    .filter((c) => c.total > 0)
    .map((c) => ({ label: c.category, value: Math.round((c.wrong / c.total) * 100), right: `${c.wrong} из ${c.total}` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
  const needsTraining = lastExam ? !lastExam.passed : att.length > 0 && avg(att.map((a) => a.percentage ?? 0)) < settings.pass_percent

  const toggle = async () => {
    if (p.is_active) {
      const ok = await confirm({ title: 'Заблокировать сотрудника?', text: `${p.full_name} не сможет войти в систему.`, confirmText: 'Заблокировать', danger: true })
      if (!ok) return
    }
    try {
      await setEmployeeActive(p.id, !p.is_active)
      toast.success(p.is_active ? 'Сотрудник заблокирован' : 'Сотрудник разблокирован')
      void reload()
    } catch (e) {
      toast.error(humanError(e))
    }
  }

  const remove = async () => {
    const ok = await confirm({ title: 'Удалить сотрудника?', text: 'Учётная запись и все попытки будут удалены безвозвратно.', confirmText: 'Удалить навсегда', danger: true })
    if (!ok) return
    try {
      await deleteEmployee(p.id)
      toast.success('Сотрудник удалён')
      nav('/admin/employees')
    } catch (e) {
      toast.error(humanError(e))
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/admin/employees" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 transition hover:text-brand-700">
        <ArrowLeft size={15} /> Все сотрудники
      </Link>

      <div className="card overflow-hidden">
        <div className="h-24 bg-brand-grad sm:h-28">
          <div className="h-full w-full opacity-[.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '20px 20px' }} />
        </div>
        <div className="px-5 pb-6 sm:px-8">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar name={p.full_name} size="xl" className="-mt-10 shrink-0 ring-4 ring-white" />
              <div className="pt-3 sm:pt-4">
                <h1 className="text-[22px] font-extrabold leading-tight sm:text-[26px]">{p.full_name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                  <span>@{p.username}</span>
                  {p.is_active ? <Badge tone="green" dot>Активен</Badge> : <Badge tone="gray" dot>Заблокирован</Badge>}
                  {needsTraining && <Badge tone="amber">Требуется подготовка</Badge>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pt-4">
              <Button variant="secondary" size="sm" icon={<Pencil size={15} />} onClick={() => setEditOpen(true)}>
                Изменить
              </Button>
              <Button variant="secondary" size="sm" icon={p.is_active ? <Lock size={15} /> : <Unlock size={15} />} onClick={() => void toggle()}>
                {p.is_active ? 'Заблокировать' : 'Разблокировать'}
              </Button>
              <Button variant="danger" size="sm" icon={<Trash2 size={15} />} onClick={() => void remove()}>
                Удалить
              </Button>
            </div>
          </div>
          <dl className="mt-6 grid gap-3 text-[13.5px] sm:grid-cols-3">
            {[
              [Building2, 'Подразделение', p.department || '—'],
              [Briefcase, 'Должность', p.position || '—'],
              [Calendar, 'В системе с', fmtDate(p.created_at)],
            ].map(([Icon, l, v]) => {
              const I = Icon as typeof Building2
              return (
                <div key={l as string} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                  <I size={17} className="text-ink-4" />
                  <div>
                    <dt className="text-[11.5px] text-ink-4">{l as string}</dt>
                    <dd className="font-semibold text-ink">{v as string}</dd>
                  </div>
                </div>
              )
            })}
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={<History size={18} />} label="Попыток" value={att.length} hint={`${att.length - exams.length} тренировок · ${exams.length} экзаменов`} />
        <StatCard icon={<Target size={18} />} label="Средний результат" value={`${avg(att.map((a) => a.percentage ?? 0))}%`} style={{ animationDelay: '50ms' }} />
        <StatCard icon={<Award size={18} />} label="Лучший результат" value={att.length ? `${Math.max(...att.map((a) => a.percentage ?? 0))}%` : '—'} style={{ animationDelay: '100ms' }} />
        <StatCard
          accent
          icon={<ClipboardCheck size={18} />}
          label="Экзамены сданы"
          value={`${passed} / ${exams.length}`}
          hint={lastExam ? `последний: ${lastExam.percentage}% · ${lastExam.passed ? 'сдан' : 'не сдан'}` : 'экзаменов не было'}
          style={{ animationDelay: '150ms' }}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="card card-pad">
          <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold">
            <TrendingUp size={18} className="text-brand-600" /> Динамика результатов
          </h2>
          {trend.length >= 2 ? (
            <AreaChart data={trend.map((a) => ({ label: fmtShortDay(a.completed_at!), value: a.percentage ?? 0, extra: a.type === 'exam' ? 'экзамен' : 'тренировка' }))} />
          ) : (
            <Empty title="Мало данных" text="Нужно минимум две попытки." className="py-8" />
          )}
        </div>
        <div className="card card-pad">
          <h2 className="mb-5 flex items-center gap-2 text-[17px] font-bold">
            <Flame size={18} className="text-brand-600" /> Ошибки по темам
          </h2>
          {weak.length ? <HBarList items={weak} /> : <Empty icon={<CheckCircle2 size={22} />} title="Нет данных" className="py-8" />}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h2 className="text-[17px] font-bold">История попыток</h2>
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'training', label: 'Обучение' },
              { value: 'exam', label: 'Экзамены' },
            ]}
          />
        </div>
        <div className="border-t border-line">
          {shown.length ? <AttemptsTable rows={shown} base="/admin/results" pass={settings.pass_percent} /> : <Empty title="Попыток нет" />}
        </div>
      </div>

      <EmployeeModal
        open={editOpen}
        employee={p}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false)
          void reload()
        }}
      />
    </div>
  )
}
