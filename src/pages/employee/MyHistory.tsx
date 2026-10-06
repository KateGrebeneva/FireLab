import { useState } from 'react'
import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import { useAsync } from '../../hooks/useAsync'
import { useTitle } from '../../hooks/useTitle'
import { useSettings } from '../../hooks/useSettings'
import { listAttempts } from '../../services/attempts'
import PageHeader from '../../components/ui/PageHeader'
import Segmented from '../../components/ui/Segmented'
import AttemptsTable from '../../components/AttemptsTable'
import Empty, { ErrorBox } from '../../components/ui/Empty'
import { Skeleton } from '../../components/ui/Loader'
import { ButtonLink, IconButton } from '../../components/ui/Button'
import type { AttemptType } from '../../types'

const SIZE = 20

export default function MyHistory() {
  useTitle('Мои результаты')
  const { settings } = useSettings()
  const [type, setType] = useState<AttemptType | 'all'>('all')
  const [page, setPage] = useState(0)
  const { data, loading, error, reload } = useAsync(() => listAttempts({ type, page, pageSize: SIZE }), [type, page])
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / SIZE))

  return (
    <div>
      <PageHeader
        eyebrow="История"
        title="Мои результаты"
        description="Все ваши попытки сохраняются без изменений — с вопросами и ответами на момент прохождения."
        actions={
          <Segmented
            value={type}
            onChange={(v) => {
              setType(v)
              setPage(0)
            }}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'training', label: 'Обучение' },
              { value: 'exam', label: 'Экзамены' },
            ]}
          />
        }
      />
      {error && <ErrorBox text={error} onRetry={() => void reload()} />}
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.rows.length ? (
          <>
            <AttemptsTable rows={data.rows} base="/employee/history" pass={settings.pass_percent} />
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] text-ink-3">
                <span>
                  Страница {page + 1} из {pages} · всего {data.total}
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
            )}
          </>
        ) : (
          <Empty
            icon={<History size={22} />}
            title="Здесь пока пусто"
            text="Пройдите тренировку или экзамен — результаты появятся в этом разделе."
            action={<ButtonLink to="/employee/training">Начать тренировку</ButtonLink>}
          />
        )}
      </div>
    </div>
  )
}
