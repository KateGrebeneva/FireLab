import { supabase } from '../lib/supabase'
import type { CategoryRow, DailyRow, EmployeeStat, HardQuestion, Overview } from '../types'

export async function getOverview(days = 30): Promise<Overview> {
  const { data, error } = await supabase.rpc('admin_overview', { p_days: days })
  if (error) throw error
  return data as Overview
}

export async function getDaily(days = 30, userId?: string): Promise<DailyRow[]> {
  const { data, error } = await supabase.rpc('daily_stats', { p_days: days, p_user: userId ?? null })
  if (error) throw error
  return (data ?? []) as DailyRow[]
}

export async function getCategoryStats(userId?: string): Promise<CategoryRow[]> {
  const { data, error } = await supabase.rpc('category_stats', { p_user: userId ?? null })
  if (error) throw error
  return (data ?? []) as CategoryRow[]
}

export async function getHardest(limit = 10, min = 2): Promise<HardQuestion[]> {
  const { data, error } = await supabase.rpc('hardest_questions', { p_limit: limit, p_min: min })
  if (error) throw error
  return (data ?? []) as HardQuestion[]
}

export async function getEmployeeStats(): Promise<EmployeeStat[]> {
  const { data, error } = await supabase.rpc('admin_employee_stats')
  if (error) throw error
  return (data ?? []) as EmployeeStat[]
}
