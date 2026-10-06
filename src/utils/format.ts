import type { AttemptType } from '../types'

export const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0)

export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—')

export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export const fmtShortDay = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')

export const fmtRelative = (d: string | null | undefined) => {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'только что'
  if (min < 60) return `${min} мин назад`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} ч назад`
  const days = Math.round(h / 24)
  if (days < 7) return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`
  return fmtDate(d)
}

export const fmtDuration = (fromIso: string, toIso: string | null) => {
  if (!toIso) return '—'
  const s = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export const fmtTimer = (sec: number) => {
  const s = Math.max(0, sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const attemptLabel = (type: AttemptType | string, passed: boolean | null) =>
  type === 'exam' ? (passed ? 'Сдан' : 'Не сдан') : 'Завершено'

export const typeLabel = (type: AttemptType | string) => (type === 'exam' ? 'Экзамен' : 'Обучение')

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const pctTone = (pct: number, pass = 80) => (pct >= pass ? 'good' : pct >= pass - 20 ? 'mid' : 'bad')

/** ФИО → фамилия / имя / отчество */
export interface Fio {
  last: string
  first: string
  middle: string
}

export function splitFio(full: string | null | undefined): Fio {
  const w = (full ?? '').trim().split(/\s+/).filter(Boolean)
  return { last: w[0] ?? '', first: w[1] ?? '', middle: w.slice(2).join(' ') }
}

export const joinFio = (f: Fio) => [f.last, f.first, f.middle].map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' ')

/** Похоже ли значение на полноценное ФИО (минимум фамилия и имя) */
export const looksLikeFio = (full: string | null | undefined) => (full ?? '').trim().split(/\s+/).filter(Boolean).length >= 2 && !/^начальник\s/i.test((full ?? '').trim())

/** Обращение в приветствии: «Имя Отчество», иначе «Имя», иначе логин */
export function greetName(p: { full_name: string; username: string } | null | undefined): string {
  if (!p) return ''
  if (!looksLikeFio(p.full_name)) return p.username
  const f = splitFio(p.full_name)
  return [f.first, f.middle].filter(Boolean).join(' ') || p.username
}

/** Короткая форма: «Иванов И. И.» */
export function shortFio(full: string): string {
  const f = splitFio(full)
  if (!f.first) return f.last
  return `${f.last} ${f.first[0]}.${f.middle ? ` ${f.middle[0]}.` : ''}`
}
