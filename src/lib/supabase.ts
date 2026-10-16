import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

// Адрес может быть полным (облако: https://xxx.supabase.co) или относительным (Docker: /supabase).
// Относительный адрес дополняется адресом текущей страницы — сборка работает на любом IP или домене.
const url = rawUrl.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${rawUrl.replace(/\/$/, '')}` : rawUrl

/** true, если переменные окружения заданы — иначе показываем экран настройки */
export const isConfigured = Boolean(url && anon && /^https?:\/\//.test(url))

export const supabase = createClient(isConfigured ? url : 'https://placeholder.supabase.co', isConfigured ? anon : 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
