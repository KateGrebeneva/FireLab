import { supabase } from '../lib/supabase'

export async function updateMyName(fullName: string): Promise<void> {
  const { error } = await supabase.rpc('update_my_profile', { p_full_name: fullName })
  if (error) throw error
}

/** Смена пароля: сначала проверяем текущий пароль повторным входом */
export async function changeMyPassword(current: string, next: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  const email = u.user?.email
  if (!email) throw new Error('Сессия истекла. Войдите снова.')
  const check = await supabase.auth.signInWithPassword({ email, password: current })
  if (check.error) throw new Error('Текущий пароль указан неверно')
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) throw error
}
