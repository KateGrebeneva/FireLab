import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Award, ClipboardList, FileQuestion, Percent, Target, UserPlus, Users } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../lib/auth'
import { getCategoryStats, getDaily, getHardest, getOverview } from '../../services/stats'
import { listAttempts } from '../../services/attempts'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Segmented from '../../components/ui/Segmented'
import { CardsSkeleton } from '../../components/ui/Loader'
import Empty, { ErrorBox } from '../../components/ui/Empty'
import { ButtonLink } from '../../components/ui/Button'
import AreaChart from '../../components/charts/AreaChart'
import BarChart from '../../components/charts/BarChart'
import HBarList from '../../components/charts/HBarList'
import AttemptsTable from '../../components/AttemptsTable'
import { fmtShortDay, greetName } from '../../utils/format'

export default function Dashboard() {
  useTitle('Главная')
  const { profile } = useAuth()
  const { settings } = useSettings()
  const [days, setDays] = useState(30)
  const { data, loading, error, reload } = useAsync(async () => {
    const [ov, daily, cats, hard, recent] = await Promise.all([getOverview(days), getDaily(days), getCategoryStats(), getHardest(5), listAttempts({ pageSize: 6 })])
    return { ov, daily, cats, hard, recent: recent.rows }
  }, [days])

  const ov = data?.ov
  const withData = (data?.daily ?? []).filter((d) => d.attempts > 0)
  const catItems = (data?.cats ?? [])
    .filter((c) => c.total > 0)
    .map((c) => ({ label: c.category, value: Math.round((c.wrong / c.total) * 100), right: `${Math.round((c.wrong / c.total) * 100)}%` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  return (
    <div>
      <PageHeader
        eyebrow={settings.org_name}
        title={`Здравствуйте, ${greetName(profile)}!`}
        description={
          <>
            <span className="mr-2 inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[12.5px] font-semibold text-ink-2 ring-1 ring-line">@{profile?.username}</span>
            Сводка по обучению и аттестации сотрудников.
          </>
        }
        actions={
          <>
            <Segmented
              value={days}
              onChange={setDays}
              options={[
                { value: 7, label: '7 дней' },
                { value: 30, label: '30 дней' },
                { value: 90, label: '90 дней' },
              ]}
            />
            <ButtonLink to="/admin/employees" state={{ create: true }} icon={<UserPlus size={16} />} className="hidden sm:inline-flex">
              Сотрудник
            </ButtonLink>
          </>
        }
      />

      {error && <ErrorBox text={error} onRetry={() => void reload()} />}

      {loading && !data ? (
        <CardsSkeleton n={6} className="xl:grid-cols-3" />
      ) : ov ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          <StatCard icon={<Users size={18} />} label="Сотрудников" value={ov.employees} hint={`${ov.active_employees} активных`} />
          <StatCard icon={<FileQuestion size={18} />} label="Вопросов в базе" value={ov.questions} hint={ov.questions < settings.exam_count ? `нужно минимум ${settings.exam_count} для экзамена` : 'банк готов к работе'} style={{ animationDelay: '50ms' }} />
          <StatCard icon={<ClipboardList size={18} />} label="Прохождений" value={ov.attempts} hint={`${ov.attempts_period} за ${days} дн.`} style={{ animationDelay: '100ms' }} />
          <StatCard icon={<Target size={18} />} label="Средний результат" value={`${ov.avg_pct}%`} hint="по всем попыткам" style={{ animationDelay: '150ms' }} />
          <StatCard accent icon={<Percent size={18} />} label="Успешная сдача" value={`${ov.pass_rate}%`} hint={`${ov.exams_passed} из ${ov.exams} экзаменов`} style={{ animationDelay: '200ms' }} />
          <StatCard icon={<Activity size={18} />} label={`Попыток за ${days} дн.`} value={ov.attempts_period} hint="тренировки и экзамены" style={{ animationDelay: '250ms' }} />
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="card card-pad">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Средний результат по дням</h2>
            <span className="text-[12.5px] text-ink-3">{withData.length} дн. с активностью</span>
          </div>
          {withData.length >= 2 ? (
            <AreaChart data={withData.map((d) => ({ label: fmtShortDay(d.day), value: d.avg_pct, extra: `${d.attempts} попыт.` }))} />
          ) : (
            <Empty icon={<Activity size={22} />} title="Недостаточно данных" text="График появится, когда сотрудники пройдут тесты хотя бы в два разных дня." className="py-8" />
          )}
        </div>
        <div className="card card-pad">
          <h2 className="mb-4 text-[17px] font-bold">Прохождения по дням</h2>
          {(data?.daily ?? []).some((d) => d.attempts > 0) ? (
            <BarChart
              data={(data?.daily ?? []).map((d) => ({ label: fmtShortDay(d.day), value: d.attempts, secondary: d.exams, hint: fmtShortDay(d.day) }))}
              legend={['Все попытки', 'Экзамены']}
            />
          ) : (
            <Empty icon={<ClipboardList size={22} />} title="Пока нет прохождений" className="py-8" />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div className="card card-pad">
          <h2 className="mb-5 text-[17px] font-bold">Темы с наибольшим процентом ошибок</h2>
          {catItems.length ? <HBarList items={catItems} /> : <Empty title="Нет данных" className="py-8" />}
        </div>
        <div className="card card-pad">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Самые сложные вопросы</h2>
            <Link to="/admin/stats" className="flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:underline">
              Подробнее <ArrowRight size={14} />
            </Link>
          </div>
          {data?.hard.length ? (
            <ol className="space-y-3">
              {data.hard.map((h, n) => (
                <li key={h.question_text} className="flex items-start gap-3 rounded-2xl border border-line/70 p-3.5 transition hover:border-brand-100 hover:bg-brand-50/30">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-[12px] font-bold text-brand-700">{n + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink">{h.question_text}</div>
                    <div className="mt-1 text-[12px] text-ink-4">{h.category}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-[17px] font-extrabold text-brand-700">{Math.round((h.wrong / h.total) * 100)}%</div>
                    <div className="text-[11px] text-ink-4">ошибок из {h.total}</div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Empty icon={<Award size={22} />} title="Пока недостаточно ответов" text="Вопрос попадает в рейтинг, когда на него ответили хотя бы дважды." className="py-8" />
          )}
        </div>
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <h2 className="text-[17px] font-bold">Последние попытки</h2>
          <Link to="/admin/results" className="flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:underline">
            Все результаты <ArrowRight size={14} />
          </Link>
        </div>
        <div className="border-t border-line">
          {data?.recent.length ? (
            <AttemptsTable rows={data.recent} base="/admin/results" showUser pass={settings.pass_percent} />
          ) : (
            !loading && <Empty title="Попыток пока нет" text="Добавьте сотрудников и вопросы — и можно начинать." />
          )}
        </div>
      </div>
    </div>
  )
}
