import { supabase } from '../lib/supabase'
import type { Attempt, AttemptQuestion, AttemptType, Ticket } from '../types'

export async function startAttempt(type: AttemptType): Promise<Ticket> {
  const { data, error } = await supabase.rpc('start_attempt', { p_type: type })
  if (error) throw error
  return data as Ticket
}

export async function finishAttempt(attemptId: string, answers: Record<string, number>): Promise<{ late: boolean }> {
  const { data, error } = await supabase.rpc('finish_attempt', { p_attempt: attemptId, p_answers: answers })
  if (error) throw error
  const r = (data ?? {}) as { late?: boolean }
  return { late: Boolean(r.late) }
}

export interface AttemptFilter {
  userId?: string
  type?: AttemptType | 'all'
  result?: 'all' | 'passed' | 'failed'
  sinceDays?: number
  page?: number
  pageSize?: number
}

/** RLS сам ограничит выборку: сотрудник увидит только свои попытки */
export async function listAttempts(f: AttemptFilter = {}): Promise<{ rows: Attempt[]; total: number }> {
  const size = f.pageSize ?? 25
  const page = f.page ?? 0
  let q = supabase
    .from('attempts')
    .select('id,user_id,type,total_questions,correct_answers,incorrect_answers,percentage,passed,started_at,completed_at,profiles(full_name,username)', {
      count: 'exact',
    })
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
  if (f.userId) q = q.eq('user_id', f.userId)
  if (f.type && f.type !== 'all') q = q.eq('type', f.type)
  if (f.result === 'passed') q = q.eq('type', 'exam').eq('passed', true)
  if (f.result === 'failed') q = q.eq('type', 'exam').eq('passed', false)
  if (f.sinceDays) q = q.gte('completed_at', new Date(Date.now() - f.sinceDays * 864e5).toISOString())
  const { data, error, count } = await q.range(page * size, page * size + size - 1)
  if (error) throw error
  return { rows: (data ?? []) as unknown as Attempt[], total: count ?? 0 }
}

export async function getAttempt(id: string): Promise<{ attempt: Attempt; questions: AttemptQuestion[] }> {
  const [a, q] = await Promise.all([
    supabase
      .from('attempts')
      .select('id,user_id,type,total_questions,correct_answers,incorrect_answers,percentage,passed,started_at,completed_at,profiles(full_name,username)')
      .eq('id', id)
      .single(),
    supabase
      .from('attempt_questions')
      .select('id,position,question_text,category,explanation,options,selected')
      .eq('attempt_id', id)
      .order('position'),
  ])
  if (a.error) throw a.error
  if (q.error) throw q.error
  if (!a.data) throw new Error('Попытка не найдена или недоступна')
  return { attempt: a.data as unknown as Attempt, questions: (q.data ?? []) as AttemptQuestion[] }
}

export async function deleteAttempt(id: string): Promise<void> {
  const { error } = await supabase.from('attempts').delete().eq('id', id)
  if (error) throw error
}
