import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flag,
  Keyboard,
  ListChecks,
  RotateCcw,
  Shuffle,
  Target,
  Timer,
} from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { availableQuestions } from '../../services/questions'
import { finishAttempt, startAttempt } from '../../services/attempts'
import { humanError } from '../../lib/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/Confirm'
import { useToast } from '../../components/ui/Toast'
import { Skeleton } from '../../components/ui/Loader'
import { cn } from '../../lib/cn'
import { fmtTimer, plural } from '../../utils/format'
import type { AttemptType, Ticket } from '../../types'

const LETTERS = 'ABCDEFGHIJ'
const storeKey = (k: AttemptType) => `firelab.quiz.${k}`

interface Saved {
  ticket: Ticket
  answers: Record<string, number[] | number>
  index: number
  startedAt: number
}

function loadSaved(kind: AttemptType): Saved | null {
  try {
    const raw = sessionStorage.getItem(storeKey(kind))
    if (!raw) return null
    const s = JSON.parse(raw) as Saved
    if (!s.ticket?.attempt_id || !Array.isArray(s.ticket.questions)) return null
    if (s.ticket.deadline && new Date(s.ticket.deadline).getTime() < Date.now()) return null
    if (Date.now() - s.startedAt > 12 * 3600e3) return null
    return s
  } catch {
    return null
  }
}
function save(kind: AttemptType, s: Saved | null) {
  try {
    if (s) sessionStorage.setItem(storeKey(kind), JSON.stringify(s))
    else sessionStorage.removeItem(storeKey(kind))
  } catch {
    /* хранилище недоступно — продолжаем без автосохранения */
  }
}

export default function Quiz({ kind }: { kind: AttemptType }) {
  const exam = kind === 'exam'
  useTitle(exam ? 'Экзамен' : 'Тренировка')
  const { settings } = useSettings()
  const nav = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [i, setI] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [startErr, setStartErr] = useState('')
  const [now, setNow] = useState(Date.now())
  const startedAt = useRef(Date.now())
  const [saved, setSaved] = useState<Saved | null>(() => loadSaved(kind))

  const avail = useAsync(() => availableQuestions(), [])
  const need = exam ? settings.exam_count : settings.training_count

  // сброс при переключении между тренировкой и экзаменом
  useEffect(() => {
    setTicket(null)
    setAnswers({})
    setI(0)
    setStartErr('')
    setSaved(loadSaved(kind))
  }, [kind])

  // автосохранение прогресса (на случай перезагрузки страницы)
  useEffect(() => {
    if (ticket) save(kind, { ticket, answers, index: i, startedAt: startedAt.current })
  }, [ticket, answers, i, kind])

  // предупреждение при закрытии вкладки во время теста
  useEffect(() => {
    if (!ticket) return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [ticket])

  // таймер (дедлайн задаёт сервер)
  useEffect(() => {
    if (!ticket?.deadline) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [ticket])

  const left = ticket?.deadline ? Math.round((new Date(ticket.deadline).getTime() - now) / 1000) : null

  const begin = async () => {
    setStarting(true)
    setStartErr('')
    try {
      const t = await startAttempt(kind)
      startedAt.current = Date.now()
      save(kind, null)
      setSaved(null)
      setAnswers({})
      setI(0)
      setNow(Date.now())
      setTicket(t)
    } catch (e) {
      setStartErr(humanError(e))
    } finally {
      setStarting(false)
    }
  }

  const resume = () => {
    if (!saved) return
    startedAt.current = saved.startedAt
    // совместимость с ранее сохранённым форматом (один номер вместо массива)
    setAnswers(Object.fromEntries(Object.entries(saved.answers).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])))
    setI(Math.min(saved.index, saved.ticket.questions.length - 1))
    setNow(Date.now())
    setTicket(saved.ticket)
    setSaved(null)
  }

  const submit = useCallback(
    async (force = false) => {
      if (!ticket || submitting) return
      const unanswered = ticket.questions.filter((x) => !answers[x.id]?.length).length
      if (!force && unanswered > 0) {
        const ok = await confirm({
          title: 'Завершить с пропусками?',
          text: (
            <>
              Без ответа {unanswered} {plural(unanswered, 'вопрос', 'вопроса', 'вопросов')}. Они будут засчитаны как ошибки.
            </>
          ),
          confirmText: 'Завершить',
          danger: true,
        })
        if (!ok) return
      }
      setSubmitting(true)
      try {
        const r = await finishAttempt(ticket.attempt_id, answers)
        save(kind, null)
        if (r.late) toast.error('Время вышло: ответы, отправленные после окончания времени, не засчитаны.')
        setTicket(null)
        nav(`/employee/history/${ticket.attempt_id}`, { state: { fresh: true } })
      } catch (e) {
        toast.error(humanError(e))
        setSubmitting(false)
      }
    },
    [ticket, submitting, answers, confirm, kind, nav, toast],
  )

  // автозавершение по таймеру
  const autoSubmitted = useRef<string | null>(null)
  useEffect(() => {
    if (ticket && left !== null && left <= 0 && !submitting && autoSubmitted.current !== ticket.attempt_id) {
      autoSubmitted.current = ticket.attempt_id
      toast.toast('Время экзамена истекло — попытка завершена автоматически')
      void submit(true)
    }
  }, [left, ticket, submitting, submit, toast])

  const q = ticket?.questions[i]
  const total = ticket?.questions.length ?? 0
  const answered = ticket ? ticket.questions.filter((x) => answers[x.id]?.length).length : 0

  const go = useCallback(
    (n: number) => {
      if (!ticket) return
      const next = Math.max(0, Math.min(ticket.questions.length - 1, n))
      setDir(next >= i ? 1 : -1)
      setI(next)
    },
    [ticket, i],
  )

  const pick = useCallback(
    (optId: number) => {
      if (!q) return
      setAnswers((a) => {
        if (!q.multi) return { ...a, [q.id]: [optId] }
        const cur = a[q.id] ?? []
        const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId].sort((x, y) => x - y)
        return { ...a, [q.id]: next }
      })
    },
    [q],
  )

  // клавиатура: 1–9 / A–D — выбор, ←/→ — навигация, Enter — далее
  useEffect(() => {
    if (!ticket || !q) return
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (document.querySelector('[role="dialog"]')) return
      const k = e.key.toUpperCase()
      const num = Number.parseInt(e.key, 10)
      let idx = -1
      if (num >= 1 && num <= q.options.length) idx = num - 1
      else if (LETTERS.slice(0, q.options.length).includes(k) && k.length === 1) idx = LETTERS.indexOf(k)
      if (idx >= 0) {
        pick(q.options[idx].id)
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (i < total - 1) go(i + 1)
      } else if (e.key === 'ArrowLeft') go(i - 1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [ticket, q, i, total, go, pick])

  const progress = total ? Math.round((answered / total) * 100) : 0
  const lowTime = left !== null && left <= 60

  const rules = useMemo(
    () =>
      exam
        ? [
            [Shuffle, `${settings.exam_count} случайных вопросов из общей базы`],
            [Target, `Проходной балл — ${settings.pass_percent}%`],
            [Timer, settings.exam_minutes > 0 ? `Ограничение времени — ${settings.exam_minutes} мин` : 'Без ограничения по времени'],
            [ListChecks, 'Можно возвращаться к вопросам до завершения'],
            [CheckCircle2, 'Где несколько правильных ответов — нужно выбрать все'],
          ]
        : [
            [Shuffle, `${settings.training_count} случайных вопросов, новый билет каждый раз`],
            [Clock, 'Без ограничения по времени'],
            [CheckCircle2, 'Результат и разбор ошибок сразу после завершения'],
            [ListChecks, 'Пояснения; где несколько ответов — выберите все правильные'],
          ],
    [exam, settings],
  )

  /* ---------------- INTRO ---------------- */
  if (!ticket) {
    const notEnough = avail.data !== undefined && avail.data < need
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card overflow-hidden">
          <div className={cn('relative overflow-hidden px-6 py-8 sm:px-10 sm:py-10', exam ? 'bg-[#1E1F23] text-white' : 'bg-gradient-to-br from-brand-50 via-white to-white')}>
            <div className={cn('pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full blur-3xl', exam ? 'bg-brand-600/40' : 'bg-brand-100')} />
            <div className="relative flex items-start gap-4">
              <span className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-2xl', exam ? 'bg-brand-grad shadow-brand' : 'bg-white text-brand-600 shadow-card ring-1 ring-brand-100')}>
                {exam ? <ClipboardCheck size={26} /> : <BookOpen size={26} />}
              </span>
              <div>
                <div className={cn('text-[11px] font-bold uppercase tracking-[0.16em]', exam ? 'text-brand-200' : 'text-brand-600')}>{exam ? 'Аттестация' : 'Обучение'}</div>
                <h1 className="mt-1 text-[28px] font-extrabold leading-tight sm:text-[32px]">{exam ? 'Экзамен' : 'Тренировка'}</h1>
                <p className={cn('mt-2 max-w-lg text-[15px]', exam ? 'text-white/70' : 'text-ink-3')}>
                  {exam ? 'Итоговая проверка знания требований охраны труда. Результат сохраняется в истории аттестаций.' : 'Подготовьтесь к экзамену без давления. Каждый запуск — новый случайный билет.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-10">
            <ul className="grid gap-3 sm:grid-cols-2">
              {rules.map(([Icon, t]) => {
                const I = Icon as typeof Clock
                return (
                  <li key={t as string} className="flex items-start gap-3 rounded-2xl border border-line/80 bg-gray-50/50 p-4 text-[14px] text-ink-2">
                    <I size={18} className="mt-0.5 shrink-0 text-brand-600" />
                    {t as string}
                  </li>
                )
              })}
            </ul>

            <div className="flex items-center gap-2 text-[12.5px] text-ink-4">
              <Keyboard size={15} /> Подсказка: клавиши 1–4 выбирают ответ, ← → переключают вопросы. В вопросах с несколькими ответами отметьте все правильные.
            </div>

            {avail.loading ? (
              <Skeleton className="h-12 w-full" />
            ) : notEnough ? (
              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-900">
                <AlertTriangle size={20} className="shrink-0 text-amber-600" />
                <div>
                  <b>Недостаточно вопросов в базе.</b> Для режима «{exam ? 'Экзамен' : 'Тренировка'}» нужно минимум {need}, сейчас доступно {avail.data}. Обратитесь к администратору.
                </div>
              </div>
            ) : null}

            {startErr && <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-[14px] text-brand-800">{startErr}</div>}

            <div className="flex flex-col gap-3 sm:flex-row">
              {saved && (
                <Button variant="secondary" size="lg" icon={<RotateCcw size={17} />} onClick={resume}>
                  Продолжить начатую попытку
                </Button>
              )}
              <Button size="lg" loading={starting} disabled={notEnough || avail.loading} onClick={() => void begin()} iconRight={<ArrowRight size={18} />} className="sm:min-w-[220px]">
                {saved ? 'Начать заново' : exam ? 'Начать экзамен' : 'Начать тренировку'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------- RUNNER ---------------- */
  if (!q) return null
  const isLast = i === total - 1

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        {/* top bar */}
        <div className="card mb-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', exam ? 'bg-ink text-white' : 'bg-brand-50 text-brand-600')}>
                {exam ? <ClipboardCheck size={17} /> : <BookOpen size={17} />}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold">{exam ? 'Экзаменационный билет' : 'Тренировочный билет'}</div>
                <div className="text-[12.5px] text-ink-3">
                  Вопрос {i + 1} из {total} · отвечено {answered}
                </div>
              </div>
            </div>
            {left !== null && (
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-[15px] font-bold tabular-nums transition-colors',
                  lowTime ? 'animate-pulse bg-brand-600 text-white' : 'bg-gray-100 text-ink',
                )}
                aria-live="polite"
              >
                <Timer size={16} /> {fmtTimer(left)}
              </div>
            )}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* question */}
        <div className="card p-5 sm:p-8">
          <div key={q.id} className={cn(dir === 1 ? 'animate-slide-in' : 'animate-fade-in')}>
            {q.category && <div className="eyebrow mb-3">{q.category}</div>}
            <h2 className="font-sans text-[18px] font-bold leading-snug text-ink sm:text-[21px]">{q.text}</h2>
            {q.multi && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[12.5px] font-semibold text-amber-800 ring-1 ring-amber-200">
                <ListChecks size={14} /> Несколько правильных ответов — выберите все
              </div>
            )}
            <div className="mt-6 space-y-2.5" role={q.multi ? 'group' : 'radiogroup'} aria-label="Варианты ответа">
              {q.options.map((o, n) => {
                const active = (answers[q.id] ?? []).includes(o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={q.multi ? 'checkbox' : 'radio'}
                    aria-checked={active}
                    onClick={() => pick(o.id)}
                    className={cn(
                      'group flex w-full items-start gap-3.5 rounded-2xl border px-4 py-3.5 text-left text-[15px] leading-snug transition-all duration-200',
                      active
                        ? 'border-brand-400 bg-brand-50/70 text-ink shadow-[0_0_0_4px_rgba(179,22,43,.08)]'
                        : 'border-line bg-white text-ink-2 hover:-translate-y-px hover:border-brand-200 hover:shadow-card',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center text-[12.5px] font-bold transition-colors',
                        q.multi ? 'rounded-md' : 'rounded-lg',
                        active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-ink-3 group-hover:bg-brand-100 group-hover:text-brand-700',
                      )}
                    >
                      {active ? <Check size={15} strokeWidth={3} /> : LETTERS[n]}
                    </span>
                    <span className="pt-0.5">{o.text}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
            <Button variant="secondary" icon={<ArrowLeft size={16} />} disabled={i === 0} onClick={() => go(i - 1)}>
              <span className="hidden sm:inline">Назад</span>
            </Button>
            {isLast ? (
              <Button loading={submitting} icon={<Flag size={16} />} onClick={() => void submit()}>
                Завершить {exam ? 'экзамен' : 'тренировку'}
              </Button>
            ) : (
              <Button iconRight={<ArrowRight size={16} />} onClick={() => go(i + 1)}>
                Далее
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* navigator */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-bold">Навигация</h3>
            <span className="text-[12px] text-ink-3">
              {answered}/{total}
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
            {ticket.questions.map((x, n) => (
              <button
                key={x.id}
                onClick={() => go(n)}
                aria-label={`Вопрос ${n + 1}`}
                className={cn(
                  'aspect-square rounded-lg text-[12.5px] font-semibold transition-all duration-150',
                  n === i ? 'bg-ink text-white shadow ring-2 ring-ink ring-offset-2' : answers[x.id]?.length ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-gray-100 text-ink-3 hover:bg-gray-200',
                )}
              >
                {n + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded bg-brand-600" /> отвечен
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded bg-gray-200" /> без ответа
            </span>
          </div>
          <Button variant="soft" className="mt-5 w-full" loading={submitting} icon={<Flag size={15} />} onClick={() => void submit()}>
            Завершить
          </Button>
        </div>
      </aside>
    </div>
  )
}
