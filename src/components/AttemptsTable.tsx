import { Link } from 'react-router-dom'
import { ChevronRight, ClipboardCheck, GraduationCap, Trash2 } from 'lucide-react'
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

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-gray-300 accent-brand-600"
    />
  )
}

export interface AttemptsTableProps {
  rows: Attempt[]
  base: string
  showUser?: boolean
  pass?: number
  /** выбор строк для массового удаления (только администратор) */
  selected?: Set<string>
  onToggle?: (id: string) => void
  onToggleAll?: (ids: string[], on: boolean) => void
  onDelete?: (a: Attempt) => void
}

export default function AttemptsTable({ rows, base, showUser = false, pass = 80, selected, onToggle, onToggleAll, onDelete }: AttemptsTableProps) {
  const selectable = Boolean(selected && onToggle)
  const allOn = selectable && rows.length > 0 && rows.every((r) => selected!.has(r.id))
  return (
    <>
      {/* desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head">
              {selectable && (
                <th className="w-10 py-3 pl-5">
                  <Check checked={allOn} label="Выбрать все на странице" onChange={() => onToggleAll?.(rows.map((r) => r.id), !allOn)} />
                </th>
              )}
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
              <tr key={a.id} className={cn('table-row group', selected?.has(a.id) && 'bg-brand-50/50')}>
                {selectable && (
                  <td className="py-3.5 pl-5">
                    <Check checked={selected!.has(a.id)} label="Выбрать" onChange={() => onToggle!(a.id)} />
                  </td>
                )}
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
                <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-ink-2">
                  {a.correct_answers} / {a.total_questions}
                </td>
                <td className="px-5 py-3.5">
                  <PctBar pct={a.percentage ?? 0} pass={pass} />
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                  {onDelete && (
                    <button
                      onClick={() => onDelete(a)}
                      className="mr-1 inline-grid h-8 w-8 place-items-center rounded-lg text-ink-4 opacity-60 transition hover:bg-brand-50 hover:text-brand-700 group-hover:opacity-100"
                      aria-label="Удалить результат"
                      title="Удалить результат"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
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
          <li key={a.id} className={cn('flex items-center', selected?.has(a.id) && 'bg-brand-50/50')}>
            {selectable && (
              <span className="pl-4">
                <Check checked={selected!.has(a.id)} label="Выбрать" onChange={() => onToggle!(a.id)} />
              </span>
            )}
            <Link to={`${base}/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 active:bg-brand-50/50">
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
            {onDelete && (
              <button onClick={() => onDelete(a)} className="mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-4 active:bg-brand-50" aria-label="Удалить результат">
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
