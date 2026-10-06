import { supabase } from '../lib/supabase'
import type { AuditRow } from '../types'

export async function listAudit(limit = 50): Promise<AuditRow[]> {
  const { data, error } = await supabase.from('audit_log').select('id,at,actor_name,action,details').order('at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []) as AuditRow[]
}
