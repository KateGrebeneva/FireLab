import { supabase } from '../lib/supabase'
import type { AppSettings } from '../types'

export const DEFAULT_SETTINGS: AppSettings = {
  org_name: 'Пожарная часть',
  pass_percent: 80,
  training_count: 15,
  exam_count: 25,
  exam_minutes: 30,
  show_explanations: true,
  categories: [
    'Пожарная безопасность',
    'Первичные средства пожаротушения',
    'Действия при пожаре',
    'Эвакуация',
    'Пожарная профилактика',
    'Нормативные требования',
  ],
}

const toInt = (v: string | undefined, d: number) => {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) ? n : d
}

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('settings').select('key,value')
  if (error) throw error
  const m = new Map(((data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]))
  const cats = (m.get('categories') ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    org_name: m.get('org_name') ?? DEFAULT_SETTINGS.org_name,
    pass_percent: toInt(m.get('pass_percent'), DEFAULT_SETTINGS.pass_percent),
    training_count: toInt(m.get('training_count'), DEFAULT_SETTINGS.training_count),
    exam_count: toInt(m.get('exam_count'), DEFAULT_SETTINGS.exam_count),
    exam_minutes: toInt(m.get('exam_minutes'), DEFAULT_SETTINGS.exam_minutes),
    show_explanations: (m.get('show_explanations') ?? 'true') !== 'false',
    categories: cats.length ? cats : DEFAULT_SETTINGS.categories,
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  const rows = [
    { key: 'org_name', value: s.org_name.trim().slice(0, 160) || DEFAULT_SETTINGS.org_name },
    { key: 'pass_percent', value: String(s.pass_percent) },
    { key: 'training_count', value: String(s.training_count) },
    { key: 'exam_count', value: String(s.exam_count) },
    { key: 'exam_minutes', value: String(s.exam_minutes) },
    { key: 'show_explanations', value: String(s.show_explanations) },
    { key: 'categories', value: s.categories.map((c) => c.replace(/\|/g, '/').trim()).filter(Boolean).join('|') },
  ]
  const { error } = await supabase.from('settings').upsert(rows)
  if (error) throw error
}
