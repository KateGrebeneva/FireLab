import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList, Search } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { listAttempts } from '../../services/attempts'
import { listEmployees } from '../../services/employees'
import PageHeader from '../../components/ui/PageHeader'
import Segmented from '../../components/ui/Segmented'
import AttemptsTable from '../../components/AttemptsTable'
import Empty, { ErrorBox } from '../../components/ui/Empty'
import { Skeleton } from '../../components/ui/Loader'
import { IconButton } from '../../components/ui/Button'
import type { AttemptType } from '../../types'

const SIZE = 25

export default function Results() {
  useTitle('Результаты')
  const { settings } = useSettings()
  const [type, setType] = useState<AttemptType | 'all'>('all')
  const [result, setResult] = useState<'all' | 'passed' | 'failed'>('all')
  const [period, setPeriod] = useState(0)
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const emps = useAsync(listEmployees, [])
  const { data, loading, error, reload } = useAsync(
    () => listAttempts({ type, result, sinceDays: period || undefined, userId: userId || undefined, page, pageSize: SIZE }),
    [type, result, period, userId, page],
  )
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / SIZE))

  const empOptions = useMemo(() => {
    const s = search.trim().toLowerCase()
    return (emps.data ?? []).filter((e) => !s || e.full_name.toLowerCase().includes(s) || e.username.toLowerCase().includes(s))
  }, [emps.data, search])


  return (
    <div>
      <PageHeader eyebrow="Журнал" title="Результаты" description="Все завершённые попытки сотрудников. Записи неизменяемы и содержат снимок вопросов на момент прохождения." />

      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
          <input className="input pl-10" placeholder="Найти сотрудника…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" value={userId} onChange={(e) => {
            setUserId(e.target.value)
            setPage(0)
          }} aria-label="Сотрудник">
          <option value="">Все сотрудники</option>
          {empOptions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name} (@{e.username})
            </option>
          ))}
        </select>
        <Segmented
          value={type}
          onChange={(v) => {
            setType(v)
            setPage(0)
          }}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'training', label: 'Обучение' },
            { value: 'exam', label: 'Экзамен' },
          ]}
        />
        <Segmented
          value={period}
          onChange={(v) => {
            setPeriod(v)
            setPage(0)
          }}
          options={[
            { value: 7, label: '7 дн' },
            { value: 30, label: '30 дн' },
            { value: 0, label: 'Всё время' },
          ]}
        />
        {type !== 'training' && (
          <Segmented
            className="md:col-span-2 xl:col-span-4 xl:justify-self-start"
            value={result}
            onChange={(v) => {
            setResult(v)
            setPage(0)
          }}
            options={[
              { value: 'all', label: 'Любой результат' },
              { value: 'passed', label: 'Сдан' },
              { value: 'failed', label: 'Не сдан' },
            ]}
          />
        )}
      </div>

      {error && <ErrorBox text={error} onRetry={() => void reload()} />}

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.rows.length ? (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <AttemptsTable rows={data.rows} base="/admin/results" showUser pass={settings.pass_percent} />
            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] text-ink-3">
              <span>
                Найдено: {data.total} · стр. {page + 1} из {pages}
              </span>
              <div className="flex gap-1">
                <IconButton label="Назад" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={17} />
                </IconButton>
                <IconButton label="Вперёд" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight size={17} />
                </IconButton>
              </div>
            </div>
          </div>
        ) : (
          <Empty icon={<ClipboardList size={22} />} title="Попыток не найдено" text="Измените фильтры или дождитесь, пока сотрудники пройдут тесты." />
        )}
      </div>
    </div>
  )
}
