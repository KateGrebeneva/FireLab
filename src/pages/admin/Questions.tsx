import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Check, ChevronDown, FileQuestion, Lightbulb, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { deleteQuestion, listQuestions, saveQuestion } from '../../services/questions'
import { humanError } from '../../lib/errors'
import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import { Button, IconButton } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Loader'
import Empty, { ErrorBox } from '../../components/ui/Empty'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { cn } from '../../lib/cn'
import { fmtDate } from '../../utils/format'
import type { Question } from '../../types'

const LETTERS = 'ABCDEFGHIJ'
const STEP = 30

export default function Questions() {
  useTitle('Вопросы')
  const { settings } = useSettings()
  const toast = useToast()
  const confirm = useConfirm()
  const { data, loading, error, reload } = useAsync(listQuestions, [])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [limit, setLimit] = useState(STEP)
  const [openId, setOpenId] = useState<string | null>(null)
  const [edit, setEdit] = useState<Question | null>(null)
  const [modal, setModal] = useState(false)

  const list = useMemo(() => data ?? [], [data])
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    list.forEach((x) => m.set(x.category, (m.get(x.category) ?? 0) + 1))
    return m
  }, [list])
  const categories = useMemo(() => [...new Set([...settings.categories, ...counts.keys()])], [settings.categories, counts])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter((x) => (!cat || x.category === cat) && (!s || x.question_text.toLowerCase().includes(s) || x.answers.some((a) => a.answer_text.toLowerCase().includes(s))))
  }, [list, q, cat])

  useEffect(() => setLimit(STEP), [q, cat])

  const broken = list.filter((x) => x.answers.filter((a) => a.is_correct).length < 1 || x.answers.length < 2).length

  const remove = async (x: Question) => {
    const ok = await confirm({
      title: 'Удалить вопрос?',
      text: 'Вопрос исчезнет из банка и не будет попадать в новые билеты. Уже пройденные попытки сохранят его текст без изменений.',
      confirmText: 'Удалить',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteQuestion(x.id)
      toast.success('Вопрос удалён')
      void reload()
    } catch (e) {
      toast.error(humanError(e))
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Банк вопросов"
        title="Вопросы"
        description={`${list.length} вопросов · тренировка: ${settings.training_count}, экзамен: ${settings.exam_count} случайных вопросов`}
        actions={
          <Button
            icon={<Plus size={17} />}
            onClick={() => {
              setEdit(null)
              setModal(true)
            }}
          >
            Добавить вопрос
          </Button>
        }
      />

      {list.length > 0 && list.length < settings.exam_count && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-900">
          <AlertTriangle size={19} className="shrink-0 text-amber-600" />В базе {list.length} вопросов — для экзамена нужно минимум {settings.exam_count}.
        </div>
      )}
      {broken > 0 && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-900">
          <AlertTriangle size={19} className="shrink-0 text-amber-600" />
          {broken} вопрос(ов) без правильного ответа или с одним вариантом — они не попадают в билеты. Отредактируйте их.
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input className="lg:max-w-md lg:flex-1" placeholder="Поиск по тексту вопроса или ответа…" value={q} onChange={(e) => setQ(e.target.value)} left={<Search size={17} />} />
        <select className="input lg:w-80" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Категория">
          <option value="">Все категории ({list.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c} ({counts.get(c) ?? 0})
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorBox text={error} onRetry={() => void reload()} />}

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <Empty
            icon={<FileQuestion size={22} />}
            title={list.length ? 'Ничего не найдено' : 'Банк вопросов пуст'}
            text={list.length ? 'Попробуйте изменить запрос.' : 'Добавьте вопросы: для тренировки нужно минимум 15, для экзамена — 25.'}
            action={
              !list.length && (
                <Button icon={<Plus size={16} />} onClick={() => setModal(true)}>
                  Добавить вопрос
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.slice(0, limit).map((x) => {
            const open = openId === x.id
            const nRight = x.answers.filter((a) => a.is_correct).length
            const ok = nRight >= 1 && x.answers.length >= 2
            return (
              <div key={x.id} className={cn('card overflow-hidden transition-shadow duration-200', open && 'shadow-lift')}>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pt-1.5">
                      <span className="inline-block max-w-full truncate rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100" title={x.category}>
                        {x.category}
                      </span>
                      <span className="text-[12px] text-ink-4">{x.answers.length} вар.</span>
                      {nRight > 1 && <Badge tone="blue">{nRight} правильных</Badge>}
                      {!ok && <Badge tone="amber">нет правильного ответа</Badge>}
                    </div>
                    <div className="-mr-2 -mt-0.5 flex shrink-0 items-center">
                      <IconButton
                        label="Редактировать"
                        onClick={() => {
                          setEdit(x)
                          setModal(true)
                        }}
                      >
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton label="Удалить" tone="danger" onClick={() => void remove(x)}>
                        <Trash2 size={16} />
                      </IconButton>
                      <IconButton label={open ? 'Свернуть' : 'Развернуть'} onClick={() => setOpenId(open ? null : x.id)}>
                        <ChevronDown size={17} className={cn('transition-transform duration-200', open && 'rotate-180')} />
                      </IconButton>
                    </div>
                  </div>
                  <button className="mt-2 block w-full text-left text-[15px] font-semibold leading-snug text-ink" onClick={() => setOpenId(open ? null : x.id)} aria-expanded={open}>
                    {x.question_text}
                  </button>
                </div>
                {open && (
                  <div className="animate-fade-in border-t border-line bg-gray-50/40 px-4 py-4 sm:px-5">
                    <ul className="space-y-1.5">
                      {x.answers.map((a, n) => (
                        <li key={a.id ?? n} className={cn('flex items-start gap-2.5 rounded-xl px-3 py-2 text-[14px]', a.is_correct ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100' : 'text-ink-2')}>
                          <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11.5px] font-bold', a.is_correct ? 'bg-emerald-600 text-white' : 'bg-white text-ink-4 ring-1 ring-line')}>
                            {a.is_correct ? <Check size={13} strokeWidth={3} /> : LETTERS[n]}
                          </span>
                          {a.answer_text}
                        </li>
                      ))}
                    </ul>
                    {x.explanation && (
                      <div className="mt-3 flex gap-2.5 rounded-xl bg-amber-50/70 px-3.5 py-2.5 text-[13.5px] text-amber-950 ring-1 ring-amber-100">
                        <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-600" />
                        {x.explanation}
                      </div>
                    )}
                    <div className="mt-3 text-[12px] text-ink-4">Изменён {fmtDate(x.updated_at)}</div>
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length > limit && (
            <div className="pt-3 text-center">
              <Button variant="secondary" onClick={() => setLimit(limit + STEP)}>
                Показать ещё ({filtered.length - limit})
              </Button>
            </div>
          )}
        </div>
      )}

      <QuestionModal
        open={modal}
        question={edit}
        categories={categories}
        onClose={() => setModal(false)}
        onSaved={() => {
          setModal(false)
          void reload()
        }}
      />
    </div>
  )
}

interface Form {
  category: string
  text: string
  explanation: string
  options: string[]
  correct: number[]
}

function QuestionModal({ open, question, categories, onClose, onSaved }: { open: boolean; question: Question | null; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState<Form>({ category: '', text: '', explanation: '', options: ['', '', '', ''], correct: [0] })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErr('')
    if (question) {
      const opts = question.answers.map((a) => a.answer_text)
      while (opts.length < 2) opts.push('')
      setF({
        category: question.category,
        text: question.question_text,
        explanation: question.explanation ?? '',
        options: opts,
        correct: question.answers.map((a, k) => (a.is_correct ? k : -1)).filter((k) => k >= 0),
      })
    } else {
      setF({ category: categories[0] ?? '', text: '', explanation: '', options: ['', '', '', ''], correct: [0] })
    }
  }, [open, question, categories])

  const setOpt = (n: number, v: string) => setF({ ...f, options: f.options.map((x, k) => (k === n ? v : x)) })
  const removeOpt = (n: number) => {
    if (f.options.length <= 2) return
    const options = f.options.filter((_, k) => k !== n)
    const correct = f.correct.filter((k) => k !== n).map((k) => (k > n ? k - 1 : k))
    setF({ ...f, options, correct })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const filled = f.options.map((t, k) => ({ t: t.trim(), k })).filter((x) => x.t)
    if (!f.category.trim()) return setErr('Выберите категорию')
    if (f.text.trim().length < 5) return setErr('Введите текст вопроса')
    if (filled.length < 2) return setErr('Нужно минимум два варианта ответа')
    if (!filled.some((x) => f.correct.includes(x.k))) return setErr('Отметьте хотя бы один правильный ответ среди заполненных вариантов')
    if (new Set(filled.map((x) => x.t.toLowerCase())).size !== filled.length) return setErr('Варианты ответа не должны повторяться')
    setErr('')
    setBusy(true)
    try {
      await saveQuestion({
        id: question?.id ?? null,
        category: f.category,
        question_text: f.text,
        explanation: f.explanation,
        answers: filled.map((x) => ({ text: x.t, is_correct: f.correct.includes(x.k) })),
      })
      toast.success(question ? 'Вопрос сохранён' : 'Вопрос добавлен')
      onSaved()
    } catch (e2) {
      setErr(humanError(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={question ? 'Редактирование вопроса' : 'Новый вопрос'}
      description="Отметьте правильные варианты — один или несколько. Изменения не затронут уже пройденные попытки."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="q-form" loading={busy}>
            {question ? 'Сохранить' : 'Добавить вопрос'}
          </Button>
        </>
      }
    >
      <form id="q-form" onSubmit={(e) => void submit(e)} className="space-y-5" noValidate>
        <Select label="Категория" name="category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {[...new Set([...categories, f.category].filter(Boolean))].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Textarea label="Вопрос" name="text" rows={3} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="Например: Какие действия необходимо выполнить при обнаружении признаков пожара?" maxLength={2000} />

        <div>
          <div className="label">Варианты ответа</div>
          <div className="space-y-2">
            {f.options.map((o, n) => {
              const right = f.correct.includes(n)
              return (
                <div key={n} className={cn('flex items-center gap-2 rounded-2xl border p-1.5 pl-2 transition', right ? 'border-emerald-300 bg-emerald-50/60' : 'border-line bg-white')}>
                  <button
                    type="button"
                    onClick={() => setF({ ...f, correct: right ? f.correct.filter((k) => k !== n) : [...f.correct, n].sort((x, y) => x - y) })}
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-bold transition',
                      right ? 'bg-emerald-600 text-white shadow' : 'bg-gray-100 text-ink-3 hover:bg-emerald-100 hover:text-emerald-700',
                    )}
                    title="Отметить как правильный"
                    aria-pressed={right}
                  >
                    {right ? <Check size={16} strokeWidth={3} /> : LETTERS[n]}
                  </button>
                  <input
                    className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[14.5px] outline-none placeholder:text-ink-4"
                    placeholder={`Вариант ${LETTERS[n]}`}
                    value={o}
                    maxLength={1000}
                    onChange={(e) => setOpt(n, e.target.value)}
                  />
                  {f.options.length > 2 && (
                    <IconButton label="Удалить вариант" tone="danger" onClick={() => removeOpt(n)}>
                      <X size={16} />
                    </IconButton>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex items-center justify-between">
            {f.options.length < 8 ? (
              <button type="button" onClick={() => setF({ ...f, options: [...f.options, ''] })} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline">
                <Plus size={15} /> Добавить вариант
              </button>
            ) : (
              <span />
            )}
            <span className="text-[12px] text-ink-4">Нажмите на букву, чтобы отметить правильный ответ (можно несколько)</span>
          </div>
        </div>

        <Textarea
          label="Пояснение к правильному ответу"
          name="explanation"
          rows={3}
          value={f.explanation}
          onChange={(e) => setF({ ...f, explanation: e.target.value })}
          placeholder="Например: ссылка на пункт правил или краткое объяснение"
          hint="Показывается сотруднику при разборе ошибок"
          maxLength={3000}
        />
        {err && <div className="rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-[13.5px] font-medium text-brand-800">{err}</div>}
      </form>
    </Modal>
  )
}
