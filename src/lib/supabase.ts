import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/** true, если переменные окружения заданы — иначе показываем экран настройки */
export const isConfigured = Boolean(url && anon && /^https?:\/\//.test(url))

export const supabase = createClient(isConfigured ? url : 'https://placeholder.supabase.co', isConfigured ? anon : 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
