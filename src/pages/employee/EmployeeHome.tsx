import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, BookOpen, CheckCircle2, ClipboardCheck, Clock, Flame, History, Target, TrendingUp } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useSettings } from '../../hooks/useSettings'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { listAttempts } from '../../services/attempts'
import { getCategoryStats } from '../../services/stats'
import StatCard from '../../components/ui/StatCard'
import { CardsSkeleton } from '../../components/ui/Loader'
import Empty, { ErrorBox } from '../../components/ui/Empty'
import AttemptsTable from '../../components/AttemptsTable'
import AreaChart from '../../components/charts/AreaChart'
import HBarList from '../../components/charts/HBarList'
import { avg, fmtShortDay, fmtRelative, greetName } from '../../utils/format'
import { cn } from '../../lib/cn'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export default function EmployeeHome() {
  useTitle('Главная')
  const { profile } = useAuth()
  const { settings } = useSettings()
  const { data, loading, error, reload } = useAsync(async () => {
    const [att, cats] = await Promise.all([listAttempts({ pageSize: 200 }), getCategoryStats()])
    return { att: att.rows, total: att.total, cats }
  }, [])

  const att = data?.att ?? []
  const exams = att.filter((a) => a.type === 'exam')
  const lastExam = exams[0]
  const bestExam = exams.reduce((m, a) => Math.max(m, a.percentage ?? 0), 0)
  const trend = [...att].reverse().slice(-12)
  const weak = (data?.cats ?? [])
    .filter((c) => c.total >= 2 && c.wrong > 0)
    .map((c) => ({ label: c.category, value: Math.round((c.wrong / c.total) * 100), right: `${Math.round((c.wrong / c.total) * 100)}% ошибок` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)


  return (
    <div className="space-y-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-brand-grad p-6 text-white shadow-brand sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-white/70">
              {settings.org_name}
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold text-white">@{profile?.username}</span>
            </div>
            <h1 className="mt-1 text-[28px] font-extrabold leading-tight sm:text-[34px]">
              {greeting()}, {greetName(profile)}!
            </h1>
            <p className="mt-2 max-w-lg text-[15px] text-white/80">
              {lastExam
                ? lastExam.passed
                  ? `Последний экзамен сдан на ${lastExam.percentage}%. Поддерживайте форму регулярными тренировками.`
                  : `Последний экзамен — ${lastExam.percentage}%. Потренируйтесь и попробуйте снова: нужно ${settings.pass_percent}%.`
                : 'Начните с тренировки, а когда будете уверены — переходите к экзамену.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/employee/training" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[14px] font-semibold text-brand-800 shadow-lift transition hover:-translate-y-0.5">
              <BookOpen size={17} /> Тренировка
            </Link>
            <Link to="/employee/exam" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-[14px] font-semibold text-white backdrop-blur transition hover:bg-white/20">
              <ClipboardCheck size={17} /> Экзамен
            </Link>
          </div>
        </div>
      </section>

      {error && <ErrorBox text={error} onRetry={() => void reload()} />}

      {loading && !data ? (
        <CardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard icon={<History size={18} />} label="Всего попыток" value={data?.total ?? 0} hint={att[0] ? `последняя ${fmtRelative(att[0].completed_at)}` : 'пока нет'} />
          <StatCard icon={<Target size={18} />} label="Средний результат" value={`${avg(att.map((a) => a.percentage ?? 0))}%`} hint="по всем попыткам" style={{ animationDelay: '60ms' }} />
          <StatCard icon={<Award size={18} />} label="Лучший экзамен" value={exams.length ? `${bestExam}%` : '—'} hint={`проходной балл ${settings.pass_percent}%`} style={{ animationDelay: '120ms' }} />
          <StatCard
            accent
            icon={<CheckCircle2 size={18} />}
            label="Статус аттестации"
            value={lastExam ? (lastExam.passed ? 'Сдан' : 'Не сдан') : 'Не начата'}
            hint={lastExam ? fmtRelative(lastExam.completed_at) : 'пройдите экзамен'}
            style={{ animationDelay: '180ms' }}
          />
        </div>
      )}

      {/* modes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ModeTile
          to="/employee/training"
          icon={<BookOpen size={22} />}
          title="Тренировка"
          meta={`${settings.training_count} вопросов · без ограничения времени`}
          text="Случайный билет, результат сразу после завершения, разбор ошибок с пояснениями."
        />
        <ModeTile
          to="/employee/exam"
          dark
          icon={<ClipboardCheck size={22} />}
          title="Экзамен"
          meta={`${settings.exam_count} вопросов · ${settings.exam_minutes > 0 ? `${settings.exam_minutes} мин` : 'без лимита'} · проходной ${settings.pass_percent}%`}
          text="Итоговая проверка знаний. Результат «сдан / не сдан» сохраняется в истории аттестаций."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="card card-pad">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Мой прогресс</h2>
            <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
              <TrendingUp size={14} /> последние {trend.length} попыток
            </span>
          </div>
          {trend.length >= 2 ? (
            <AreaChart data={trend.map((a) => ({ label: fmtShortDay(a.completed_at!), value: a.percentage ?? 0, extra: a.type === 'exam' ? 'экзамен' : 'тренировка' }))} />
          ) : (
            <Empty icon={<TrendingUp size={22} />} title="Здесь появится график" text="Пройдите хотя бы две попытки, чтобы увидеть динамику." />
          )}
        </div>
        <div className="card card-pad">
          <h2 className="mb-5 flex items-center gap-2 text-[17px] font-bold">
            <Flame size={18} className="text-brand-600" /> Темы для повторения
          </h2>
          {weak.length ? (
            <HBarList items={weak} />
          ) : (
            <Empty icon={<CheckCircle2 size={22} />} title="Слабых тем пока нет" text="Мы подскажем, какие темы стоит повторить, после нескольких попыток." className="py-6" />
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <h2 className="text-[17px] font-bold">Последние попытки</h2>
          <Link to="/employee/history" className="flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:underline">
            Все результаты <ArrowRight size={14} />
          </Link>
        </div>
        {att.length ? (
          <div className="border-t border-line">
            <AttemptsTable rows={att.slice(0, 5)} base="/employee/history" pass={settings.pass_percent} />
          </div>
        ) : (
          !loading && <Empty icon={<Clock size={22} />} title="Попыток ещё нет" text="Начните с тренировки — это займёт около 10 минут." className="border-t border-line" />
        )}
      </div>
    </div>
  )
}

function ModeTile({ to, icon, title, meta, text, dark }: { to: string; icon: ReactNode; title: string; meta: string; text: string; dark?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'group relative overflow-hidden rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 sm:p-7',
        dark ? 'border-transparent bg-[#1E1F23] text-white shadow-lift' : 'border-line/70 bg-white shadow-card hover:shadow-lift',
      )}
    >
      <div className={cn('pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-2xl', dark ? 'bg-brand-600/40' : 'bg-brand-100/70')} />
      <div className="relative flex items-start gap-4">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', dark ? 'bg-brand-grad text-white shadow-brand' : 'bg-brand-50 text-brand-600 ring-1 ring-brand-100')}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[20px] font-extrabold">{title}</h3>
            <span className={cn('grid h-9 w-9 place-items-center rounded-full transition group-hover:translate-x-1', dark ? 'bg-white/10' : 'bg-brand-50 text-brand-700')}>
              <ArrowRight size={17} />
            </span>
          </div>
          <div className={cn('mt-0.5 text-[13px] font-semibold', dark ? 'text-brand-200' : 'text-brand-700')}>{meta}</div>
          <p className={cn('mt-3 text-[14px] leading-relaxed', dark ? 'text-white/70' : 'text-ink-3')}>{text}</p>
        </div>
      </div>
    </Link>
  )
}
