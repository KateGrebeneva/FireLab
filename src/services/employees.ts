import { supabase } from '../lib/supabase'
import type { EmployeeWithStats, Profile } from '../types'
import { getEmployeeStats } from './stats'

export async function listEmployees(): Promise<EmployeeWithStats[]> {
  const [p, stats] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'employee').order('full_name'),
    getEmployeeStats(),
  ])
  if (p.error) throw p.error
  const m = new Map(stats.map((s) => [s.user_id, s]))
  return ((p.data ?? []) as Profile[]).map((e) => ({ ...e, stats: m.get(e.id) ?? null }))
}

export async function getProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (error) throw error
  return data as Profile
}

export interface EmployeeInput {
  username: string
  password?: string
  full_name: string
  department: string
  position: string
}

type FnAction =
  | ({ action: 'create' } & EmployeeInput)
  | ({ action: 'update'; id: string } & Partial<EmployeeInput>)
  | { action: 'block' | 'unblock' | 'delete'; id: string }

async function callAdminFn(body: FnAction): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  const payload = data as { error?: string } | null
  if (payload?.error) throw new Error(payload.error)
  if (error) {
    // FunctionsHttpError содержит ответ сервера — достаём текст ошибки
    const ctx = (error as { context?: Response }).context
    let msg: string | undefined
    if (ctx && typeof ctx.json === 'function') {
      try {
        msg = ((await ctx.json()) as { error?: string }).error
      } catch {
        msg = undefined
      }
    }
    if (msg) throw new Error(msg)
    throw error
  }
}

export const createEmployee = (input: EmployeeInput) => callAdminFn({ action: 'create', ...input })
export const updateEmployee = (id: string, input: Partial<EmployeeInput>) => callAdminFn({ action: 'update', id, ...input })
export const setEmployeeActive = (id: string, active: boolean) => callAdminFn({ action: active ? 'unblock' : 'block', id })
export const deleteEmployee = (id: string) => callAdminFn({ action: 'delete', id })
