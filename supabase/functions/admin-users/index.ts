// Edge Function «admin-users» — операции, которым нужен service role:
// вход по логину (без раскрытия email), создание, изменение (в т.ч. пароля),
// блокировка/разблокировка и удаление сотрудников. Все действия админа пишутся в журнал.
// Ключ service role живёт только в окружении Supabase и никогда не попадает во frontend.
// Внешних зависимостей нет (только fetch к API Supabase) — функция работает и в локальной сети без интернета.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const USERNAME = /^[A-Za-z0-9._-]{3,40}$/
const clean = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const BAN_FOREVER = '876000h' // ~100 лет
// экранируем спецсимволы шаблона ILIKE (подчёркивание допустимо в логине)
const likeExact = (v: string) => v.replace(/[\\%_]/g, (m) => '\\' + m)


type Json = Record<string, unknown>
interface ApiResult<T> {
  data: T | null
  error: { message: string } | null
}

/** Мини-клиент к Auth (GoTrue) и REST (PostgREST) API Supabase с ключом service role */
function makeAdmin(url: string, key: string) {
  const base = url.replace(/\/$/, '')
  const headers = (extra: Record<string, string> = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra })
  async function call<T>(path: string, init: RequestInit & { headers?: Record<string, string> } = {}): Promise<ApiResult<T>> {
    try {
      const res = await fetch(base + path, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } })
      const text = await res.text()
      const body = text ? JSON.parse(text) : null
      if (!res.ok) {
        const msg = (body && (body.msg || body.message || body.error_description || body.error)) || `HTTP ${res.status}`
        return { data: null, error: { message: String(msg) } }
      }
      return { data: body as T, error: null }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Ошибка запроса' } }
    }
  }
  const q = (v: string) => encodeURIComponent(v)
  return {
    /** пользователь по access-токену */
    getUser: (token: string) => call<{ id: string; email?: string }>('/auth/v1/user', { headers: { Authorization: `Bearer ${token}` } }),
    getUserById: (id: string) => call<{ id: string; email?: string }>(`/auth/v1/admin/users/${q(id)}`),
    createUser: (email: string, password: string) =>
      call<{ id: string }>('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) }),
    updateUser: (id: string, attrs: Json) => call<Json>(`/auth/v1/admin/users/${q(id)}`, { method: 'PUT', body: JSON.stringify(attrs) }),
    deleteUser: (id: string) => call<Json>(`/auth/v1/admin/users/${q(id)}`, { method: 'DELETE' }),
    signIn: (email: string, password: string) =>
      call<{ access_token: string; refresh_token: string }>('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }),
    /** одна строка profiles по фильтру PostgREST (например "id=eq.<uuid>") */
    profile: async <T>(filter: string, select: string): Promise<T | null> => {
      const r = await call<T[]>(`/rest/v1/profiles?select=${q(select)}&${filter}&limit=1`)
      return r.data && r.data.length ? r.data[0] : null
    },
    insert: (table: string, row: Json) => call<null>(`/rest/v1/${table}`, { method: 'POST', body: JSON.stringify(row), headers: { Prefer: 'return=minimal' } }),
    update: (table: string, filter: string, patch: Json) =>
      call<null>(`/rest/v1/${table}?${filter}`, { method: 'PATCH', body: JSON.stringify(patch), headers: { Prefer: 'return=minimal' } }),
    q,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'Функция не настроена' }, 500)

  const admin = makeAdmin(url, serviceKey)
  const byUsername = (u: string) => `username=ilike.${admin.q(likeExact(u))}`

  let b: Record<string, unknown>
  try {
    b = await req.json()
  } catch {
    return json({ error: 'Некорректный запрос' }, 400)
  }
  const action = clean(b.action, 20)

  // ---- Вход по логину: email ищется на сервере и не раскрывается посетителю ----
  if (action === 'login') {
    const login = clean(b.login, 120)
    const password = typeof b.password === 'string' ? b.password : ''
    const fail = (msg = 'Неверный логин или пароль') => json({ error: msg }, 401)
    if (!login || !password || password.length > 72) return fail()
    let email = login
    if (!login.includes('@')) {
      if (!USERNAME.test(login)) return fail()
      const p = await admin.profile<{ id: string }>(byUsername(login), 'id')
      if (!p) return fail()
      const { data: au } = await admin.getUserById(p.id)
      email = au?.email ?? ''
      if (!email) return fail()
    }
    const { data, error } = await admin.signIn(email, password)
    if (error || !data?.access_token) return fail(/banned/i.test(error?.message ?? '') ? 'Учётная запись заблокирована администратором' : undefined)
    return json({ access_token: data.access_token, refresh_token: data.refresh_token })
  }

  // Проверяем JWT вызывающего вручную (работает и со старыми, и с новыми ключами подписи)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Не авторизован' }, 401)
  const { data: u, error: authErr } = await admin.getUser(token)
  if (authErr || !u?.id) return json({ error: 'Сессия недействительна' }, 401)

  const me = await admin.profile<{ role: string; is_active: boolean; full_name: string }>(`id=eq.${admin.q(u.id)}`, 'role,is_active,full_name')
  if (!me || me.role !== 'admin' || !me.is_active) return json({ error: 'Нет доступа' }, 403)

  // журнал действий (таблица audit_log из миграции 006; если её нет — молча пропускаем)
  const actorId = u.id
  const actorName = String(me.full_name ?? '')
  const audit = async (act: string, details: string) => {
    await admin.insert('audit_log', { actor: actorId, actor_name: actorName, action: act, details: details.slice(0, 500) })
  }

  const id = clean(b.id, 64)

  if (action === 'create') {
    const username = clean(b.username, 40)
    const password = typeof b.password === 'string' ? b.password : ''
    const full_name = clean(b.full_name, 160)
    if (!USERNAME.test(username)) return json({ error: 'Логин: 3–40 символов, латиница, цифры, точка, дефис, подчёркивание' }, 400)
    if (password.length < 6 || password.length > 72) return json({ error: 'Пароль должен содержать от 6 до 72 символов' }, 400)
    if (full_name.length < 2) return json({ error: 'Укажите ФИО' }, 400)

    const exists = await admin.profile<{ id: string }>(byUsername(username), 'id')
    if (exists) return json({ error: 'Такой логин уже занят' }, 409)

    const email = `${username.toLowerCase()}@firelab.local`
    const { data, error } = await admin.createUser(email, password)
    if (error || !data?.id) return json({ error: error?.message ?? 'Ошибка создания пользователя' }, 400)

    const { error: e2 } = await admin.insert('profiles', {
      id: data.id,
      role: 'employee',
      username,
      full_name,
      department: clean(b.department) || null,
      position: clean(b.position) || null,
    })
    if (e2) {
      await admin.deleteUser(data.id)
      return json({ error: e2.message }, 400)
    }
    await audit('Добавлен сотрудник', `${full_name} (@${username})`)
    return json({ ok: true, id: data.id })
  }

  if (!id) return json({ error: 'Не указан сотрудник' }, 400)
  const target = await admin.profile<{ id: string; role: string; full_name: string; username: string }>(`id=eq.${admin.q(id)}`, 'id,role,full_name,username')
  if (!target) return json({ error: 'Сотрудник не найден' }, 404)
  if (target.role === 'admin' && action !== 'update') return json({ error: 'Действие недоступно для администратора' }, 400)

  if (action === 'update') {
    const patch: Record<string, string | null> = {}
    if (b.username !== undefined) {
      const username = clean(b.username, 40)
      if (!USERNAME.test(username)) return json({ error: 'Некорректный логин' }, 400)
      const dup = await admin.profile<{ id: string }>(`${byUsername(username)}&id=neq.${admin.q(id)}`, 'id')
      if (dup) return json({ error: 'Такой логин уже занят' }, 409)
      patch.username = username
    }
    if (b.full_name !== undefined) {
      const fn = clean(b.full_name, 160)
      if (fn.length < 2) return json({ error: 'Укажите ФИО' }, 400)
      patch.full_name = fn
    }
    if (b.department !== undefined) patch.department = clean(b.department) || null
    if (b.position !== undefined) patch.position = clean(b.position) || null
    if (Object.keys(patch).length) {
      const { error } = await admin.update('profiles', `id=eq.${admin.q(id)}`, patch)
      if (error) return json({ error: error.message }, 400)
    }
    if (typeof b.password === 'string' && b.password.length) {
      if (b.password.length < 6 || b.password.length > 72) return json({ error: 'Пароль: от 6 до 72 символов' }, 400)
      const { error } = await admin.updateUser(id, { password: b.password })
      if (error) return json({ error: error.message }, 400)
    }
    await audit('Изменён сотрудник', `${patch.full_name ?? target.full_name} (@${patch.username ?? target.username})${typeof b.password === 'string' && b.password ? ' · новый пароль' : ''}`)
    return json({ ok: true })
  }

  if (action === 'block' || action === 'unblock') {
    const active = action === 'unblock'
    const { error } = await admin.update('profiles', `id=eq.${admin.q(id)}`, { is_active: active })
    if (error) return json({ error: error.message }, 400)
    // бан в Auth обрывает возможность обновлять сессию — заблокированный не сможет работать дальше
    await admin.updateUser(id, { ban_duration: active ? 'none' : BAN_FOREVER })
    await audit(active ? 'Разблокирован сотрудник' : 'Заблокирован сотрудник', `${target.full_name} (@${target.username})`)
    return json({ ok: true })
  }

  if (action === 'delete') {
    if (id === actorId) return json({ error: 'Нельзя удалить себя' }, 400)
    const { error } = await admin.deleteUser(id)
    if (error) return json({ error: error.message }, 400)
    await audit('Удалён сотрудник', `${target.full_name} (@${target.username})`)
    return json({ ok: true })
  }

  return json({ error: 'Неизвестное действие' }, 400)
})
