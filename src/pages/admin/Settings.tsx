import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, BookOpen, Building2, Check, ChevronUp, ClipboardCheck, Pencil, Plus, Save, Tags, Timer, Trash2, X } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { getSettings, saveSettings } from '../../services/settings'
import { availableQuestions } from '../../services/questions'
import { humanError } from '../../lib/errors'
import PageHeader from '../../components/ui/PageHeader'
import { Button, IconButton } from '../../components/ui/Button'
import { Input, Toggle } from '../../components/ui/Field'
import { PageLoader } from '../../components/ui/Loader'
import { ErrorBox } from '../../components/ui/Empty'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../lib/cn'
import type { AppSettings } from '../../types'

function Section({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <section className="card grid gap-6 p-5 sm:p-7 lg:grid-cols-[260px_1fr]">
      <div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">{icon}</span>
        <h2 className="mt-3 text-[16px] font-bold">{title}</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{text}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export default function Settings() {
  useTitle('Настройки')
  const toast = useToast()
  const { refresh } = useSettings()
  const { data, loading, error, reload } = useAsync(async () => {
    const [s, avail] = await Promise.all([getSettings(), availableQuestions()])
    return { s, avail }
  }, [])
  const [f, setF] = useState<AppSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [editing, setEditing] = useState<{ i: number; v: string } | null>(null)

  useEffect(() => {
    if (data) setF(data.s)
  }, [data])

  if (loading && !data) return <PageLoader />
  if (error) return <ErrorBox text={error} onRetry={() => void reload()} />
  if (!f || !data) return null

  const dirty = JSON.stringify(f) !== JSON.stringify(data.s)
  const avail = data.avail
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setF({ ...f, [k]: v })
  const num = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Number.parseInt(v.replace(/\D/g, '') || '0', 10)))

  const addCat = () => {
    const c = newCat.trim().replace(/\|/g, '/')
    if (!c) return
    if (f.categories.some((x) => x.toLowerCase() === c.toLowerCase())) {
      toast.error('Такая категория уже есть')
      return
    }
    set('categories', [...f.categories, c])
    setNewCat('')
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= f.categories.length) return
    const arr = [...f.categories]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    set('categories', arr)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f.training_count < 1 || f.exam_count < 1) return toast.error('Количество вопросов должно быть больше нуля')
    if (f.pass_percent < 1 || f.pass_percent > 100) return toast.error('Проходной процент — от 1 до 100')
    if (!f.categories.length) return toast.error('Добавьте хотя бы одну категорию')
    setBusy(true)
    try {
      await saveSettings(f)
      await refresh()
      await reload()
      toast.success('Настройки сохранены')
    } catch (err) {
      toast.error(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="pb-24">
      <PageHeader eyebrow="Конфигурация" title="Настройки" description="Параметры хранятся в Supabase и сразу применяются к новым тренировкам и экзаменам." />

      <div className="space-y-5">
        <Section icon={<Building2 size={19} />} title="Организация" text="Название отображается в кабинетах сотрудников и администратора.">
          <Input label="Название организации" value={f.org_name} onChange={(e) => set('org_name', e.target.value)} maxLength={160} placeholder="Например, ПСЧ-12" />
        </Section>

        <Section icon={<ClipboardCheck size={19} />} title="Экзамен" text="Количество вопросов, проходной балл и ограничение по времени. Таймер контролируется на сервере.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Вопросов в экзамене"
              inputMode="numeric"
              value={String(f.exam_count)}
              onChange={(e) => set('exam_count', num(e.target.value, 1, 200))}
              error={f.exam_count > avail ? `В базе доступно только ${avail}` : null}
              hint={`Доступно в базе: ${avail}`}
            />
            <Input
              label="Время на экзамен, мин"
              inputMode="numeric"
              value={String(f.exam_minutes)}
              onChange={(e) => set('exam_minutes', num(e.target.value, 0, 600))}
              hint="0 — без ограничения времени"
              left={<Timer size={16} />}
            />
            <div className="sm:col-span-2">
              <div className="label flex items-center justify-between">
                Проходной процент
                <span className="font-display text-[20px] font-extrabold text-brand-700">{f.pass_percent}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={f.pass_percent}
                onChange={(e) => set('pass_percent', Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-brand-600"
                style={{ background: `linear-gradient(to right, #B3162B ${((f.pass_percent - 50) / 50) * 100}%, #E5E7EB 0)` }}
              />
              <div className="mt-1 flex justify-between text-[11.5px] text-ink-4">
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <p className="mt-2 text-[12.5px] text-ink-3">
                Для сдачи нужно ответить верно минимум на {Math.ceil((f.exam_count * f.pass_percent) / 100)} из {f.exam_count} вопросов.
              </p>
            </div>
          </div>
        </Section>

        <Section icon={<BookOpen size={19} />} title="Обучение" text="Тренировочный режим: случайный билет без ограничения по времени.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Вопросов в тренировке"
              inputMode="numeric"
              value={String(f.training_count)}
              onChange={(e) => set('training_count', num(e.target.value, 1, 200))}
              error={f.training_count > avail ? `В базе доступно только ${avail}` : null}
              hint={`Доступно в базе: ${avail}`}
            />
          </div>
          <div className="mt-5 rounded-2xl border border-line p-4">
            <Toggle checked={f.show_explanations} onChange={(v) => set('show_explanations', v)} label="Показывать пояснения" description="Сотрудники видят пояснение к правильному ответу при разборе попытки." />
          </div>
        </Section>

        <Section icon={<Tags size={19} />} title="Категории вопросов" text="Используются при создании вопросов и в аналитике по темам. Переименование не меняет уже созданные вопросы.">
          <ul className="space-y-2">
            {f.categories.map((c, i) => (
              <li key={`${c}-${i}`} className="group flex items-center gap-2 rounded-xl border border-line bg-white py-1.5 pl-2 pr-1.5">
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(i, -1)} className="text-ink-4 hover:text-ink disabled:opacity-30" disabled={i === 0} aria-label="Выше">
                    <ChevronUp size={15} />
                  </button>
                </div>
                {editing?.i === i ? (
                  <>
                    <input
                      className="input h-9 flex-1 py-1"
                      autoFocus
                      value={editing.v}
                      onChange={(e) => setEditing({ i, v: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (editing.v.trim()) set('categories', f.categories.map((x, k) => (k === i ? editing.v.trim().replace(/\|/g, '/') : x)))
                          setEditing(null)
                        }
                        if (e.key === 'Escape') setEditing(null)
                      }}
                    />
                    <IconButton
                      label="Применить"
                      onClick={() => {
                        if (editing.v.trim()) set('categories', f.categories.map((x, k) => (k === i ? editing.v.trim().replace(/\|/g, '/') : x)))
                        setEditing(null)
                      }}
                    >
                      <Check size={16} />
                    </IconButton>
                    <IconButton label="Отмена" onClick={() => setEditing(null)}>
                      <X size={16} />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[14px] text-ink">{c}</span>
                    <IconButton label="Переименовать" onClick={() => setEditing({ i, v: c })}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton label="Удалить" tone="danger" onClick={() => set('categories', f.categories.filter((_, k) => k !== i))}>
                      <Trash2 size={15} />
                    </IconButton>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              className="input"
              placeholder="Новая категория"
              value={newCat}
              maxLength={120}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCat()
                }
              }}
            />
            <Button variant="secondary" icon={<Plus size={16} />} onClick={addCat}>
              Добавить
            </Button>
          </div>
        </Section>
      </div>

      {/* sticky save bar */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/90 backdrop-blur-xl transition-transform duration-300 lg:left-[272px]',
          dirty ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-10">
          <span className="hidden items-center gap-2 text-[13.5px] text-ink-2 sm:flex">
            <AlertTriangle size={16} className="text-amber-500" /> Есть несохранённые изменения
          </span>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setF(data.s)}>
              Отменить
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" loading={busy} icon={<Save size={16} />}>
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
