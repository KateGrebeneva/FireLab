import { supabase } from '../lib/supabase'
import type { Question } from '../types'

const PAGE = 1000

/** Загружает весь банк вопросов постранично (обходит лимит max_rows) */
export async function listQuestions(): Promise<Question[]> {
  const all: Question[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('questions')
      .select('id,category,question_text,explanation,created_at,updated_at,answers(id,answer_text,is_correct)')
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as Question[]
    all.push(...rows)
    if (rows.length < PAGE) break
  }
  return all
}

export interface QuestionInput {
  id: string | null
  category: string
  question_text: string
  explanation: string
  answers: { text: string; is_correct: boolean }[]
}

export async function saveQuestion(q: QuestionInput): Promise<string> {
  const { data, error } = await supabase.rpc('save_question', {
    p_id: q.id,
    p_category: q.category,
    p_text: q.question_text,
    p_explanation: q.explanation,
    p_answers: q.answers,
  })
  if (error) throw error
  return data as string
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw error
}

export async function availableQuestions(): Promise<number> {
  const { data, error } = await supabase.rpc('available_questions')
  if (error) throw error
  return Number(data ?? 0)
}
