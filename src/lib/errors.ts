/** Переводит технические ошибки Supabase/PostgREST в понятные сообщения */
export function humanError(e: unknown, fallback = 'Что-то пошло не так. Попробуйте ещё раз.'): string {
  const msg =
    typeof e === 'string'
      ? e
      : e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
        ? (e as { message: string }).message
        : ''
  if (!msg) return fallback
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Нет соединения с сервером. Проверьте интернет.'
  if (/JWT|session|token/i.test(msg)) return 'Сессия истекла. Войдите снова.'
  if (/permission denied|row-level security|violates row-level/i.test(msg)) return 'Недостаточно прав для этого действия.'
  if (/duplicate key/i.test(msg)) return 'Такая запись уже существует.'
  if (/Function not found|404/i.test(msg)) return 'Серверная функция не найдена. Разверните Edge Function admin-users (см. README).'
  return msg
}
