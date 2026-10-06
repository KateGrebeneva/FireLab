import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Award, CheckCircle2, ClipboardCheck, Percent, Target, Trophy, XCircle } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { getCategoryStats, getDaily, getHardest, getOverview } from '../../services/stats'
import { listEmployees } from '../../services/employees'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Segmented from '../../components/ui/Segmented'
import { CardsSkeleton } from '../../components/ui/Loader'
import Empty, { ErrorBox } from '../../components/ui/Empty'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import AreaChart from '../../components/charts/AreaChart'
import BarChart from '../../components/charts/BarChart'
import Donut from '../../components/charts/Donut'
import HBarList from '../../components/charts/HBarList'
import { fmtRelative, fmtShortDay } from '../../utils/format'

export default function Stats() {
  useTitle('Статистика')
  const { settings } = useSettings()
  const [days, setDays] = useState(30)
  const { data, loading, error, reload } = useAsync(async () => {
    const [ov, daily, cats, hard, emps] = await Promise.all([getOverview(days), getDaily(days), getCategoryStats(), getHardest(15), listEmployees()])
    return { ov, daily, cats, hard, emps }
  }, [days])

  const best = useMemo(
    () =>
      (data?.emps ?? [])
        .filter((e) => e.stats && e.stats.attempts > 0)
        .sort((a, b) => (b.stats!.best_pct - a.stats!.best_pct) || (b.stats!.avg_pct - a.stats!.avg_pct))
        .slice(0, 6),
    [data],
  )

  const needTraining = useMemo(
    () =>
      (data?.emps ?? [])
        .filter((e) => e.is_active)
        .filter((e) => {
          const s = e.stats
          if (!s || s.attempts === 0) return true
          if (s.last_exam_passed === false) return true
          if (s.exams === 0 && s.avg_pct < settings.pass_percent) return true
          return false
        })
        .sort((a, b) => (a.stats?.avg_pct ?? 0) - (b.stats?.avg_pct ?? 0)),
    [data, settings.pass_percent],
  )

  const ov = data?.ov
  const examDays = (data?.daily ?? []).filter((d) => d.exams > 0)

  return (
    <div>
      <PageHeader
        eyebrow="Аналитика"
        title="Статистика"
        description="Результаты всех сотрудников: успеваемость, сдача экзаменов и проблемные темы."
        actions={
          <Segmented
            value={days}
            onChange={setDays}
            options={[
              { value: 7, label: '7 дней' },
              { value: 30, label: '30 дней' },
              { value: 90, label: '90 дней' },
              { value: 365, label: 'Год' },
            ]}
          />
        }
      />
      {error && <ErrorBox text={error} onRetry={() => void reload()} />}

      {loading && !data ? (
        <CardsSkeleton n={5} className="xl:grid-cols-5" />
      ) : ov ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
          <StatCard icon={<Target size={18} />} label="Средний результат" value={`${ov.avg_pct}%`} />
          <StatCard icon={<ClipboardCheck size={18} />} label="Экзаменов" value={ov.exams} style={{ animationDelay: '50ms' }} />
          <StatCard icon={<CheckCircle2 size={18} />} label="Сдано" value={ov.exams_passed} style={{ animationDelay: '100ms' }} />
          <StatCard icon={<XCircle size={18} />} label="Не сдано" value={ov.exams - ov.exams_passed} style={{ animationDelay: '150ms' }} />
          <StatCard className="col-span-2 sm:col-span-1" accent icon={<Percent size={18} />} label="Успешная сдача" value={`${ov.pass_rate}%`} hint={`проходной балл ${settings.pass_percent}%`} style={{ animationDelay: '200ms' }} />
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <div className="card card-pad">
          <h2 className="mb-5 text-[17px] font-bold">Итоги экзаменов</h2>
          {ov && ov.exams > 0 ? (
            <Donut
              center={`${ov.pass_rate}%`}
              sub="сдали"
              slices={[
                { label: 'Сдано', value: ov.exams_passed, color: '#10B981' },
                { label: 'Не сдано', value: ov.exams - ov.exams_passed, color: '#B3162B' },
              ]}
            />
          ) : (
            <Empty title="Экзаменов пока не было" className="py-8" />
          )}
        </div>
        <div className="card card-pad">
          <h2 className="mb-4 text-[17px] font-bold">Процент сдачи экзаменов по дням</h2>
          {examDays.length >= 2 ? (
            <AreaChart data={examDays.map((d) => ({ label: fmtShortDay(d.day), value: Math.round((d.passed / d.exams) * 100), extra: `${d.passed}/${d.exams}` }))} />
          ) : examDays.length === 1 ? (
            <BarChart data={examDays.map((d) => ({ label: fmtShortDay(d.day), value: d.exams, secondary: d.passed }))} legend={['Экзамены', 'Сдано']} />
          ) : (
            <Empty title="Нет экзаменов за период" className="py-8" />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="card card-pad">
          <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold">
            <Trophy size={18} className="text-amber-500" /> Лучшие результаты
          </h2>
          {best.length ? (
            <ul className="space-y-1">
              {best.map((e, n) => (
                <li key={e.id}>
                  <Link to={`/admin/employees/${e.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-gray-50">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold ${n < 3 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-ink-3'}`}>{n + 1}</span>
                    <Avatar name={e.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-ink">{e.full_name}</div>
                      <div className="text-[12px] text-ink-4">
                        {e.stats!.attempts} попыт. · средний {e.stats!.avg_pct}%
                      </div>
                    </div>
                    <span className="font-display text-[18px] font-extrabold text-emerald-600">{e.stats!.best_pct}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<Award size={22} />} title="Нет данных" className="py-8" />
          )}
        </div>
        <div className="card card-pad">
          <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold">
            <AlertTriangle size={18} className="text-brand-600" /> Требуется дополнительное обучение
            <Badge tone="brand" className="ml-auto">
              {needTraining.length}
            </Badge>
          </h2>
          {needTraining.length ? (
            <ul className="scrollbar-thin max-h-[380px] space-y-1 overflow-y-auto pr-1">
              {needTraining.map((e) => (
                <li key={e.id}>
                  <Link to={`/admin/employees/${e.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-gray-50">
                    <Avatar name={e.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-ink">{e.full_name}</div>
                      <div className="text-[12px] text-ink-4">
                        {!e.stats || e.stats.attempts === 0
                          ? 'ещё не проходил тестирование'
                          : e.stats.last_exam_passed === false
                            ? `последний экзамен: ${e.stats.last_exam_pct}% · ${fmtRelative(e.stats.last_at)}`
                            : `экзамен не сдавал · средний ${e.stats.avg_pct}%`}
                      </div>
                    </div>
                    {e.stats?.attempts ? <Badge tone={e.stats.last_exam_passed === false ? 'brand' : 'amber'}>{e.stats.avg_pct}%</Badge> : <Badge tone="gray">нет попыток</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<CheckCircle2 size={22} />} title="Все сотрудники аттестованы" className="py-8" />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <div className="card card-pad">
          <h2 className="mb-5 text-[17px] font-bold">Ошибки по темам</h2>
          {data?.cats.length ? (
            <HBarList
              items={data.cats
                .filter((c) => c.total > 0)
                .map((c) => ({ label: c.category, value: Math.round((c.wrong / c.total) * 100), sub: `${c.wrong} ошибок из ${c.total} ответов` }))
                .sort((a, b) => b.value - a.value)}
            />
          ) : (
            <Empty title="Нет данных" className="py-8" />
          )}
        </div>
        <div className="card overflow-hidden">
          <h2 className="px-5 pb-3 pt-5 text-[17px] font-bold sm:px-6">Самые сложные вопросы</h2>
          {data?.hard.length ? (
            <ol className="divide-y divide-line border-t border-line">
              {data.hard.map((h, n) => {
                const pct = Math.round((h.wrong / h.total) * 100)
                return (
                  <li key={h.question_text} className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
                    <span className="mt-0.5 w-6 shrink-0 text-[13px] font-bold text-ink-4">{n + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] leading-snug text-ink">{h.question_text}</div>
                      <div className="mt-1 text-[12px] text-ink-4">{h.category}</div>
                      <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full origin-left animate-growx rounded-full bg-gradient-to-r from-brand-400 to-brand-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-display text-[18px] font-extrabold text-brand-700">{pct}%</div>
                      <div className="text-[11px] text-ink-4">
                        {h.wrong} из {h.total}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <Empty title="Пока недостаточно ответов" text="Вопрос попадает в рейтинг, когда на него ответили хотя бы дважды." className="border-t border-line py-8" />
          )}
        </div>
      </div>
    </div>
  )
}
