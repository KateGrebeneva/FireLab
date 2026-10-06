export type Role = 'admin' | 'employee'
export type AttemptType = 'training' | 'exam'

export interface Profile {
  id: string
  role: Role
  username: string
  full_name: string
  department: string | null
  position: string | null
  is_active: boolean
  created_at?: string
}

export interface Attempt {
  id: string
  user_id: string
  type: AttemptType
  total_questions: number
  correct_answers: number | null
  incorrect_answers: number | null
  percentage: number | null
  passed: boolean | null
  started_at: string
  completed_at: string | null
  deadline?: string | null
  profiles?: { full_name: string; username?: string } | null
}

export interface Opt {
  id: number
  text: string
  is_correct?: boolean
}

/** Snapshot вопроса внутри попытки — не меняется при редактировании банка */
export interface AttemptQuestion {
  id: string
  position: number
  question_text: string
  category: string | null
  explanation: string | null
  options: Opt[]
  selected: number | null
  /** выбранные варианты (для вопросов с несколькими правильными ответами) */
  selected_ids: number[] | null
}

export interface TicketQuestion {
  id: string
  category: string | null
  text: string
  /** несколько правильных ответов */
  multi?: boolean
  options: { id: number; text: string }[]
}

export interface Ticket {
  attempt_id: string
  type: AttemptType
  minutes: number
  deadline: string | null
  questions: TicketQuestion[]
}

export interface AnswerRow {
  id?: string
  answer_text: string
  is_correct: boolean
}

export interface Question {
  id: string
  category: string
  question_text: string
  explanation: string | null
  created_at: string
  updated_at: string
  answers: AnswerRow[]
}

export interface AppSettings {
  org_name: string
  pass_percent: number
  training_count: number
  exam_count: number
  exam_minutes: number
  show_explanations: boolean
  categories: string[]
}

export interface Overview {
  employees: number
  active_employees: number
  questions: number
  attempts: number
  attempts_period: number
  avg_pct: number
  exams: number
  exams_passed: number
  pass_rate: number
}

export interface DailyRow {
  day: string
  attempts: number
  avg_pct: number
  exams: number
  passed: number
}

export interface CategoryRow {
  category: string
  total: number
  wrong: number
}

export interface HardQuestion {
  question_id: string | null
  question_text: string
  category: string | null
  total: number
  wrong: number
}

export interface EmployeeStat {
  user_id: string
  attempts: number
  exams: number
  passed: number
  avg_pct: number
  best_pct: number
  last_at: string | null
  last_exam_pct: number | null
  last_exam_passed: boolean | null
}

export type EmployeeWithStats = Profile & { stats: EmployeeStat | null }

export interface AuditRow {
  id: number
  at: string
  actor_name: string | null
  action: string
  details: string | null
}
