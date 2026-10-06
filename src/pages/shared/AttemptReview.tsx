import { useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Check, ListChecks, Trash2, CheckCircle2, ClipboardCheck, Clock, Lightbulb, PartyPopper, RotateCcw, X, XCircle } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../lib/auth'
import { deleteAttempt, getAttempt } from '../../services/attempts'
import { useConfirm } from '../../components/ui/Confirm'
import { useToast } from '../../components/ui/Toast'
import { humanError } from '../../lib/errors'
import Ring from '../../components/charts/Ring'
import Segmented from '../../components/ui/Segmented'
import { Button, ButtonLink } from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Loader'
import Empty, { ErrorBox } from '../../components/ui/Empty'
import { ResultBadge } from '../../components/AttemptsTable'
import { Avatar } from '../../components/ui/Avatar'
import { cn } from '../../lib/cn'
import { fmtDateTime, fmtDuration, typeLabel } from '../../utils/format'
import type { AttemptQuestion } from '../../types'

const LETTERS = 'ABCDEFGHIJ'
const chosenIds = (q: AttemptQuestion) => q.selected_ids ?? (q.selected !== null ? [q.selected] : [])
const isRight = (q: AttemptQuestion) => {
  const chosen = chosenIds(q)
  const right = q.options.filter((o) => o.is_correct).map((o) => o.id)
  return chosen.length > 0 && chosen.length === right.length && right.every((id) => chosen.includes(id))
}

export default function AttemptReview() {
  const { id = '' } = useParams()
  const loc = useLocation()
  const fresh = Boolean((loc.state as { fresh?: boolean } | null)?.fresh)
  const { profile } = useAuth()
  const { settings } = useSettings()
  const admin = profile?.role === 'admin'
  const [filter, setFilter] = useState<'all' | 'wrong' | 'right'>(fresh ? 'wrong' : 'all')
  const { data, loading, error, reload } = useAsync(() => getAttempt(id), [id])
  const nav = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  useTitle('Разбор попытки')

  const qs = useMemo(() => data?.questions ?? [], [data])
  const shown = qs.filter((q) => (filter === 'all' ? true : filter === 'wrong' ? !isRight(q) : isRight(q)))

  if (loading && !data) return <PageLoader />
  if (error) return <ErrorBox text={error} onRetry={() => void reload()} />
  if (!data) return null

  const a = data.attempt
  const exam = a.type === 'exam'
  const pct = a.percentage ?? 0
  const good = exam ? Boolean(a.passed) : pct >= settings.pass_percent
  const back = admin ? '/admin/results' : '/employee/history'
  const showExpl = admin || settings.show_explanations

  const remove = async () => {
    const ok = await confirm({
      title: 'Удалить результат?',
      text: (
        <>
          {typeLabel(a.type)} от {fmtDateTime(a.completed_at)}
          {a.profiles?.full_name ? ` (${a.profiles.full_name})` : ''} будет удалён без возможности восстановления. Действие попадёт в журнал.
        </>
      ),
      confirmText: 'Удалить',
      danger: true,
    })
    if (!ok) return
    setDeleting(true)
    try {
      await deleteAttempt(a.id)
      toast.success('Результат удалён')
      nav(back, { replace: true })
    } catch (e) {
      toast.error(humanError(e))
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 transition hover:text-brand-700">
          <ArrowLeft size={15} /> {admin ? 'Все результаты' : 'Мои результаты'}
        </Link>
        {admin && (
          <Button variant="danger" size="sm" icon={<Trash2 size={15} />} loading={deleting} onClick={() => void remove()}>
            Удалить результат
          </Button>
        )}
      </div>

      {/* summary */}
      <div className="card overflow-hidden">
        <div className={cn('relative px-6 py-7 sm:px-9 sm:py-9', good ? 'bg-gradient-to-br from-emerald-50 via-white to-white' : 'bg-gradient-to-br from-brand-50 via-white to-white')}>
          <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center">
            <Ring value={pct} size={150} stroke={13} tone={good ? 'green' : 'brand'} sub={exam ? (a.passed ? 'сдан' : 'не сдан') : 'результат'} />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3">
                  {exam ? <ClipboardCheck size={15} /> : <BookOpen size={15} />} {typeLabel(a.type)}
                </span>
                <ResultBadge a={a} />
              </div>
              <h1 className="mt-2 text-[26px] font-extrabold leading-tight sm:text-[30px]">
                {fresh ? (
                  good ? (
                    <span className="inline-flex items-center gap-2">
                      Отличный результат! <PartyPopper size={26} className="text-emerald-600" />
                    </span>
                  ) : exam ? (
                    'Экзамен не сдан'
                  ) : (
                    'Есть над чем поработать'
                  )
                ) : exam ? (
                  a.passed ? (
                    'Экзамен сдан'
                  ) : (
                    'Экзамен не сдан'
                  )
                ) : (
                  'Тренировка завершена'
                )}
              </h1>
              {admin && a.profiles?.full_name && (
                <Link to={`/admin/employees/${a.user_id}`} className="mt-2 inline-flex items-center gap-2 text-[14px] font-medium text-ink-2 hover:text-brand-700">
                  <Avatar name={a.profiles.full_name} size="sm" /> {a.profiles.full_name}
                </Link>
              )}
              <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-md">
                <Metric icon={<CheckCircle2 size={16} className="text-emerald-600" />} label="Верно" value={a.correct_answers ?? 0} />
                <Metric icon={<XCircle size={16} className="text-brand-600" />} label="Ошибки" value={a.incorrect_answers ?? 0} />
                <Metric icon={<Clock size={16} className="text-ink-3" />} label="Время" value={fmtDuration(a.started_at, a.completed_at)} />
              </div>
              <div className="mt-4 text-[12.5px] text-ink-4">
                {fmtDateTime(a.completed_at)} · {a.total_questions} вопросов{exam ? ` · проходной балл ${settings.pass_percent}%` : ''}
              </div>
            </div>
          </div>
        </div>
        {!admin && (
          <div className="flex flex-col gap-2 border-t border-line bg-gray-50/50 px-6 py-4 sm:flex-row sm:justify-end sm:px-9">
            <ButtonLink to="/employee/training" variant="secondary" icon={<RotateCcw size={16} />}>
              Новая тренировка
            </ButtonLink>
            {!a.passed && (
              <ButtonLink to="/employee/exam" icon={<ClipboardCheck size={16} />}>
                {exam ? 'Пересдать экзамен' : 'Перейти к экзамену'}
              </ButtonLink>
            )}
          </div>
        )}
      </div>

      {/* review */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[20px] font-extrabold">Разбор ответов</h2>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `Все · ${qs.length}` },
            { value: 'wrong', label: `Ошибки · ${qs.filter((q) => !isRight(q)).length}` },
            { value: 'right', label: `Верные · ${qs.filter(isRight).length}` },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <Empty icon={<CheckCircle2 size={22} />} title={filter === 'wrong' ? 'Ошибок нет — превосходно!' : 'Нет вопросов'} />
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((q, n) => {
            const ok = isRight(q)
            return (
              <article key={q.id} className="card animate-fade-up overflow-hidden" style={{ animationDelay: `${Math.min(n, 10) * 30}ms` }}>
                <div className={cn('h-1', ok ? 'bg-emerald-500' : 'bg-brand-500')} />
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[13px] font-bold', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700')}>
                      {q.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      {q.category && <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wider text-ink-4">{q.category}</div>}
                      <h3 className="font-sans text-[15.5px] font-semibold leading-snug text-ink">{q.question_text}</h3>
                      {q.options.filter((o) => o.is_correct).length > 1 && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
                          <ListChecks size={13} /> несколько правильных ответов
                        </div>
                      )}
                    </div>
                    <span className={cn('hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold sm:inline-flex', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700')}>
                      {ok ? <Check size={13} /> : <X size={13} />} {ok ? 'Верно' : chosenIds(q).length === 0 ? 'Нет ответа' : 'Ошибка'}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2 sm:pl-11">
                    {q.options.map((o, k) => {
                      const chosen = chosenIds(q).includes(o.id)
                      return (
                        <li
                          key={o.id}
                          className={cn(
                            'flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-[14px] leading-snug',
                            o.is_correct ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900' : chosen ? 'border-brand-200 bg-brand-50/70 text-brand-900' : 'border-line text-ink-3',
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11.5px] font-bold',
                              o.is_correct ? 'bg-emerald-600 text-white' : chosen ? 'bg-brand-600 text-white' : 'bg-gray-100 text-ink-4',
                            )}
                          >
                            {o.is_correct ? <Check size={13} strokeWidth={3} /> : chosen ? <X size={13} strokeWidth={3} /> : LETTERS[k]}
                          </span>
                          <span className="flex-1">{o.text}</span>
                          {chosen && <span className="shrink-0 text-[11.5px] font-semibold opacity-70">ваш ответ</span>}
                        </li>
                      )
                    })}
                  </ul>
                  {showExpl && q.explanation && (
                    <div className="mt-4 flex gap-3 rounded-xl bg-amber-50/70 px-4 py-3 text-[13.5px] leading-relaxed text-amber-950 ring-1 ring-amber-100 sm:ml-11">
                      <Lightbulb size={17} className="mt-0.5 shrink-0 text-amber-600" />
                      <div>
                        <b className="font-semibold">Пояснение: </b>
                        {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2.5 shadow-card ring-1 ring-line/70">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-[19px] font-extrabold tabular-nums text-ink">{value}</div>
    </div>
  )
}
