import { Link } from 'react-router-dom'
import { ChevronRight, ClipboardCheck, GraduationCap } from 'lucide-react'
import type { Attempt } from '../types'
import { fmtDateTime, typeLabel } from '../utils/format'
import { Badge } from './ui/Badge'
import { Avatar } from './ui/Avatar'
import { cn } from '../lib/cn'

export function ResultBadge({ a }: { a: Pick<Attempt, 'type' | 'passed'> }) {
  if (a.type !== 'exam') return <Badge tone="blue">Завершено</Badge>
  return a.passed ? (
    <Badge tone="green" dot>
      Сдан
    </Badge>
  ) : (
    <Badge tone="brand" dot>
      Не сдан
    </Badge>
  )
}

export function TypeChip({ type }: { type: Attempt['type'] }) {
  const Icon = type === 'exam' ? ClipboardCheck : GraduationCap
  return (
    <span className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2">
      <span className={cn('grid h-7 w-7 place-items-center rounded-lg', type === 'exam' ? 'bg-ink text-white' : 'bg-brand-50 text-brand-600')}>
        <Icon size={14} />
      </span>
      {typeLabel(type)}
    </span>
  )
}

export function PctBar({ pct, pass = 80 }: { pct: number; pass?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full', pct >= pass ? 'bg-emerald-500' : pct >= pass - 20 ? 'bg-amber-400' : 'bg-brand-500')} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right font-semibold tabular-nums text-ink">{pct}%</span>
    </div>
  )
}

export default function AttemptsTable({ rows, base, showUser = false, pass = 80 }: { rows: Attempt[]; base: string; showUser?: boolean; pass?: number }) {
  return (
    <>
      {/* desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head">
              {showUser && <th className="px-5 py-3">Сотрудник</th>}
              <th className="px-5 py-3">Дата</th>
              <th className="px-5 py-3">Тип</th>
              <th className="px-5 py-3">Результат</th>
              <th className="px-5 py-3">Верно</th>
              <th className="px-5 py-3">Процент</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="table-row group">
                {showUser && (
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.profiles?.full_name ?? '?'} size="sm" />
                      <span className="font-medium text-ink">{a.profiles?.full_name ?? 'Удалённый сотрудник'}</span>
                    </div>
                  </td>
                )}
                <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">{fmtDateTime(a.completed_at)}</td>
                <td className="px-5 py-3.5">
                  <TypeChip type={a.type} />
                </td>
                <td className="px-5 py-3.5">
                  <ResultBadge a={a} />
                </td>
                <td className="px-5 py-3.5 tabular-nums text-ink-2">
                  {a.correct_answers} / {a.total_questions}
                </td>
                <td className="px-5 py-3.5">
                  <PctBar pct={a.percentage ?? 0} pass={pass} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link to={`${base}/${a.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-50">
                    Разбор <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((a) => (
          <li key={a.id}>
            <Link to={`${base}/${a.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-brand-50/50">
              <div className="min-w-0 flex-1">
                {showUser && <div className="truncate text-[14px] font-semibold text-ink">{a.profiles?.full_name ?? 'Удалённый сотрудник'}</div>}
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                  <span className="font-medium text-ink-2">{typeLabel(a.type)}</span>
                  <ResultBadge a={a} />
                </div>
                <div className="mt-0.5 text-[12px] text-ink-4">{fmtDateTime(a.completed_at)}</div>
              </div>
              <div className="text-right">
                <div className={cn('font-display text-xl font-extrabold', (a.percentage ?? 0) >= pass ? 'text-emerald-600' : 'text-brand-700')}>{a.percentage}%</div>
                <div className="text-[11.5px] text-ink-4">
                  {a.correct_answers}/{a.total_questions}
                </div>
              </div>
              <ChevronRight size={16} className="text-ink-4" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
